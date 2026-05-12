"use client";

import { useEffect, useState } from "react";
import { V3_BASE_CSS, V3_HEART_DEFS, flagUrlV3 } from "@/lib/overlay-v3/shared";

interface Contestant {
  id: string;
  country: string;
  countryCode: string;
  avgTotal: number | null;
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

export default function V3Scorecard() {
  const [c, setC] = useState<Contestant | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function tick() {
      try {
        const r = await fetch("/api/active-room", { cache: "no-store" });
        if (!r.ok) return;
        const a = (await r.json()) as ActiveResp;
        if (!a.activeRoom) return;
        const [liveRes, scoresRes] = await Promise.all([
          fetch(`/api/rooms/${encodeURIComponent(a.activeRoom.id)}/live?all=1`, { cache: "no-store" }),
          fetch(`/api/rooms/${encodeURIComponent(a.activeRoom.id)}/scores`, { cache: "no-store" }),
        ]);
        if (!liveRes.ok || !scoresRes.ok) return;
        const live = (await liveRes.json()) as LiveResp;
        const scores = (await scoresRes.json()) as ScoresResp;
        const target = live.nowPerforming
          ? scores.contestants.find((x) => x.id === live.nowPerforming!.id) ?? null
          : null;
        if (!cancelled) setC(target);
      } catch { /* keep stale */ }
    }
    void tick();
    const id = window.setInterval(tick, 3000);
    return () => { cancelled = true; window.clearInterval(id); };
  }, []);

  useEffect(() => {
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
  }, []);

  const score = c?.avgTotal != null ? Math.round(c.avgTotal * 12) : null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: V3_BASE_CSS + PAGE_CSS }} />
      <div dangerouslySetInnerHTML={{ __html: V3_HEART_DEFS }} />
      <div className="v3-stage">
        {c ? (
          <div className="sc-wrap">
            <div className="sc-pill">
              <div className="sc-heart v3-heart">
                <div
                  className="v3-heart__inner"
                  style={{ backgroundImage: `url(${flagUrlV3(c.countryCode)})` }}
                />
              </div>
              <div className="sc-body">
                <span className="sc-country">{c.country.toUpperCase()}</span>
              </div>
              <div className="sc-tail">{score ?? "—"}</div>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}

const PAGE_CSS = `
.sc-wrap {
  position: absolute;
  left: 50%;
  bottom: 110px;
  transform: translateX(-50%);
  width: 1200px;
  height: 160px;
}
.sc-pill {
  position: relative;
  height: 160px;
  border-radius: 999px;
  background: var(--v3-white);
  box-shadow: var(--v3-pill-shadow);
  display: grid;
  grid-template-columns: 180px 1fr 280px;
  align-items: center;
  overflow: hidden;
}
.sc-heart {
  width: 168px;
  height: 168px;
  justify-self: start;
  margin: -4px 0 -4px 6px;
}
.sc-body {
  padding: 0 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
}
.sc-country {
  font-size: 56px;
  font-weight: 950;
  letter-spacing: .1em;
  color: var(--v3-ink);
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sc-tail {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, #1a2bb8 0%, #0a113f 100%);
  color: #fff;
  font-size: 88px;
  font-weight: 950;
  letter-spacing: -.04em;
  border-radius: 0 999px 999px 0;
  text-shadow: 0 2px 18px rgba(244, 192, 74, .4);
}
`;
