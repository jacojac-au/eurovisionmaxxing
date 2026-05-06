"use client";

import { useCallback, useEffect, useState } from "react";

interface ActiveRoomResponse {
  activeRoom: { id: string } | null;
}

/**
 * /overlay/qr — roomless wrapper that proxies the active room's QR
 * overlay. Forwards any query params (?url=, ?size=) to the inner page.
 */
export default function ActiveQrOverlay() {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [search, setSearch] = useState<string>("");

  useEffect(() => {
    setSearch(window.location.search);
  }, []);

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

  return (
    <iframe
      src={`/room/${encodeURIComponent(roomId)}/overlay/qr${search}`}
      title="QR"
      className="fixed left-0 top-0 border-0"
      style={{ width: 200, height: 170, background: "transparent" }}
    />
  );
}
