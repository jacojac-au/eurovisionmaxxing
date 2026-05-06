"use client";

import { useCallback, useEffect, useState } from "react";
import { useRoomRealtime } from "@/hooks/useRoomRealtime";
import type { Contestant } from "@/types";
import CountUp from "@/components/ui/CountUp";

interface LeaderboardEntry {
  contestantId: string;
  totalPoints: number;
  rank: number;
}

interface ResultsResponse {
  status: string;
  pin?: string;
  leaderboard?: LeaderboardEntry[];
}

interface ContestantsResponse {
  contestants: Contestant[];
}

const RANK_MEDAL: Record<number, string> = {
  1: "🥇",
  2: "🥈",
  3: "🥉",
};

/**
 * /room/{id}/overlay/ranking — full 1920×1080 broadcast graphic. Final
 * Eurovision-points leaderboard, styled to match the actual broadcast
 * scoreboard (deep navy + parallelogram score chips). Sourced from
 * /api/results — meaningful in announcing/done states; graceful waiting
 * card otherwise.
 */
export default function RankingOverlayPage({
  params,
}: {
  params: { id: string };
}) {
  const roomId = params.id;
  const [results, setResults] = useState<ResultsResponse | null>(null);
  const [contestants, setContestants] = useState<Contestant[]>([]);

  const load = useCallback(async () => {
    try {
      const [r, c] = await Promise.all([
        fetch(`/api/results/${encodeURIComponent(roomId)}`, {
          cache: "no-store",
        }),
        fetch(`/api/rooms/${encodeURIComponent(roomId)}`, {
          cache: "no-store",
        }),
      ]);
      if (r.ok) setResults((await r.json()) as ResultsResponse);
      if (c.ok) {
        const body = (await c.json()) as ContestantsResponse;
        setContestants(body.contestants ?? []);
      }
    } catch {
      /* keep stale */
    }
  }, [roomId]);

  useEffect(() => {
    void load();
  }, [load]);

  useRoomRealtime(roomId, (event) => {
    if (event.type === "score_update" || event.type === "status_changed") {
      void load();
    }
  });

  useEffect(() => {
    const id = window.setInterval(load, 2000);
    return () => window.clearInterval(id);
  }, [load]);

  useEffect(() => {
    const prevHtmlBg = document.documentElement.style.background;
    const prevBodyBg = document.body.style.background;
    document.documentElement.style.background = "#040814";
    document.body.style.background = "#040814";
    return () => {
      document.documentElement.style.background = prevHtmlBg;
      document.body.style.background = prevBodyBg;
    };
  }, []);

  const contestantById = new Map(contestants.map((c) => [c.id, c]));
  const leaderboard = results?.leaderboard ?? null;
  const status = results?.status ?? "loading";

  const containerStyle: React.CSSProperties = { width: 1920, height: 1080 };

  if (!leaderboard || leaderboard.length === 0) {
    return (
      <div
        className="fixed left-0 top-0 overflow-hidden font-sans text-white"
        style={containerStyle}
      >
        <BoardBackground />
        <div className="relative z-10 flex h-full flex-col items-center justify-center gap-6 px-24 text-center">
          <span className="text-sm font-semibold uppercase tracking-[0.5em] text-cyan-300">
            Eurovision · Final ranking
          </span>
          <h1 className="text-[7rem] font-black leading-none tracking-tight">
            {status === "scoring"
              ? "Tallying results…"
              : status === "lobby" || status === "voting" || status === "voting_ending"
              ? "Voting in progress"
              : "Waiting for results"}
          </h1>
          <p className="text-3xl text-white/70">
            {status === "scoring"
              ? "Computing the final scores."
              : "The ranking will appear once voting closes."}
          </p>
        </div>
      </div>
    );
  }

  const sorted = [...leaderboard].sort((a, b) => a.rank - b.rank);
  const top3 = sorted.slice(0, 3);
  const rest = sorted.slice(3);
  const half = Math.ceil(rest.length / 2);
  const restLeft = rest.slice(0, half);
  const restRight = rest.slice(half);

  return (
    <div
      className="fixed left-0 top-0 overflow-hidden font-sans text-white"
      style={containerStyle}
    >
      <BoardBackground />

      <div className="relative z-10 flex h-full flex-col px-16 py-8">
        <div className="flex items-end justify-between border-b border-white/10 pb-4 motion-safe:animate-header-rise">
          <div className="flex items-end gap-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logos/esc-vienna-2026-white.svg"
              alt="Eurovision Vienna 2026"
              className="h-16 w-auto"
            />
            <div>
              <span className="block text-sm font-semibold uppercase tracking-[0.5em] text-cyan-300">
                Final ranking
              </span>
              <h1 className="mt-1 text-5xl font-black tracking-tight">
                The results are in
              </h1>
            </div>
          </div>
          <span className="text-base font-semibold uppercase tracking-[0.5em] text-white/60">
            Total points
          </span>
        </div>

        {/* Podium for top 3 — pop-in stagger from outside-in (3rd → 2nd → 1st). */}
        <section className="mt-6 grid grid-cols-3 gap-5">
          {[top3[1], top3[0], top3[2]].map((entry, columnIdx) => {
            if (!entry) return <div key={columnIdx} />;
            const c = contestantById.get(entry.contestantId);
            const heightClass =
              entry.rank === 1 ? "h-72" : entry.rank === 2 ? "h-60" : "h-52";
            // Reveal order: 3rd first (250ms), 2nd (450ms), 1st last (700ms).
            const popDelay =
              entry.rank === 3 ? 250 : entry.rank === 2 ? 450 : 700;
            const accent =
              entry.rank === 1
                ? {
                    bg: "linear-gradient(180deg, rgba(252,211,77,0.2) 0%, rgba(252,211,77,0.04) 100%)",
                    border: "border-amber-300/70 shadow-[0_0_60px_rgba(252,211,77,0.4)]",
                    chipBg: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
                    chipText: "text-slate-900",
                  }
                : entry.rank === 2
                ? {
                    bg: "linear-gradient(180deg, rgba(203,213,225,0.18) 0%, rgba(203,213,225,0.03) 100%)",
                    border: "border-slate-300/60 shadow-[0_0_40px_rgba(203,213,225,0.3)]",
                    chipBg: "linear-gradient(135deg, #cbd5e1 0%, #94a3b8 100%)",
                    chipText: "text-slate-900",
                  }
                : {
                    bg: "linear-gradient(180deg, rgba(251,146,60,0.18) 0%, rgba(251,146,60,0.03) 100%)",
                    border: "border-orange-400/70 shadow-[0_0_40px_rgba(251,146,60,0.3)]",
                    chipBg: "linear-gradient(135deg, #fb923c 0%, #c2410c 100%)",
                    chipText: "text-white",
                  };
            return (
              <div
                key={entry.contestantId}
                className={`relative flex flex-col items-center justify-end border ${accent.border} ${heightClass} px-6 pb-5 pt-6 motion-safe:animate-pop-in`}
                style={{ background: accent.bg, animationDelay: `${popDelay}ms` }}
              >
                <span className="text-6xl leading-none" aria-hidden="true">
                  {RANK_MEDAL[entry.rank] ?? `#${entry.rank}`}
                </span>
                <span className="mt-3 text-6xl leading-none">
                  {c?.flagEmoji ?? "🏳️"}
                </span>
                <span className="mt-2 truncate text-3xl font-black uppercase tracking-wide">
                  {c?.country ?? entry.contestantId}
                </span>
                <div
                  className={`mt-3 flex h-14 min-w-[140px] items-center justify-center px-6 ${accent.chipText}`}
                  style={{
                    background: accent.chipBg,
                    clipPath:
                      "polygon(14px 0, 100% 0, calc(100% - 14px) 100%, 0 100%)",
                  }}
                >
                  <span className="text-4xl font-black tabular-nums">
                    <CountUp value={entry.totalPoints} duration={1100} />
                  </span>
                </div>
              </div>
            );
          })}
        </section>

        {/* Rest of the field */}
        <section className="mt-6 grid flex-1 grid-cols-2 gap-x-8 gap-y-1.5 content-start">
          <Column
            rows={restLeft}
            contestantById={contestantById}
            fromDirection="left"
          />
          <Column
            rows={restRight}
            contestantById={contestantById}
            fromDirection="right"
          />
        </section>
      </div>
    </div>
  );
}

