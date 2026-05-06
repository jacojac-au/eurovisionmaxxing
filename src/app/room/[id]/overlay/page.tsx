"use client";

import { useCallback, useEffect, useState } from "react";
import { useRoomRealtime } from "@/hooks/useRoomRealtime";
import type { Contestant, VotingCategory } from "@/types";

interface LiveAggregate {
  contestantId: string;
  avgPerCategory: Record<string, number | null>;
  avgTotal: number | null;
  submittedCount: number;
  missedCount: number;
  totalVoters: number;
  hotTakesCount: number;
}

interface LiveResponse {
  room: { id: string; status: string; categories: VotingCategory[] };
  nowPerforming: Contestant | null;
  aggregate: LiveAggregate | null;
}

/**
 * /room/{id}/overlay — OBS Browser Source. Transparent background; renders
 * a lower-third strip with the now-performing contestant + live vote
 * aggregates. No auth, polled snapshot + Realtime push for instant
 * updates when the admin advances or new votes land.
 */
export default function OverlayPage({ params }: { params: { id: string } }) {
  const roomId = params.id;
  const [data, setData] = useState<LiveResponse | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/rooms/${encodeURIComponent(roomId)}/live`,
        { cache: "no-store" }
      );
      if (!res.ok) return;
      const body = (await res.json()) as LiveResponse;
      setData(body);
    } catch {
      // Keep stale data on transient network failure — overlay should never blink.
    }
  }, [roomId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Realtime push: re-fetch on the events that actually change the overlay.
  useRoomRealtime(roomId, (event) => {
    if (
      event.type === "now_performing" ||
      event.type === "voting_progress" ||
      event.type === "status_changed" ||
      event.type === "voting_ending"
    ) {
      void load();
    }
  });

  // Belt-and-braces poll every 3 s in case Realtime drops.
  useEffect(() => {
    const id = window.setInterval(load, 3000);
    return () => window.clearInterval(id);
  }, [load]);

  // Force a transparent body so OBS Browser Source composites cleanly.
  useEffect(() => {
    const prevHtmlBg = document.documentElement.style.background;
    const prevBodyBg = document.body.style.background;
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
    return () => {
      document.documentElement.style.background = prevHtmlBg;
      document.body.style.background = prevBodyBg;
    };
  }, []);

  if (!data || !data.nowPerforming || !data.aggregate) return null;

  const { nowPerforming, aggregate, room } = data;
  const avgTotal =
    aggregate.avgTotal === null ? null : aggregate.avgTotal.toFixed(1);

  return (
    <div
      className="fixed left-0 top-0 flex items-center gap-6 px-6 font-sans text-white"
      style={{ width: 1294, height: 170 }}
    >
      <span className="text-6xl leading-none" aria-hidden="true">
        {nowPerforming.flagEmoji}
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm uppercase tracking-widest opacity-80">
          #{nowPerforming.runningOrder} · {nowPerforming.country}
        </span>
        <span className="truncate text-3xl font-bold">
          {nowPerforming.song}
        </span>
        <span className="truncate text-base opacity-90">
          {nowPerforming.artist}
        </span>
      </div>
      <div className="flex flex-col items-end">
        <span className="text-xs uppercase tracking-widest opacity-80">
          Live avg
        </span>
        <span className="text-5xl font-extrabold tabular-nums">
          {avgTotal ?? "—"}
        </span>
        <span className="text-xs opacity-80">
          {aggregate.submittedCount}/{aggregate.totalVoters} voted
          {aggregate.missedCount > 0
            ? ` · ${aggregate.missedCount} missed`
            : ""}
        </span>
      </div>
    </div>
  );
}
