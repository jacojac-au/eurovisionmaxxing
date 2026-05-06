"use client";

import { useCallback, useEffect, useState } from "react";

interface ActiveRoomResponse {
  activeRoom: { id: string } | null;
}

/**
 * /overlay/voting — roomless wrapper. Iframes the room-scoped full-screen
 * voting overlay for the currently-active room.
 */
export default function ActiveVotingOverlay() {
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

  // Full-screen scene element — paint the bg even before the iframe loads
  // so the OBS source never flashes white during a switch.
  useEffect(() => {
    const prevHtmlBg = document.documentElement.style.background;
    const prevBodyBg = document.body.style.background;
    document.documentElement.style.background = "#0a0014";
    document.body.style.background = "#0a0014";
    return () => {
      document.documentElement.style.background = prevHtmlBg;
      document.body.style.background = prevBodyBg;
    };
  }, []);

  if (!roomId) return null;

  return (
    <iframe
      src={`/room/${encodeURIComponent(roomId)}/overlay/voting`}
      title="Voting overlay"
      className="fixed left-0 top-0 border-0"
      style={{ width: 1920, height: 1080 }}
    />
  );
}
