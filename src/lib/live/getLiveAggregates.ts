import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { VotingCategory } from "@/types";
import { computeWeightedScore } from "@/lib/scoring";

export interface LiveAggregate {
  contestantId: string;
  avgPerCategory: Record<string, number | null>;
  avgTotal: number | null;
  submittedCount: number;
  missedCount: number;
  totalVoters: number;
  hotTakesCount: number;
}

export interface GetLiveAggregatesDeps {
  supabase: SupabaseClient<Database>;
}

interface VoteRow {
  user_id: string;
  scores: Record<string, number | null> | null;
  missed: boolean;
  hot_take: string | null;
}

/**
 * Aggregate live voting state for a single contestant in a room — used by the
 * OBS broadcast overlay (no auth, polled while voting is open).
 *
 * "Submitted" = a vote row exists with at least one non-null category score
 * AND missed=false. Missed votes do NOT contribute to the averages (they're
 * filled with the user's own per-category mean only at end-of-voting; see
 * scoring.ts), so showing them mid-show would mislead the overlay.
 */
export async function getLiveAggregates(
  roomId: string,
  contestantId: string,
  categories: VotingCategory[],
  deps: GetLiveAggregatesDeps
): Promise<LiveAggregate> {
  const [votesQuery, membersQuery] = await Promise.all([
    deps.supabase
      .from("votes")
      .select("user_id, scores, missed, hot_take")
      .eq("room_id", roomId)
      .eq("contestant_id", contestantId),
    deps.supabase
      .from("room_memberships")
      .select("user_id", { count: "exact", head: true })
      .eq("room_id", roomId),
  ]);

  const voteRows = (votesQuery.data ?? []) as VoteRow[];
  const totalVoters = membersQuery.count ?? 0;

  const perCategorySum: Record<string, number> = {};
  const perCategoryCount: Record<string, number> = {};
  for (const cat of categories) {
    perCategorySum[cat.name] = 0;
    perCategoryCount[cat.name] = 0;
  }

  let weightedSum = 0;
  let submittedCount = 0;
  let missedCount = 0;
  let hotTakesCount = 0;

  for (const row of voteRows) {
    if (row.hot_take !== null && row.hot_take !== "") hotTakesCount += 1;
    if (row.missed) {
      missedCount += 1;
      continue;
    }
    if (!row.scores) continue;

    const cleanedScores: Record<string, number> = {};
    let anyScore = false;
    for (const cat of categories) {
      const raw = row.scores[cat.name];
      if (typeof raw === "number") {
        cleanedScores[cat.name] = raw;
        perCategorySum[cat.name] += raw;
        perCategoryCount[cat.name] += 1;
        anyScore = true;
      }
    }
    if (!anyScore) continue;

    submittedCount += 1;
    weightedSum += computeWeightedScore(cleanedScores, categories);
  }

  const avgPerCategory: Record<string, number | null> = {};
  for (const cat of categories) {
    const count = perCategoryCount[cat.name];
    avgPerCategory[cat.name] =
      count > 0 ? perCategorySum[cat.name] / count : null;
  }

  const avgTotal = submittedCount > 0 ? weightedSum / submittedCount : null;

  return {
    contestantId,
    avgPerCategory,
    avgTotal,
    submittedCount,
    missedCount,
    totalVoters,
    hotTakesCount,
  };
}
