import { NextRequest, NextResponse } from "next/server";
import { getRoom } from "@/lib/rooms/get";
import { fetchContestants } from "@/lib/contestants";
import { apiError } from "@/lib/api-errors";
import { createServiceClient } from "@/lib/supabase/server";
import { computeWeightedScore } from "@/lib/scoring";
import type { Contestant, VotingCategory } from "@/types";

interface ContestantScore {
  id: string;
  country: string;
  countryCode: string;
  flagEmoji: string;
  artist: string;
  song: string;
  runningOrder: number;
  submittedCount: number;
  missedCount: number;
  hotTakesCount: number;
  avgTotal: number | null;
  avgPerCategory: Record<string, number | null>;
}

interface VoteRow {
  contestant_id: string;
  scores: Record<string, number | null> | null;
  missed: boolean;
  hot_take: string | null;
}

/**
 * GET /api/rooms/{id}/scores — public, no auth.
 *
 * Per-contestant live aggregates across the entire lineup, intended for
 * leaderboard overlays / dashboards. Returns one row per contestant,
 * sorted by running order. Caller can sort client-side by avgTotal for a
 * live ranking.
 *
 * NOTE: this is the *live* (mid-voting) aggregate, NOT the post-scoring
 * Eurovision-points leaderboard. After voting ends and scoring runs, use
 * /api/results/{id} for the final leaderboard.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServiceClient();
  const result = await getRoom(
    { roomId: params.id },
    { supabase, fetchContestants }
  );

  if (!result.ok) {
    return apiError(
      result.error.code,
      result.error.message,
      result.status,
      result.error.field
    );
  }

  const { room, contestants } = result.data;

  const votesQuery = await supabase
    .from("votes")
    .select("contestant_id, scores, missed, hot_take")
    .eq("room_id", room.id);

  const voteRows = (votesQuery.data ?? []) as VoteRow[];
  const aggregates = computePerContestantAggregates(
    voteRows,
    contestants,
    room.categories
  );

  const response = NextResponse.json(
    {
      room: {
        id: room.id,
        pin: room.pin,
        status: room.status,
        categories: room.categories,
      },
      contestants: aggregates,
    },
    { status: 200 }
  );
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function computePerContestantAggregates(
  voteRows: VoteRow[],
  contestants: Contestant[],
  categories: VotingCategory[]
): ContestantScore[] {
  const byContestant = new Map<string, VoteRow[]>();
  for (const row of voteRows) {
    const list = byContestant.get(row.contestant_id);
    if (list) list.push(row);
    else byContestant.set(row.contestant_id, [row]);
  }

  return contestants
    .slice()
    .sort((a, b) => a.runningOrder - b.runningOrder)
    .map((c) => {
      const rows = byContestant.get(c.id) ?? [];
      const perCatSum: Record<string, number> = {};
      const perCatCount: Record<string, number> = {};
      for (const cat of categories) {
        perCatSum[cat.name] = 0;
        perCatCount[cat.name] = 0;
      }
      let weightedSum = 0;
      let submitted = 0;
      let missed = 0;
      let hotTakes = 0;

      for (const r of rows) {
        if (r.hot_take !== null && r.hot_take !== "") hotTakes += 1;
        if (r.missed) {
          missed += 1;
          continue;
        }
        if (!r.scores) continue;
        const cleaned: Record<string, number> = {};
        let any = false;
        for (const cat of categories) {
          const raw = r.scores[cat.name];
          if (typeof raw === "number") {
            cleaned[cat.name] = raw;
            perCatSum[cat.name] += raw;
            perCatCount[cat.name] += 1;
            any = true;
          }
        }
        if (!any) continue;
        submitted += 1;
        weightedSum += computeWeightedScore(cleaned, categories);
      }

      const avgPerCategory: Record<string, number | null> = {};
      for (const cat of categories) {
        const n = perCatCount[cat.name];
        avgPerCategory[cat.name] = n > 0 ? perCatSum[cat.name] / n : null;
      }

      return {
        id: c.id,
        country: c.country,
        countryCode: c.countryCode,
        flagEmoji: c.flagEmoji,
        artist: c.artist,
        song: c.song,
        runningOrder: c.runningOrder,
        submittedCount: submitted,
        missedCount: missed,
        hotTakesCount: hotTakes,
        avgTotal: submitted > 0 ? weightedSum / submitted : null,
        avgPerCategory,
      };
    });
}
