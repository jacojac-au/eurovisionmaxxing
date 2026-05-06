"use client";

import { useCallback, useEffect, useState } from "react";
import { useRoomRealtime } from "@/hooks/useRoomRealtime";
import CountUp from "@/components/ui/CountUp";

interface ContestantScore {
  id: string;
  country: string;
  flagEmoji: string;
  artist: string;
  song: string;
  runningOrder: number;
  submittedCount: number;
  avgTotal: number | null;
}

interface ScoresResponse {
  contestants: ContestantScore[];
}

interface LiveResponse {
  nowPerforming: { id: string } | null;
}

/**
 * /room/{id}/overlay/running-order — full 1920×1080 broadcast graphic that
 * walks through the lineup in **broadcast running order**, not sorted by
 * score. The currently-performing contestant is highlighted; past entries
 * settle with their final-for-now score; upcoming entries are dimmed.
 *
 * Inspired by the douzepoints.app simulator's playback flow — points
 * accumulate live as the show progresses, but row order matches the
 * actual broadcast.
 */
export default function RunningOrderOverlayPage({
  params,
}: {
  params: { id: string };
}) {
  const roomId = params.id;
  const [data, setData] = useState<ScoresResponse | null>(null);
  const [nowPerformingId, setNowPerformingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [scoresRes, liveRes] = await Promise.all([
        fetch(`/api/rooms/${encodeURIComponent(roomId)}/scores`, {
          cache: "no-store",
        }),
        fetch(`/api/rooms/${encodeURIComponent(roomId)}/live`, {
          cache: "no-store",
        }),
      ]);
      if (scoresRes.ok) setData((await scoresRes.json()) as ScoresResponse);
      if (liveRes.ok) {
        const live = (await liveRes.json()) as LiveResponse;
        setNowPerformingId(live.nowPerforming?.id ?? null);
      }
    } catch {
      /* keep stale */
    }
  }, [roomId]);

  useEffect(() => {
    void load();
  }, [load]);

  useRoomRealtime(roomId, (event) => {
    if (
      event.type === "voting_progress" ||
      event.type === "now_performing" ||
      event.type === "status_changed"
    ) {
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

  // Always sort by running order — that's the whole point of this view.
  const sorted = data
    ? [...data.contestants].sort((a, b) => a.runningOrder - b.runningOrder)
    : [];
  const nowPerformingOrder = nowPerformingId
    ? sorted.find((c) => c.id === nowPerformingId)?.runningOrder ?? null
    : null;

  const half = Math.ceil(sorted.length / 2);
  const left = sorted.slice(0, half);
  const right = sorted.slice(half);

  return (
    <div
      className="fixed left-0 top-0 overflow-hidden font-sans text-white"
      style={{ width: 1920, height: 1080 }}
    >
      <BoardBackground />
      <div className="relative z-10 flex h-full flex-col px-16 py-10">
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
                Running order
              </span>
              <h1 className="mt-1 text-5xl font-black tracking-tight">
                The show so far
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-sm bg-rose-600 px-4 py-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-80" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
            </span>
            <span className="text-sm font-bold uppercase tracking-[0.4em] text-white">
              Live
            </span>
          </div>
        </div>

        <div className="mt-6 grid flex-1 grid-cols-2 gap-x-10 gap-y-2 content-start">
          <Column
            rows={left}
            nowPerformingOrder={nowPerformingOrder}
            fromDirection="left"
          />
          <Column
            rows={right}
            nowPerformingOrder={nowPerformingOrder}
            fromDirection="right"
          />
        </div>
      </div>
    </div>
  );
}

function Column({
  rows,
  nowPerformingOrder,
  fromDirection,
}: {
  rows: ContestantScore[];
  nowPerformingOrder: number | null;
  fromDirection: "left" | "right";
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {rows.map((row, i) => (
        <Row
          key={row.id}
          row={row}
          nowPerformingOrder={nowPerformingOrder}
          stagger={i}
          fromDirection={fromDirection}
        />
      ))}
    </div>
  );
}

function Row({
  row,
  nowPerformingOrder,
  stagger,
  fromDirection,
}: {
  row: ContestantScore;
  nowPerformingOrder: number | null;
  stagger: number;
  fromDirection: "left" | "right";
}) {
  const isNow = nowPerformingOrder !== null && row.runningOrder === nowPerformingOrder;
  const isPast = nowPerformingOrder !== null && row.runningOrder < nowPerformingOrder;
  const isUpcoming = nowPerformingOrder !== null && row.runningOrder > nowPerformingOrder;

  const delay = 350 + stagger * 60;
  const animationClass =
    fromDirection === "left"
      ? "motion-safe:animate-slide-in-left"
      : "motion-safe:animate-slide-in-right";

  // Visual states:
  //  - now: scaled 1.02, cyan ring, brighter, with "ON STAGE" label
  //  - past: full brightness, settled score
  //  - upcoming: 50% opacity, no score yet
  const isUpcomingClass = isUpcoming ? "opacity-50" : "";
  const isNowClass = isNow
    ? "ring-2 ring-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.45)] scale-[1.02] z-10"
    : "";

  return (
    <div
      className={`relative flex h-[58px] items-stretch overflow-hidden transition ${animationClass} ${isUpcomingClass} ${isNowClass}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Running-order slab */}
      <div
        className={`flex w-[60px] items-center justify-center text-2xl font-black tabular-nums ${
          isNow
            ? "bg-cyan-400 text-slate-900"
            : "bg-slate-800/80 text-white/70"
        }`}
      >
        {row.runningOrder}
      </div>

      {/* Country body */}
      <div className="flex flex-1 items-center gap-4 bg-gradient-to-r from-slate-900/95 via-slate-800/85 to-slate-900/95 px-4">
        <span className="text-3xl leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]" aria-hidden="true">
          {row.flagEmoji}
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-xl font-extrabold uppercase tracking-wide leading-tight">
            {row.country}
          </span>
          <span className="truncate text-[11px] font-medium uppercase tracking-wider leading-tight text-white/50">
            {row.song} · {row.artist}
          </span>
        </div>
        {isNow && (
          <span className="rounded-sm bg-cyan-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-900">
            On stage
          </span>
        )}
      </div>

      {/* Parallelogram score chip */}
      <div className="relative ml-[-14px] flex w-[120px] items-center justify-center">
        <div
          className="absolute inset-y-0 left-0 right-0"
          style={{
            background: row.avgTotal === null
              ? "linear-gradient(135deg, #0f172a 0%, #050a18 100%)"
              : isNow
              ? "linear-gradient(135deg, #06b6d4 0%, #2563eb 100%)"
              : "linear-gradient(135deg, #1e3a8a 0%, #1e293b 100%)",
            clipPath: "polygon(14px 0, 100% 0, 100% 100%, 0 100%)",
          }}
        />
        <span
          className={`relative text-3xl font-black tabular-nums ${
            row.avgTotal === null ? "text-white/30" : "text-white"
          }`}
        >
          {row.avgTotal === null ? (
            isUpcoming ? (
              "—"
            ) : (
              "—"
            )
          ) : (
            <CountUp value={row.avgTotal} decimals={1} duration={800} />
          )}
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
