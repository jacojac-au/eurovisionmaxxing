"use client";

import { useEffect, useState } from "react";

/**
 * /room/{id}/overlay/cta — OBS Browser Source for the "vote here" call-to-
 * action lower-third. 1294×170, transparent body so OBS composites cleanly.
 *
 * Query params:
 *   url   — destination shown to viewers (default: window.location.origin)
 *   cta   — bold headline (default: "Vote live at")
 */
export default function CtaOverlayPage(_: { params: { id: string } }) {
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

  const cta = search.get("cta") ?? "Vote live at";
  const url =
    search.get("url") ??
    (typeof window !== "undefined" ? window.location.origin : "/");
  const displayUrl = url.replace(/^https?:\/\//, "").replace(/\/$/, "");

  return (
    <div
      className="fixed left-0 top-0 flex items-center gap-6 px-8 font-sans text-white"
      style={{ width: 1294, height: 170 }}
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-base font-semibold uppercase tracking-[0.3em] opacity-90">
          {cta}
        </span>
        <span className="truncate text-5xl font-extrabold tracking-tight">
          {displayUrl}
        </span>
      </div>
    </div>
  );
}
