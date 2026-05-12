"use client";

import { useCallback, useEffect, useState } from "react";
import { V3_BASE_CSS, V3_HEART_DEFS, flagUrlV3 } from "@/lib/overlay-v3/shared";

interface LeaderboardEntry {
  contestantId: string;
  totalPoints: number;
  rank: number;
}

interface Contestant {
  id: string;
  country: string;
  countryCode: string;
}

interface ResultsResp {
  status: string;
  leaderboard?: LeaderboardEntry[];
  contestants?: Contestant[];
}

interface ScoresResp {
  contestants: Contestant[];
}

interface ActiveResp {
  activeRoom: { id: string } | null;
}

const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

/**
 * /overlay/v3/scoreboard — Vienna 2026 final-ranking board. Top 3 podium
 * + 2-col list for the rest. Driven by /api/active-room → /api/results;
 * meaningful in announcing/done. During voting/scoring it shows a soft
 * waiting card on the V3 backdrop.
 */
export default function V3Scoreboard() {
  const [results, setResults] = useState<ResultsResp | null>(null);
  const [contestants, setContestants] = useState<Contestant[]>([]);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/active-room", { cache: "no-store" });
      if (!r.ok) return;
      const a = (await r.json()) as ActiveResp;
      if (!a.activeRoom) return;
      const [resR, scoresR] = await Promise.all([
        fetch(`/api/results/${encodeURIComponent(a.activeRoom.id)}`, { cache: "no-store" }),
        fetch(`/api/rooms/${encodeURIComponent(a.activeRoom.id)}/scores`, { cache: "no-store" }),
      ]);
      if (resR.ok) setResults((await resR.json()) as ResultsResp);
      if (scoresR.ok) {
        const s = (await scoresR.json()) as ScoresResp;
        setContestants(s.contestants);
      }
    } catch { /* keep stale */ }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(load, 2000);
    return () => window.clearInterval(id);
  }, [load]);

  useEffect(() => {
    document.documentElement.style.background = "#050c3a";
    document.body.style.background = "#050c3a";
  }, []);

  const byId = new Map(contestants.map((c) => [c.id, c]));
  const status = results?.status ?? "loading";
  const leaderboard = results?.leaderboard ?? null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: V3_BASE_CSS + PAGE_CSS }} />
      <div dangerouslySetInnerHTML={{ __html: V3_HEART_DEFS }} />
      <div className="v3-stage v3-bg">
        <div className="v3-curtain" />
        <div className="v3-shimmer" />

        <div className="sb-eyebrow">eurovision · vienna 2026</div>
        <h1 className="sb-title">{status === "done" ? "Final Ranking" : status === "announcing" ? "Live Ranking" : "Scoreboard"}</h1>

        {!leaderboard || leaderboard.length === 0 ? (
          <WaitingCard status={status} />
        ) : (
          <Board leaderboard={leaderboard} byId={byId} />
        )}
      </div>
    </>
  );
}

function Board({
  leaderboard,
  byId,
}: {
  leaderboard: LeaderboardEntry[];
  byId: Map<string, Contestant>;
}) {
  const sorted = [...leaderboard].sort((a, b) => a.rank - b.rank);
  const top3 = sorted.slice(0, 3);
  const rest = sorted.slice(3);
  const half = Math.ceil(rest.length / 2);
  const left = rest.slice(0, half);
  const right = rest.slice(half);

  return (
    <>
      <section className="sb-podium">
        {[top3[1], top3[0], top3[2]].map((entry, columnIdx) => {
          if (!entry) return <div key={columnIdx} />;
          const c = byId.get(entry.contestantId);
          return (
            <PodiumCard
              key={entry.contestantId}
              entry={entry}
              countryCode={c?.countryCode}
              country={c?.country ?? entry.contestantId}
            />
          );
        })}
      </section>
      <section className="sb-grid">
        <ScoreColumn rows={left} byId={byId} />
        <ScoreColumn rows={right} byId={byId} />
      </section>
    </>
  );
}

function PodiumCard({
  entry,
  countryCode,
  country,
}: {
  entry: LeaderboardEntry;
  countryCode: string | undefined;
  country: string;
}) {
  const tier =
    entry.rank === 1 ? "gold" : entry.rank === 2 ? "silver" : "bronze";
  return (
    <div className={`sb-pod sb-pod--${tier}`}>
      <div className="sb-pod-medal" aria-hidden="true">
        {MEDAL[entry.rank] ?? `#${entry.rank}`}
      </div>
      <div className="sb-pod-heart v3-heart">
        <div
          className="v3-heart__inner"
          style={{ backgroundImage: `url(${flagUrlV3(countryCode)})` }}
        />
      </div>
      <div className="sb-pod-country">{country.toUpperCase()}</div>
      <div className="sb-pod-points">
        <span className="sb-pod-points-n">{entry.totalPoints}</span>
        <span className="sb-pod-points-unit">PTS</span>
      </div>
    </div>
  );
}

