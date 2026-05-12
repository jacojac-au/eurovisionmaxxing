"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
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
  room: {
    id: string;
    status: string;
    categories: VotingCategory[];
    ownerUserId: string | null;
    allowNowPerforming: boolean;
  };
  nowPerforming: Contestant | null;
  aggregate: LiveAggregate | null;
  contestants: Contestant[];
  scoredCounts: Record<string, number>;
}

export default function AdminControlPage({
  params,
}: {
  params: { id: string };
}) {
  const roomId = params.id;
  const [data, setData] = useState<LiveResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/rooms/${encodeURIComponent(roomId)}/live?all=1`,
        { cache: "no-store" }
      );
      if (!res.ok) {
        setError(`HTTP ${res.status}`);
        return;
      }
      setError(null);
      setData((await res.json()) as LiveResponse);
    } catch (e) {
      setError(String(e));
    }
  }, [roomId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Realtime push for instant updates.
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

  // Belt-and-braces poll.
  useEffect(() => {
    const id = window.setInterval(load, 3000);
    return () => window.clearInterval(id);
  }, [load]);

  const setNowPerforming = useCallback(
    async (contestantId: string | null) => {
      if (!data?.room.ownerUserId) {
        setError("No owner on room — cannot set now-performing.");
        return;
      }
      setPending(contestantId ?? "__clear__");
      try {
        const res = await fetch(
          `/api/rooms/${encodeURIComponent(roomId)}/now-performing`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contestantId,
              userId: data.room.ownerUserId,
            }),
          }
        );
        const body = (await res.json().catch(() => ({}))) as {
          error?: { code: string; message: string };
        };
        if (!res.ok) {
          setError(
            body.error
              ? `${body.error.code}: ${body.error.message}`
              : `HTTP ${res.status}`
          );
        } else {
          setError(null);
          await load();
        }
      } catch (e) {
        setError(String(e));
      } finally {
        setPending(null);
      }
    },
    [data?.room.ownerUserId, roomId, load]
  );

  const transitionStatus = useCallback(
    async (next: "voting" | "voting_ending" | "done") => {
      if (!data?.room.ownerUserId) {
        setError("No owner on room — cannot change status.");
        return;
      }
      setPending(`__status_${next}__`);
      try {
        const res = await fetch(
          `/api/rooms/${encodeURIComponent(roomId)}/status`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              status: next,
              userId: data.room.ownerUserId,
            }),
          }
        );
        const body = (await res.json().catch(() => ({}))) as {
          error?: { code: string; message: string };
        };
        if (!res.ok) {
          setError(
            body.error
              ? `${body.error.code}: ${body.error.message}`
              : `HTTP ${res.status}`
          );
        } else {
          setError(null);
          await load();
        }
      } catch (e) {
        setError(String(e));
      } finally {
        setPending(null);
      }
    },
    [data?.room.ownerUserId, roomId, load]
  );

  if (!data && !error) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-10">
        <p className="text-muted-foreground">Loading…</p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-10">
        <p className="text-destructive">{error}</p>
      </main>
    );
  }

  const { room, nowPerforming, aggregate, contestants, scoredCounts } = data;
  const sortedContestants = [...contestants].sort(
    (a, b) => a.runningOrder - b.runningOrder
  );

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-4 flex items-center gap-4 text-sm">
        <Link
          href="/admin"
          className="text-muted-foreground hover:text-foreground"
        >
          ← All rooms
        </Link>
        <span className="opacity-30">·</span>
        <span className="font-mono">{roomId}</span>
        <span className="opacity-30">·</span>
        <span>
          status: <strong>{room.status}</strong>
        </span>
      </div>

      <div className="mb-6 flex flex-wrap gap-2 rounded-lg border bg-muted/30 p-3">
        <button
          type="button"
          onClick={() => transitionStatus("voting")}
          disabled={
            pending !== null ||
            !(room.status === "lobby" || room.status === "voting_ending")
          }
          className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-30"
        >
          {room.status === "voting_ending" ? "Undo end-voting" : "Start voting"}
        </button>
        <button
          type="button"
          onClick={() => transitionStatus("voting_ending")}
          disabled={pending !== null || room.status !== "voting"}
          className="rounded-md bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-30"
        >
          End voting
        </button>
        <button
          type="button"
          onClick={() => transitionStatus("done")}
          disabled={pending !== null || room.status !== "announcing"}
          className="rounded-md bg-slate-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-30"
        >
          Mark done
        </button>
        <span className="ml-auto self-center text-xs text-muted-foreground">
          No &ldquo;pause&rdquo; — domain only supports the transitions above. End voting →
          5s undo window → server completes scoring/announcing.
        </span>
      </div>

      {error && (
        <p className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {!room.allowNowPerforming && (
        <p className="mb-4 rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          <strong>Heads up:</strong> this room has{" "}
          <code>allow_now_performing = false</code>. Tapping a country below
          will be rejected by the API. Toggle it on in the in-app lobby
          editor (Edit room → Now performing).
        </p>
      )}

      {room.status !== "voting" && (
        <p className="mb-4 rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          <strong>Heads up:</strong> room is in <code>{room.status}</code>,
          not <code>voting</code>. Now-performing changes are only allowed
          while voting.
        </p>
      )}

      <NowPerformingHeader
        nowPerforming={nowPerforming}
        aggregate={aggregate}
        categories={room.categories}
        onClear={() => setNowPerforming(null)}
        clearing={pending === "__clear__"}
      />

      <h2 className="mb-3 text-lg font-semibold">
        Lineup ({contestants.length})
      </h2>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
        {sortedContestants.map((c) => {
          const isNow = nowPerforming?.id === c.id;
          const scored = scoredCounts[c.id] ?? 0;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setNowPerforming(c.id)}
              disabled={pending !== null}
              className={`flex items-center gap-3 rounded-lg border p-3 text-left transition disabled:opacity-50 ${
                isNow
                  ? "border-primary bg-primary/10 ring-2 ring-primary"
                  : "hover:bg-muted/40"
              }`}
            >
              <span className="text-3xl leading-none">{c.flagEmoji}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs opacity-60">#{c.runningOrder}</span>
                  <span className="truncate text-sm font-semibold">
                    {c.country}
                  </span>
                </div>
                <div className="truncate text-xs opacity-70">
                  {c.song} — {c.artist}
                </div>
              </div>
              <div className="flex flex-col items-end text-xs">
                <span className="opacity-60">scored</span>
                <span className="font-semibold tabular-nums">{scored}</span>
              </div>
              {isNow && (
                <span className="text-xs font-bold text-primary">LIVE</span>
              )}
              {pending === c.id && (
                <span className="text-xs opacity-60">…</span>
              )}
            </button>
          );
        })}
      </div>

      <QuickLinks roomId={roomId} />
    </main>
  );
}

function QuickLinks({ roomId }: { roomId: string }) {
  const [origin, setOrigin] = useState<string>("");
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);
  const room = (path: string) => `${origin}/room/${roomId}${path}`;
  const api = (path: string) => `${origin}/api/rooms/${roomId}${path}`;
  const generic = (path: string) => `${origin}${path}`;

  const overlays: Array<{
    name: string;
    url: string;
    note: string;
    suggestedSize: string;
  }> = [
    {
      name: "Full-screen voting overlay (active room)",
      url: generic("/overlay/voting"),
      note: "Standalone broadcast scene. Now-performing card + per-category bars + voter % + running-order strip.",
      suggestedSize: "1920 × 1080 (full)",
    },
    {
      name: "Full-screen voting overlay (this room only)",
      url: room("/overlay/voting"),
      note: "Hard-coded to this room.",
      suggestedSize: "1920 × 1080 (full)",
    },
    {
      name: "All countries — live ranking (active room)",
      url: generic("/overlay/all-countries"),
      note: "Full-screen leaderboard during voting, sorted by current avg. Top 3 highlighted, all contestants visible in 2-col grid.",
      suggestedSize: "1920 × 1080 (full)",
    },
    {
      name: "All countries — live ranking (this room only)",
      url: room("/overlay/all-countries"),
      note: "Hard-coded to this room.",
      suggestedSize: "1920 × 1080 (full)",
    },
    {
      name: "Final ranking (active room)",
      url: generic("/overlay/ranking"),
      note: "Eurovision-points leaderboard with podium for top 3 (gold/silver/bronze). Driven by /api/results — meaningful in announcing/done states.",
      suggestedSize: "1920 × 1080 (full)",
    },
    {
      name: "Final ranking (this room only)",
      url: room("/overlay/ranking"),
      note: "Hard-coded to this room.",
      suggestedSize: "1920 × 1080 (full)",
    },
    {
      name: "Now-performing overlay (active room)",
      url: generic("/overlay/now-performing"),
      note: "Country + song + artist + live avg in one bar. Follows the active room.",
      suggestedSize: "1294 × 170",
    },
    {
      name: "Now-performing overlay (this room only)",
      url: room("/overlay"),
      note: "Hard-coded to this room.",
      suggestedSize: "1294 × 170",
    },
    {
      name: "Scorecard (active room) — just the live average",
      url: generic("/overlay/scorecard"),
      note: "Just the live-average number, huge. Hides when no contestant is performing.",
      suggestedSize: "400 × 220",
    },
    {
      name: "Scorecard (this room only)",
      url: room("/overlay/scorecard"),
      note: "Hard-coded to this room.",
      suggestedSize: "400 × 220",
    },
    {
      name: "Song name (active room)",
      url: generic("/overlay/song"),
      note: "Wide bar with just song title + artist of the now-performing contestant.",
      suggestedSize: "1000 × 140",
    },
    {
      name: "Song name (this room only)",
      url: room("/overlay/song"),
      note: "Hard-coded to this room.",
      suggestedSize: "1000 × 140",
    },
    {
      name: "CTA banner (active room)",
      url: generic("/overlay/cta?url=https://your-site.com"),
      note: 'Stable URL. ?cta= changes the headline, ?url= changes the URL.',
      suggestedSize: "1294 × 170",
    },
    {
      name: "CTA banner (this room only)",
      url: room("/overlay/cta?url=https://your-site.com"),
      note: "Hard-coded to this room.",
      suggestedSize: "1294 × 170",
    },
    {
      name: "Just-vote banner (no room context)",
      url: generic("/overlay/just-vote?url=xyz.com"),
      note: 'Transparent. "Just vote @ <url>". ?cta=, ?url=. No PIN.',
      suggestedSize: "1294 × 170",
    },
    {
      name: "QR code (active room)",
      url: generic("/overlay/qr"),
      note: "Encodes the root URL — viewers scan, name themselves, auto-join the active room. Override with ?url=, dimension with ?size=.",
      suggestedSize: "200 × 170",
    },
    {
      name: "Present screen (TV / AirPlay)",
      url: room("/present"),
      note: "Full-screen TV view. Not an OBS overlay — projector / AirPlay only.",
      suggestedSize: "1920 × 1080 (full)",
    },
  ];

  // Vienna 2026 V3 overlays — drop-in replacements at the same OBS canvas
  // size as V1/V2 (1920×1080) but with the Vienna 2026 visual language:
  // deep-navy + gold particle backdrop, heart-clip-path flag chips, white
  // stadium pills with deep-navy type. All driven by /api/active-room.
  const v3Overlays: Array<{
    name: string;
    url: string;
    note: string;
    suggestedSize: string;
  }> = [
    {
      name: "V3 index — all Vienna 2026 overlays",
      url: generic("/overlay/v3"),
      note: "Landing page listing every V3 overlay with descriptions.",
      suggestedSize: "—",
    },
    {
      name: "V3 — Now-performing lower-third",
      url: generic("/overlay/v3/song"),
      note: "Centered 1200-wide pill with heart flag chip + artist + song. Transparent bg.",
      suggestedSize: "1920 × 1080 (full)",
    },
    {
      name: "V3 — Running-order tile",
      url: generic("/overlay/v3/running-order"),
      note: "Bottom-right navy-gold pill: big running-order number + country + heart flag chip. Transparent bg.",
      suggestedSize: "1920 × 1080 (full)",
    },
    {
      name: "V3 — Tonight's Lineup (3-column board)",
      url: generic("/overlay/v3/all-countries"),
      note: "Full-screen lineup grid with heart flag chips, gold ring on current performer, »passed for prior runners. ?title= overrides the heading.",
      suggestedSize: "1920 × 1080 (full)",
    },
    {
      name: "V3 — Voting lower-third (CTA + country)",
      url: generic("/overlay/v3/voting"),
      note: "Gold-trimmed navy strip across the bottom with eyebrow + body text on the left and now-performing pill on the right. ?left= and ?body= override the CTA copy.",
      suggestedSize: "1920 × 1080 (full)",
    },
    {
      name: "V3 — Scorecard (country + score)",
      url: generic("/overlay/v3/scorecard"),
      note: "Centered pill: heart flag chip + country, navy tail with computed score. Transparent bg.",
      suggestedSize: "1920 × 1080 (full)",
    },
    {
      name: "V3 — Final ranking scoreboard",
      url: generic("/overlay/v3/scoreboard"),
      note: "Full-screen final/live ranking on the Vienna 2026 backdrop: top-3 podium with gold/silver/bronze tiers, plus a 2-col field for the rest. Driven by /api/results — meaningful in announcing/done.",
      suggestedSize: "1920 × 1080 (full)",
    },
    {
      name: "V3 — Qualifying split (still / qualified)",
      url: generic("/overlay/v3/qualifying"),
      note: "Two-column qualifier board on the gold/navy backdrop. ?spots=10 or ?qualified=AT,SE,FR to override.",
      suggestedSize: "1920 × 1080 (full)",
    },
    {
      name: "V3 — Big Show poster",
      url: generic("/overlay/v3/big-show"),
      note: "Vienna 2026 host-city marketing card. Override per-card with ?c1=AT&n1=Austria&v1=…&d1=… (and c2..c3).",
      suggestedSize: "1920 × 1080 (full)",
    },
  ];

  const apis: Array<{ name: string; method: string; url: string; note: string }> = [
    {
      name: "Live snapshot",
      method: "GET",
      url: api("/live"),
      note: "Now-performing contestant + live aggregate. Cache-Control: no-store.",
    },
    {
      name: "Live snapshot (with full lineup)",
      method: "GET",
      url: api("/live?all=1"),
      note: "Adds contestants[] + per-contestant scoredCounts.",
    },
    {
      name: "Per-contestant scores",
      method: "GET",
      url: api("/scores"),
      note: "Whole-lineup live aggregates: avgTotal, avgPerCategory, submitted/missed/hot-take counts.",
    },
    {
      name: "Set now-performing",
      method: "PATCH",
      url: api("/now-performing"),
      note: "Body { contestantId, userId }. Requires allow_now_performing=true & status=voting.",
    },
    {
      name: "Change room status",
      method: "PATCH",
      url: api("/status"),
      note: "Body { status: 'voting' | 'voting_ending' | 'done', userId }.",
    },
    {
      name: "Get room",
      method: "GET",
      url: api(""),
      note: "Full room + memberships + contestants. ?userId=… also returns that user's votes.",
    },
  ];

  const adminApis: Array<{ method: string; url: string; note: string }> = [
    {
      method: "GET",
      url: generic("/api/active-room"),
      note: "Public — returns the active room (id, pin, status, year, event) or null.",
    },
    {
      method: "POST",
      url: generic("/api/admin/active-room"),
      note: "Body { roomId } or { roomId: null } to clear. Atomically switches the active room.",
    },
    {
      method: "GET",
      url: generic("/api/admin/rooms"),
      note: "List all rooms (broadcast control).",
    },
    {
      method: "POST",
      url: generic("/api/admin/rooms"),
      note: "Create a room owned by 'Broadcast Admin'.",
    },
    {
      method: "DELETE",
      url: generic(`/api/admin/rooms/${roomId}`),
      note: "Hard delete this room (cascades members/votes/results/awards).",
    },
  ];

  return (
    <section className="mt-12 space-y-8 border-t pt-8">
      <div>
        <h3 className="mb-1 text-lg font-semibold">OBS overlays</h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Each page sits at (0, 0) — set Browser Source size below, then drag
          to position in OBS.
        </p>
        <div className="space-y-2">
          {overlays.map((o) => (
            <div
              key={o.name}
              className="flex flex-col gap-1 rounded border p-3 text-xs"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <strong className="text-sm">{o.name}</strong>
                <span className="font-mono text-muted-foreground">
                  Browser Source: {o.suggestedSize}
                </span>
              </div>
              <code className="break-all text-xs text-muted-foreground">
                {o.url}
              </code>
              <span className="opacity-70">{o.note}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-1 text-lg font-semibold">
          OBS overlays — Vienna 2026 (V3)
        </h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Drop-in replacements at the same 1920×1080 canvas, restyled with
          the Vienna 2026 brand (deep navy + gold particle backdrop, heart
          flag chips). All follow the active room.
        </p>
        <div className="space-y-2">
          {v3Overlays.map((o) => (
            <div
              key={o.name}
              className="flex flex-col gap-1 rounded border p-3 text-xs"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <strong className="text-sm">{o.name}</strong>
                <span className="font-mono text-muted-foreground">
                  Browser Source: {o.suggestedSize}
                </span>
              </div>
              <code className="break-all text-xs text-muted-foreground">
                {o.url}
              </code>
              <span className="opacity-70">{o.note}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-1 text-lg font-semibold">Room API</h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Read-only endpoints work without auth; PATCH endpoints require the
          room owner&apos;s userId in the body.
        </p>
        <div className="space-y-2">
          {apis.map((a) => (
            <div key={a.url + a.method} className="rounded border p-3 text-xs">
              <div className="mb-1 flex flex-wrap items-baseline gap-2">
                <span
                  className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                    a.method === "GET"
                      ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                      : "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                  }`}
                >
                  {a.method}
                </span>
                <strong>{a.name}</strong>
              </div>
              <code className="block break-all text-muted-foreground">
                {a.url}
              </code>
              <span className="opacity-70">{a.note}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-1 text-lg font-semibold">Admin API</h3>
        <p className="mb-4 text-xs text-muted-foreground">
          No auth — local-only by default. 404s in production unless
          ENABLE_ADMIN_UI=1.
        </p>
        <div className="space-y-2">
          {adminApis.map((a) => (
            <div key={a.url + a.method} className="rounded border p-3 text-xs">
              <div className="mb-1 flex flex-wrap items-baseline gap-2">
                <span
                  className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                    a.method === "GET"
                      ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                      : a.method === "POST"
                      ? "bg-blue-500/20 text-blue-700 dark:text-blue-300"
                      : "bg-rose-500/20 text-rose-700 dark:text-rose-300"
                  }`}
                >
                  {a.method}
                </span>
              </div>
              <code className="block break-all text-muted-foreground">
                {a.url}
              </code>
              <span className="opacity-70">{a.note}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function NowPerformingHeader({
  nowPerforming,
  aggregate,
  categories,
  onClear,
  clearing,
}: {
  nowPerforming: Contestant | null;
  aggregate: LiveAggregate | null;
  categories: VotingCategory[];
  onClear: () => void;
  clearing: boolean;
}) {
  if (!nowPerforming || !aggregate) {
    return (
      <div className="mb-8 rounded-xl border border-dashed p-6 text-center text-muted-foreground">
        No contestant is currently performing. Tap one below to start.
      </div>
    );
  }
  const avg =
    aggregate.avgTotal === null ? "—" : aggregate.avgTotal.toFixed(2);
  return (
    <div className="mb-8 rounded-xl bg-gradient-to-r from-slate-900 to-slate-700 p-6 text-white shadow-lg">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="text-6xl leading-none">
            {nowPerforming.flagEmoji}
          </span>
          <div>
            <div className="text-xs uppercase tracking-widest opacity-70">
              Now performing — #{nowPerforming.runningOrder}
            </div>
            <div className="text-2xl font-bold">{nowPerforming.country}</div>
            <div className="text-sm opacity-80">
              {nowPerforming.song} — {nowPerforming.artist}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onClear}
          disabled={clearing}
          className="rounded-md bg-white/10 px-3 py-1.5 text-sm font-semibold hover:bg-white/20 disabled:opacity-50"
        >
          {clearing ? "Clearing…" : "Clear"}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Live avg" value={avg} large />
        <Stat
          label="Voted"
          value={`${aggregate.submittedCount}/${aggregate.totalVoters}`}
        />
        <Stat label="Missed" value={String(aggregate.missedCount)} />
        <Stat label="Hot takes" value={String(aggregate.hotTakesCount)} />
      </div>
      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        {categories.map((cat) => {
          const v = aggregate.avgPerCategory[cat.name];
          return (
            <div
              key={cat.name}
              className="rounded-md bg-white/10 px-3 py-2"
            >
              <div className="text-xs uppercase tracking-wider opacity-70">
                {cat.name}
              </div>
              <div className="text-lg font-semibold tabular-nums">
                {v === null ? "—" : v.toFixed(2)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  large,
}: {
  label: string;
  value: string;
  large?: boolean;
}) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider opacity-70">{label}</div>
      <div
        className={`font-bold tabular-nums ${large ? "text-4xl" : "text-2xl"}`}
      >
        {value}
      </div>
    </div>
  );
}
