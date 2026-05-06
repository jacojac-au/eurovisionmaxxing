"use client";

import { useCallback, useEffect, useState } from "react";
import { useRoomRealtime } from "@/hooks/useRoomRealtime";
import type { Contestant } from "@/types";

interface LiveResponse {
  nowPerforming: Contestant | null;
}

/**
 * /room/{id}/overlay/song — wide bar OBS Browser Source showing only the
 * song title + artist of the now-performing contestant. 1000×140,
 * transparent background. Hides when no contestant is performing.
 */
export default function SongOverlayPage({
  params,
}: {
  params: { id: string };
}) {
  const roomId = params.id;
  const [data, setData] = useState<LiveResponse | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/rooms/${encodeURIComponent(roomId)}/live`,
        { cache: "no-store" }
      );
      if (!res.ok) return;
      setData((await res.json()) as LiveResponse);
    } catch {
      /* keep stale */
    }
  }, [roomId]);

  useEffect(() => {
    void load();
  }, [load]);

  useRoomRealtime(roomId, (event) => {
    if (
      event.type === "now_performing" ||
      event.type === "status_changed"
    ) {
      void load();
    }
  });

  useEffect(() => {
    const id = window.setInterval(load, 3000);
    return () => window.clearInterval(id);
  }, [load]);

  // Force transparent body for OBS Browser Source.
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

  if (!data || !data.nowPerforming) return null;

  const { nowPerforming } = data;

  return (
    <div
      className="fixed left-0 top-0 flex flex-col justify-center px-8 font-sans text-white"
      style={{ width: 1000, height: 140 }}
    >
      <span className="truncate text-5xl font-extrabold leading-tight tracking-tight">
        {nowPerforming.song}
      </span>
      <span className="truncate text-2xl leading-tight opacity-80">
        {nowPerforming.artist}
      </span>
    </div>
  );
}