function ScoreColumn({
  rows,
  byId,
}: {
  rows: LeaderboardEntry[];
  byId: Map<string, Contestant>;
}) {
  return (
    <div className="sb-col">
      {rows.map((row) => {
        const c = byId.get(row.contestantId);
        return (
          <div className="sb-row" key={row.contestantId}>
            <span className="sb-row-rank">{row.rank}</span>
            <div className="sb-row-heart v3-heart">
              <div
                className="v3-heart__inner"
                style={{ backgroundImage: `url(${flagUrlV3(c?.countryCode)})` }}
              />
            </div>
            <span className="sb-row-country">
              {(c?.country ?? row.contestantId).toUpperCase()}
            </span>
            <span className="sb-row-points">{row.totalPoints}</span>
          </div>
        );
      })}
    </div>
  );
}

function WaitingCard({ status }: { status: string }) {
  const text =
    status === "scoring"
      ? "Tallying results…"
      : status === "lobby" || status === "voting" || status === "voting_ending"
        ? "Voting in progress"
        : "Waiting for results";
  return (
    <div className="sb-waiting">
      <h2>{text}</h2>
      <p>The scoreboard will appear once voting closes.</p>
    </div>
  );
}

const PAGE_CSS = `
.sb-eyebrow {
  position: absolute;
  left: 200px;
  top: 90px;
  font-size: 24px;
  font-weight: 800;
  letter-spacing: .42em;
  text-transform: lowercase;
  color: var(--v3-gold-soft);
  z-index: 2;
}
.sb-title {
  position: absolute;
  left: 200px;
  top: 116px;
  margin: 0;
  font-size: 80px;
  font-weight: 950;
  letter-spacing: -.02em;
  color: #fff;
  line-height: 1;
  text-shadow: 0 4px 32px rgba(8, 14, 60, .85);
  z-index: 2;
}

/* Top-3 podium */
.sb-podium {
  position: absolute;
  inset: 230px 200px auto 200px;
  display: grid;
  grid-template-columns: 1fr 1.05fr 1fr;
  gap: 28px;
  align-items: end;
  height: 340px;
  z-index: 2;
}
.sb-pod {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 22px 14px 20px;
  border-radius: 22px;
  background: linear-gradient(180deg, rgba(20, 30, 110, .95) 0%, rgba(8, 14, 60, .85) 100%);
  box-shadow: 0 22px 60px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.18);
  border: 2px solid rgba(255,255,255,.18);
  color: #fff;
  text-align: center;
  overflow: visible;
}
.sb-pod--gold {
  min-height: 340px;
  border-color: var(--v3-gold);
  box-shadow: 0 22px 70px rgba(244, 192, 74, .35), inset 0 1px 0 rgba(255,255,255,.25);
}
.sb-pod--silver { min-height: 310px; border-color: rgba(220, 224, 240, .55); }
.sb-pod--bronze { min-height: 290px; border-color: rgba(214, 144, 79, .65); }
.sb-pod-medal { font-size: 48px; line-height: 1; flex: 0 0 auto; }
.sb-pod-heart {
  width: 110px;
  height: 110px;
  flex: 0 0 auto;
}
.sb-pod-country {
  font-size: 26px;
  font-weight: 900;
  letter-spacing: .08em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  flex: 0 0 auto;
}
.sb-pod-points {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 6px;
  flex: 0 0 auto;
}
.sb-pod-points-n {
  font-size: 56px;
  font-weight: 950;
  letter-spacing: -.04em;
  color: var(--v3-gold-soft);
  text-shadow: 0 0 22px rgba(244, 192, 74, .45);
  font-variant-numeric: tabular-nums;
  line-height: 1;
}
.sb-pod-points-unit {
  font-size: 20px;
  font-weight: 900;
  letter-spacing: .18em;
  opacity: .8;
}

/* Rest of the field */
.sb-grid {
  position: absolute;
  inset: 610px 200px 70px 200px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
  z-index: 2;
}
.sb-col {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.sb-row {
  display: grid;
  grid-template-columns: 56px 60px 1fr 100px;
  align-items: center;
  height: 56px;
  border-radius: 999px;
  background: rgba(255, 255, 255, .95);
  box-shadow: 0 10px 26px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.6);
  padding: 0 4px;
}
.sb-row-rank {
  font-size: 24px;
  font-weight: 950;
  color: var(--v3-cobalt);
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.sb-row-heart { width: 60px; height: 60px; }
.sb-row-country {
  font-size: 24px;
  font-weight: 900;
  color: var(--v3-ink);
  letter-spacing: .04em;
  padding-left: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sb-row-points {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  margin: 0;
  font-size: 28px;
  font-weight: 950;
  color: #fff;
  background: linear-gradient(180deg, #1a2bb8 0%, #0a113f 100%);
  border-radius: 0 999px 999px 0;
  text-shadow: 0 1px 12px rgba(244, 192, 74, .35);
  font-variant-numeric: tabular-nums;
}

/* Waiting state */
.sb-waiting {
  position: absolute;
  inset: 320px 200px auto 200px;
  text-align: center;
  color: #fff;
  z-index: 2;
}
.sb-waiting h2 {
  margin: 0;
  font-size: 110px;
  font-weight: 950;
  letter-spacing: -.02em;
  line-height: 1;
  text-shadow: 0 6px 32px rgba(8, 14, 60, .85);
}
.sb-waiting p {
  margin: 24px 0 0;
  font-size: 32px;
  color: rgba(255, 255, 255, .75);
  font-weight: 600;
}
`;
