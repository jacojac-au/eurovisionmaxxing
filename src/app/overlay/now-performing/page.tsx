"use client";

import { useCallback, useEffect, useState } from "react";

interface ActiveRoomResponse {
  activeRoom: { id: string } | null;
}

/**
 * /overlay/now-performing — roomless wrapper that resolves the currently-
 * active room and renders the same now-performing overlay as
 * /room/{id}/overlay. Stable URL for OBS Browser Sources; survives admin
 * switching the active room.
 */
export default function ActiveNowPerformingOverlay() {
  const [roomId, setRoomId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/active-room", { cache: "no-store" });
      if (!res.ok) return;
      const body = (await res.json()) as ActiveRoomResponse;
      setRoomId(body.activeRoom?.id ?? null);
    } catch {
      /* keep stale */
    }
  }, []);

  useEffect(() => {
    void load();
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

  if (!roomId) return null;

  // iframe the canonical room-scoped overlay so we don't duplicate the
  // (substantial) realtime + render logic. The iframe inherits the OBS
  // Browser Source's transparent background.
  return (
    <iframe
      src={`/room/${encodeURIComponent(roomId)}/overlay`}
      title="Now performing"
      className="fixed left-0 top-0 border-0"
      style={{ width: 1294, height: 170, background: "transparent" }}
      allow="autoplay"
    />
  );
}
