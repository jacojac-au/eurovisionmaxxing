"use client";

import { useEffect, useState } from "react";
import { V3_BASE_CSS, V3_HEART_DEFS, flagUrlV3 } from "@/lib/overlay-v3/shared";

interface Contestant {
  id: string;
  country: string;
  countryCode: string;
  runningOrder: number;
  avgTotal: number | null;
}

interface ScoresResp {
  contestants: Contestant[];
}

interface ActiveResp {
  activeRoom: { id: string } | null;
}

/**
 * /overlay/v3/qualifying — semi-final qualifier split. By default the top
 * 10 by avgTotal go to "Qualified for the Grand Final", rest "Still to qualify".
 * Override with ?spots=10 or ?qualified=AT,SE,FR,DE (comma list of country codes).
 */
export default function V3Qualifying() {
  const [contestants, setContestants] = useState<Contestant[]>([]);
  const [params, setParams] = useState<{ spots: number; qualified: string[] | null }>({
    spots: 10,
    qualified: null,
  });

  useEffect(() => {
    const u = new URL(window.location.href);
    const spots = Number.parseInt(u.searchParams.get("spots") ?? "10", 10);
    const q = u.searchParams.get("qualified");
    setParams({
      spots: Number.isFinite(spots) ? spots : 10,
      qualified: q ? q.split(",").map((x) => x.trim().toUpperCase()) : null,
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function tick() {
      try {
        const r = await fetch("/api/active-room", { cache: "no-store" });
        if (!r.ok) return;
        const a = (await r.json()) as ActiveResp;
        if (!a.activeRoom) return;
        const r2 = await fetch(`/api/rooms/${encodeURIComponent(a.activeRoom.id)}/scores`, { cache: "no-store" });
        if (!r2.ok) return;
        const s = (await r2.json()) as ScoresResp;
        if (!cancelled) setContestants(s.contestants);
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

  const { qualifiedList, stillToQualify } = (() => {
    if (params.qualified) {
      const set = new Set(params.qualified);
      const q = contestants.filter((c) => set.has(c.countryCode.toUpperCase()));
      const r = contestants.filter((c) => !set.has(c.countryCode.toUpperCase()));
      return { qualifiedList: q, stillToQualify: r };
    }
    const ranked = [...contestants].sort((a, b) => (b.avgTotal ?? 0) - (a.avgTotal ?? 0));
    return {
      qualifiedList: ranked.slice(0, params.spots),
      stillToQualify: ranked.slice(params.spots).sort((a, b) => a.runningOrder - b.runningOrder),
    };
  })();

  const spotsLeft = Math.max(0, params.spots - qualifiedList.length);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: V3_BASE_CSS + PAGE_CSS }} />
      <div dangerouslySetInnerHTML={{ __html: V3_HEART_DEFS }} />
      <div className="v3-stage v3-bg">
        <div className="v3-curtain" />
        <div className="v3-shimmer" />
        <Column align="left" title="STILL TO QUALIFY" rows={stillToQualify} />
        <Column
          align="right"
          title={<>QUALIFIED FOR THE<br />GRAND FINAL</>}
          rows={qualifiedList}
          spotsLeft={spotsLeft}
          golden
        />
      </div>
    </>
  );
}

function Column({
  align,
  title,
  rows,
  spotsLeft,
  golden,
}: {
  align: "left" | "right";
  title: React.ReactNode;
  rows: Contestant[];
  spotsLeft?: number;
  golden?: boolean;
}) {
  return (
    <div className={`q-col q-col--${align}`}>
      <div className={`q-header${golden ? " q-header--gold" : ""}`}>{title}</div>
      {spotsLeft !== undefined ? (
        <div className="q-spots">
          <span className="q-spots-n">{spotsLeft}</span>
          <span className="q-spots-text">SPOTS REMAINING</span>
        </div>
      ) : null}
      <div className="q-rows">
        {rows.map((c) => (
          <div className="q-pill" key={c.id}>
            <div className="q-heart v3-heart">
              <div
                className="v3-heart__inner"
                style={{ backgroundImage: `url(${flagUrlV3(c.countryCode)})` }}
              />
            </div>
            <span className="q-country">{c.country}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const PAGE_CSS = `
.q-col {
  position: absolute;
  top: 90px;
  bottom: 90px;
  width: 460px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  z-index: 2;
}
.q-col--left { left: 60px; }
.q-col--right { right: 60px; }
.q-header {
  background: linear-gradient(180deg, #1a2bb8 0%, #0a113f 100%);
  color: #fff;
  padding: 22px 28px;
  border-radius: 28px;
  font-size: 26px;
  font-weight: 900;
  letter-spacing: .12em;
  text-align: left;
  line-height: 1.05;
  box-shadow: 0 14px 38px rgba(8, 14, 50, .55), inset 0 1px 0 rgba(255,255,255,.18);
  border: 2px solid rgba(255,255,255,.18);
}
.q-header--gold {
  border-color: var(--v3-gold);
  box-shadow: 0 14px 38px rgba(8, 14, 50, .55), inset 0 1px 0 rgba(255,255,255,.18), 0 0 0 3px rgba(244, 192, 74, .25);
  color: var(--v3-gold-soft);
}
.q-spots {
  display: flex;
  align-items: baseline;
  gap: 14px;
  color: #fff;
  padding: 0 8px;
  margin-top: -8px;
  margin-bottom: 4px;
}
.q-spots-n { font-size: 60px; font-weight: 950; color: var(--v3-gold-soft); text-shadow: 0 0 22px rgba(244, 192, 74, .5); }
.q-spots-text { font-size: 18px; font-weight: 800; letter-spacing: .14em; opacity: .9; }
.q-rows { display: flex; flex-direction: column; gap: 12px; overflow: hidden; }
.q-pill {
  position: relative;
  height: 74px;
  border-radius: 999px;
  background: var(--v3-white);
  box-shadow: 0 10px 26px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.55);
  display: grid;
  grid-template-columns: 86px 1fr;
  align-items: center;
  padding-left: 4px;
}
.q-heart {
  width: 78px;
  height: 78px;
  margin: -2px 0;
}
.q-country {
  font-size: 28px;
  font-weight: 900;
  color: var(--v3-ink);
  letter-spacing: .04em;
  padding-left: 14px;
  padding-right: 22px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
`;
