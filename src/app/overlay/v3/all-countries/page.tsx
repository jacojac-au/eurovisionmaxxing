"use client";

import { useEffect, useState } from "react";
import { V3_BASE_CSS, V3_HEART_DEFS, flagUrlV3 } from "@/lib/overlay-v3/shared";

interface Contestant {
  id: string;
  country: string;
  countryCode: string;
  runningOrder: number;
}

interface ScoresResp {
  contestants: Contestant[];
}

interface LiveResp {
  nowPerforming: { id: string } | null;
}

interface ActiveResp {
  activeRoom: { id: string } | null;
}

export default function V3AllCountries() {
  const [contestants, setContestants] = useState<Contestant[]>([]);
  const [nowId, setNowId] = useState<string | null>(null);
  const [title, setTitle] = useState<string>("Tonight's Lineup");

  useEffect(() => {
    const url = new URL(window.location.href);
    const t = url.searchParams.get("title");
    if (t) setTitle(t);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function tick() {
      try {
        const r = await fetch("/api/active-room", { cache: "no-store" });
        if (!r.ok) return;
        const a = (await r.json()) as ActiveResp;
        if (!a.activeRoom) return;
        const [scoresRes, liveRes] = await Promise.all([
          fetch(`/api/rooms/${encodeURIComponent(a.activeRoom.id)}/scores`, { cache: "no-store" }),
          fetch(`/api/rooms/${encodeURIComponent(a.activeRoom.id)}/live?all=1`, { cache: "no-store" }),
        ]);
        if (!scoresRes.ok) return;
        const s = (await scoresRes.json()) as ScoresResp;
        const live = liveRes.ok ? ((await liveRes.json()) as LiveResp) : { nowPerforming: null };
        if (!cancelled) {
          setContestants([...s.contestants].sort((x, y) => x.runningOrder - y.runningOrder));
          setNowId(live.nowPerforming?.id ?? null);
        }
      } catch { /* keep stale */ }
    }
    void tick();
    const id = window.setInterval(tick, 5000);
    return () => { cancelled = true; window.clearInterval(id); };
  }, []);

  useEffect(() => {
    document.documentElement.style.background = "#050c3a";
    document.body.style.background = "#050c3a";
  }, []);

  const cols = chunk(contestants, Math.ceil(contestants.length / 3) || 1);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: V3_BASE_CSS + PAGE_CSS }} />
      <div dangerouslySetInnerHTML={{ __html: V3_HEART_DEFS }} />
      <div className="v3-stage v3-bg">
        <div className="v3-curtain" />
        <div className="v3-shimmer" />
        <h1 className="ac-title">{title}</h1>
        <div className="ac-grid">
          {cols.map((col, ci) => (
            <div className="ac-col" key={ci}>
              {col.map((c) => {
                const passed = nowId != null && c.runningOrder < (contestants.find((x) => x.id === nowId)?.runningOrder ?? Infinity);
                const current = c.id === nowId;
                return (
                  <div className={`ac-row${current ? " ac-row--current" : ""}${passed ? " ac-row--passed" : ""}`} key={c.id}>
                    <span className="ac-num">{passed ? "»" : c.runningOrder}</span>
                    <div className="ac-pill">
                      <div className="ac-heart v3-heart">
                        <div
                          className="v3-heart__inner"
                          style={{ backgroundImage: `url(${flagUrlV3(c.countryCode)})` }}
                        />
                      </div>
                      <span className="ac-country">{c.country}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

const PAGE_CSS = `
.ac-title {
  position: absolute;
  left: 200px;
  top: 110px;
  margin: 0;
  font-size: 110px;
  font-weight: 950;
  letter-spacing: -.02em;
  color: #fff;
  line-height: 1;
  text-shadow: 0 4px 32px rgba(8, 14, 60, .85);
  z-index: 2;
}
.ac-grid {
  position: absolute;
  inset: 320px 200px 110px 200px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 40px;
  align-content: start;
  z-index: 2;
}
.ac-col {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.ac-row {
  display: grid;
  grid-template-columns: 56px 1fr;
  gap: 18px;
  align-items: center;
}
.ac-num {
  font-size: 38px;
  font-weight: 900;
  color: #fff;
  text-align: right;
  font-variant-numeric: tabular-nums;
  opacity: .92;
}
.ac-row--current .ac-num {
  color: var(--v3-gold-soft);
  text-shadow: 0 0 18px rgba(244, 192, 74, .6);
}
.ac-row--passed { opacity: .55; }
.ac-row--passed .ac-num { font-size: 32px; }
.ac-pill {
  position: relative;
  height: 76px;
  border-radius: 999px;
  background: var(--v3-white);
  box-shadow: 0 10px 28px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.6);
  display: grid;
  grid-template-columns: 90px 1fr;
  align-items: center;
  padding-left: 6px;
}
.ac-row--current .ac-pill {
  box-shadow: 0 0 0 3px var(--v3-gold), 0 14px 32px rgba(244, 192, 74, .35), inset 0 1px 0 rgba(255,255,255,.6);
}
.ac-heart {
  width: 80px;
  height: 80px;
  margin: -2px 0;
}
.ac-country {
  font-size: 30px;
  font-weight: 900;
  color: var(--v3-ink);
  letter-spacing: .02em;
  padding-left: 14px;
  padding-right: 22px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
`;