function Column({
  rows,
  contestantById,
  fromDirection,
}: {
  rows: LeaderboardEntry[];
  contestantById: Map<string, Contestant>;
  fromDirection: "left" | "right";
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {rows.map((row, i) => {
        const c = contestantById.get(row.contestantId);
        return (
          <ResultsRow
            key={row.contestantId}
            row={row}
            contestant={c}
            stagger={i}
            fromDirection={fromDirection}
          />
        );
      })}
    </div>
  );
}

function ResultsRow({
  row,
  contestant,
  stagger,
  fromDirection,
}: {
  row: LeaderboardEntry;
  contestant: Contestant | undefined;
  stagger: number;
  fromDirection: "left" | "right";
}) {
  // Cascade after the podium reveal (~1100ms): pos 4 first, then stagger.
  const delay = 1100 + stagger * 50;
  const animationClass =
    fromDirection === "left"
      ? "motion-safe:animate-slide-in-left"
      : "motion-safe:animate-slide-in-right";
  return (
    <div
      className={`relative flex h-[52px] items-stretch overflow-hidden ${animationClass}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex w-[54px] items-center justify-center bg-slate-800/80 text-xl font-black tabular-nums text-white/70">
        {row.rank}
      </div>
      <div className="flex flex-1 items-center gap-3 bg-gradient-to-r from-slate-900/95 via-slate-800/85 to-slate-900/95 px-4">
        <span className="text-3xl leading-none" aria-hidden="true">
          {contestant?.flagEmoji ?? "🏳️"}
        </span>
        <span className="truncate text-xl font-extrabold uppercase tracking-wide">
          {contestant?.country ?? row.contestantId}
        </span>
      </div>
      <div className="relative ml-[-14px] flex w-[110px] items-center justify-center">
        <div
          className="absolute inset-y-0 left-0 right-0"
          style={{
            background:
              row.totalPoints === 0
                ? "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)"
                : "linear-gradient(135deg, #06b6d4 0%, #2563eb 100%)",
            clipPath: "polygon(14px 0, 100% 0, 100% 100%, 0 100%)",
          }}
        />
        <span className="relative text-2xl font-black tabular-nums text-white">
          <CountUp value={row.totalPoints} duration={900} />
        </span>
      </div>
    </div>
  );
}

function BoardBackground() {
  return (
    <>
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 20% 10%, rgba(6, 182, 212, 0.15) 0%, transparent 60%), radial-gradient(ellipse at 80% 90%, rgba(99, 102, 241, 0.12) 0%, transparent 60%), linear-gradient(180deg, #060c1f 0%, #03050f 100%)",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(56,189,248,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.6) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.6) 100%)",
        }}
      />
    </>
  );
}
