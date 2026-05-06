"use client";

import { useEffect, useState } from "react";

/**
 * /overlay/just-vote — generic OBS Browser Source. No room context, just a
 * URL banner. Designed at 1290×167 (matches the other CTA overlay's footprint
 * for easy swap-in). Transparent body so OBS composites cleanly.
 *
 * Query params:
 *   url   — destination shown to viewers (default: example.com placeholder)
 *   cta   — bold headline (default: "Just vote @")
 */
export default function JustVoteOverlayPage() {
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

  const cta = search.get("cta") ?? "Just vote @";
  const url = search.get("url") ?? "xyz.com";
  const displayUrl = url.replace(/^https?:\/\//, "").replace(/\/$/, "");

  return (
    <div
      className="fixed left-0 top-0 flex items-baseline gap-5 px-8 font-sans text-white"
      style={{ width: 1294, height: 170 }}
    >
      <span className="self-center text-3xl font-bold uppercase tracking-tight">
        {cta}
      </span>
      <span className="truncate self-center text-6xl font-extrabold tracking-tight">
        {displayUrl}
      </span>
    </div>
  );
}
