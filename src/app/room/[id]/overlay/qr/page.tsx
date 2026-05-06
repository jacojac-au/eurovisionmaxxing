"use client";

import { useEffect, useState } from "react";
import QrCode from "@/components/ui/QrCode";

/**
 * /room/{id}/overlay/qr — OBS Browser Source for a scannable QR. Renders a
 * white QR card on transparent body so OBS composites cleanly.
 *
 * Single-active-room flow: viewers scan, land on the root URL, and the
 * onboarding flow auto-joins them to the active room. No PIN encoded.
 *
 * Query params:
 *   url   — destination encoded in the QR (default: window.location.origin)
 *   size  — QR pixel size, default 170 (fits the 200×170 frame)
 */
export default function QrOverlayPage(_: { params: { id: string } }) {
  const [search, setSearch] = useState<URLSearchParams | null>(null);

  useEffect(() => {
    setSearch(new URLSearchParams(window.location.search));
  }, []);

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

  if (!search) return null;

  const sizeParam = Number(search.get("size") ?? "170");
  const size = Number.isFinite(sizeParam) && sizeParam > 64 ? sizeParam : 170;

  const url =
    search.get("url") ??
    (typeof window !== "undefined" ? window.location.origin : "/");

  return (
    <div
      className="fixed left-0 top-0 flex items-center justify-center"
      style={{ width: 200, height: 170 }}
    >
      <QrCode
        url={url}
        size={size}
        alt="Join the room"
        className="!rounded-none"
      />
    </div>
  );
}
