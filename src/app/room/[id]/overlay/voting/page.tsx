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
  contestants: Contestant[];
  scoredCounts: Record<string, number>;
}

/**
 * /room/{id}/overlay/voting — full 1920×1080 broadcast surface intended
 * to be a standalone OBS scene element (not a transparent lower-third).
 * Has its own dramatic Eurovision-themed background. Drives the whole
 * frame: flag + country + song + live avg + per-category breakdown +
 * running-order strip.
 */
export default function VotingOverlayPage({
  params,
}: {
  params: { id: string };
}) {
  const roomId = params.id;
  const [data, setData] = useState<LiveResponse | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/rooms/${encodeURIComponent(roomId)}/live?all=1`,
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
      event.type === "voting_progress" ||
      event.type === "status_changed" ||
      event.type === "voting_ending"
    ) {
      void load();
    }
  });

  useEffect(() => {
    const id = window.setInterval(load, 2000);
    return () => window.clearInterval(id);
  }, [load]);

  // This overlay paints its OWN background — full-screen broadcast graphic,
  // not a transparent lower-third. We still strip the body bg so the parent
  // page chrome doesn't bleed in.
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

  const containerClass =
    "relative overflow-hidden text-white font-sans";
  const containerStyle: React.CSSProperties = {
    width: 1920,
    height: 1080,
  };

  // Empty state — voting is open but no contestant set yet, or status is
  // lobby/scoring/etc. Still a presentable broadcast frame.
  if (!data || !data.nowPerforming || !data.aggregate) {
    return (
      <div className={`fixed left-0 top-0 ${containerClass}`} style={containerStyle}>
        <BackgroundLayer />
        <div className="relative z-10 flex h-full flex-col items-center justify-center gap-8 px-24 text-center">
          <LiveBadge />
          <h1 className="text-[7rem] font-black leading-none tracking-tight">
            Voting open
          </h1>
          <p className="text-3xl text-white/70">
            Waiting for the next performance to start…
          </p>
        </div>
      </div>
    );
  }

  const { nowPerforming, aggregate, room, contestants, scoredCounts } = data;
  const sortedContestants = [...contestants].sort(
    (a, b) => a.runningOrder - b.runningOrder
  );
  const avgTotal =
    aggregate.avgTotal === null ? null : aggregate.avgTotal.toFixed(1);

  const categoriesWithValues = room.categories.map((cat) => ({
    name: cat.name,
    weight: cat.weight,
    value: aggregate.avgPerCategory[cat.name],
  }));

  const voteRatio =
    aggregate.totalVoters > 0
      ? aggregate.submittedCount / aggregate.totalVoters
      : 0;

  return (
    <div className={`fixed left-0 top-0 ${containerClass}`} style={containerStyle}>
      <BackgroundLayer />

      <div className="relative z-10 flex h-full flex-col px-24 py-16">
        {/* Header strip */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <LiveBadge />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logos/esc-vienna-2026-white.svg"
              alt="Eurovision Vienna 2026"
              className="h-12 w-auto"
            />
          </div>
          <span className="text-2xl font-medium uppercase tracking-[0.5em] text-white/60">
            Live voting
          </span>
        </div>

        {/* Hero — flag + country + song on the left, live avg on the right */}
        <section className="mt-16 flex items-center gap-16">
          <div className="flex items-center gap-12">
            <span
              className="text-[18rem] leading-none drop-shadow-[0_0_60px_rgba(168,85,247,0.5)]"
              aria-hidden="true"
            >
              {nowPerforming.flagEmoji}
            </span>
            <div className="flex min-w-0 flex-col">
              <span className="text-3xl uppercase tracking-[0.5em] text-white/60">
                #{String(nowPerforming.runningOrder).padStart(2, "0")}
              </span>
              <span className="mt-2 text-[6.5rem] font-black leading-none tracking-tight">
                {nowPerforming.country}
              </span>
              <span className="mt-6 text-5xl font-bold leading-tight">
                {nowPerforming.song}
              </span>
              <span className="mt-2 text-3xl font-medium leading-tight text-white/70">
                {nowPerforming.artist}
              </span>
            </div>
          </div>

          <div className="ml-auto flex flex-col items-center justify-center rounded-[3rem] border border-white/10 bg-white/5 px-16 py-12 backdrop-blur-sm">
            <span className="text-2xl font-bold uppercase tracking-[0.4em] text-white/70">
              Average score
            </span>
            <span
              className="mt-2 text-[16rem] font-black leading-none tabular-nums tracking-tight"
              style={{
                background:
                  "linear-gradient(135deg, #f0abfc 0%, #c084fc 50%, #818cf8 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              {avgTotal ?? "—"}
            </span>
            <span className="mt-2 text-2xl text-white/60 tabular-nums">
              {aggregate.submittedCount} / {aggregate.totalVoters} voted
              {aggregate.missedCount > 0
                ? ` · ${aggregate.missedCount} missed`
                : ""}
            </span>
          </div>
        </section>

        {/* Per-category bars */}
        {categoriesWithValues.length > 0 && (
          <section className="mt-16 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {categoriesWithValues.map((cat) => (
              <CategoryBar key={cat.name} cat={cat} />
            ))}
          </section>
        )}

        {/* Voter progress */}
        <section className="mt-auto pt-12">
          <div className="mb-3 flex items-baseline justify-between">
            <span className="text-xl font-bold uppercase tracking-[0.4em] text-white/70">
              Voter participation
            </span>
            <span className="text-2xl font-bold tabular-nums text-white/90">
              {Math.round(voteRatio * 100)}%
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full transition-[width] duration-700 ease-out"
              style={{
                width: `${Math.round(voteRatio * 100)}%`,
                background:
                  "linear-gradient(90deg, #ec4899 0%, #a855f7 50%, #6366f1 100%)",
                boxShadow: "0 0 24px rgba(168,85,247,0.6)",
              }}
            />
          </div>
        </section>

        {/* Running-order strip */}
        <section className="mt-12">
          <div className="flex flex-wrap gap-2">
            {sortedContestants.map((c) => {
              const isNow = c.id === nowPerforming.id;
              const isPast = c.runningOrder < nowPerforming.runningOrder;
              const scored = scoredCounts[c.id] ?? 0;
              return (
                <div
                  key={c.id}
                  className={`flex h-20 w-20 flex-col items-center justify-center rounded-xl border text-center transition ${
                    isNow
                      ? "scale-110 border-fuchsia-400 bg-fuchsia-500/20 shadow-[0_0_24px_rgba(232,121,249,0.6)]"
                      : isPast
                      ? "border-white/5 bg-white/5 opacity-50"
                      : "border-white/10 bg-white/5"
                  }`}
                >
                  <span className="text-3xl leading-none" aria-hidden="true">
                    {c.flagEmoji}
                  </span>
                  <span className="mt-0.5 text-[10px] tabular-nums opacity-80">
                    #{c.runningOrder}
                  </span>
                  {scored > 0 && !isNow && (
                    <span className="text-[9px] font-bold tabular-nums">
                      {scored}✓
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

function BackgroundLayer() {
  return (
    <>
      {/* Base radial wash */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 30% 20%, rgba(168, 85, 247, 0.35) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(236, 72, 153, 0.3) 0%, transparent 50%), linear-gradient(135deg, #1e0a3c 0%, #0a0014 50%, #0c0420 100%)",
        }}
      />
      {/* Subtle grid overlay for that broadcast feel */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />
      {/* Vignette */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.55) 100%)",
        }}
      />
    </>
  );
}

function LiveBadge() {
  return (
    <div className="flex items-center gap-3 rounded-full border border-rose-400/40 bg-rose-500/15 px-5 py-2 backdrop-blur-sm">
      <span className="relative flex h-3 w-3">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
        <span className="relative inline-flex h-3 w-3 rounded-full bg-rose-500" />
      </span>
      <span className="text-lg font-bold uppercase tracking-[0.4em] text-white">
        Live
      </span>
    </div>
  );
}

interface CategoryBarProps {
  cat: { name: string; weight: number; value: number | null };
}

function CategoryBar({ cat }: CategoryBarProps) {
  // Score range is 1–10 (Eurovision scoring; SPEC §4.x). Clamp to [0, 10] so
  // the visual width stays sensible even on edge data.
  const pct =
    cat.value === null ? 0 : Math.max(0, Math.min(10, cat.value)) * 10;
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-xl font-bold uppercase tracking-[0.3em] text-white/80">
          {cat.name}
        </span>
        <span
          className="text-4xl font-black tabular-nums leading-none"
          style={{
            background:
              "linear-gradient(135deg, #f0abfc 0%, #c084fc 50%, #818cf8 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          {cat.value === null ? "—" : cat.value.toFixed(1)}
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{
            width: `${pct}%`,
            background:
              "linear-gradient(90deg, #ec4899 0%, #a855f7 100%)",
            boxShadow: "0 0 16px rgba(168,85,247,0.5)",
          }}
        />
      </div>
    </div>
  );
}
