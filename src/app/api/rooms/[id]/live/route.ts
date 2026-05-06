import { NextRequest, NextResponse } from "next/server";
import { getRoom } from "@/lib/rooms/get";
import { getLiveAggregates } from "@/lib/live/getLiveAggregates";
import { fetchContestants } from "@/lib/contestants";
import { apiError } from "@/lib/api-errors";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * GET /api/rooms/{id}/live — public, no auth.
 *
 * Live snapshot intended for the OBS broadcast overlay (and the host's
 * dashboard). Returns the now-performing contestant and live vote
 * aggregates for that contestant. Returns nowPerforming=null and
 * aggregate=null when no contestant is set, so the overlay can hide.
 *
 * `?all=1` additionally returns `contestants` (the full lineup) and
 * `scoredCounts` (Record<contestantId, count of submitted non-missed votes>)
 * — used by the broadcast control panel to render the grid of contestants.
 * Off by default to keep the overlay path lean.
 */
export async function GET(
  request: NextRequest,
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
  const nowPerforming =
    room.nowPerformingId !== null
      ? contestants.find((c) => c.id === room.nowPerformingId) ?? null
      : null;

  const aggregate = nowPerforming
    ? await getLiveAggregates(
        room.id,
        nowPerforming.id,
        room.categories,
        { supabase }
      )
    : null;

  const includeAll = request.nextUrl.searchParams.get("all") === "1";

  let scoredCounts: Record<string, number> | undefined;
  let allContestants: typeof contestants | undefined;
  if (includeAll) {
    allContestants = contestants;
    const countsQuery = await supabase
      .from("votes")
      .select("contestant_id, missed, scores")
      .eq("room_id", room.id);
    const counts: Record<string, number> = {};
    for (const c of contestants) counts[c.id] = 0;
    for (const row of (countsQuery.data ?? []) as Array<{
      contestant_id: string;
      missed: boolean;
      scores: Record<string, number | null> | null;
    }>) {
      if (row.missed) continue;
      if (row.scores === null) continue;
      counts[row.contestant_id] = (counts[row.contestant_id] ?? 0) + 1;
    }
    scoredCounts = counts;
  }

  const response = NextResponse.json(
    {
      room: {
        id: room.id,
        pin: room.pin,
        status: room.status,
        categories: room.categories,
        ownerUserId: room.ownerUserId,
        allowNowPerforming: room.allowNowPerforming,
      },
      nowPerforming,
      aggregate,
      ...(includeAll
        ? { contestants: allContestants, scoredCounts }
        : {}),
    },
    { status: 200 }
  );
  // Live data — never cache. OBS Browser Source caches aggressively otherwise.
  response.headers.set("Cache-Control", "no-store");
  return response;
}
