"use client";

import { useEffect, useState } from "react";
import { V3_BASE_CSS, V3_HEART_DEFS, flagUrlV3 } from "@/lib/overlay-v3/shared";

interface Contestant {
  id: string;
  country: string;
  countryCode: string;
  runningOrder: number;
}

interface LiveResp {
  nowPerforming: Contestant | null;
}

interface ActiveResp {
  activeRoom: { id: string } | null;
}

export default function V3RunningOrderTile() {
  const [c, setC] = useState<Contestant | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function tick() {
      try {
        const r = await fetch("/api/active-room", { cache: "no-store" });
        if (!r.ok) return;
        const a = (await r.json()) as ActiveResp;
        if (!a.activeRoom) return;
        const r2 = await fetch(`/api/rooms/${encodeURIComponent(a.activeRoom.id)}/live?all=1`, { cache: "no-store" });
        if (!r2.ok) return;
        const live = (await r2.json()) as LiveResp;
        if (!cancelled) setC(live.nowPerforming);
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

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: V3_BASE_CSS + PAGE_CSS }} />
      <div dangerouslySetInnerHTML={{ __html: V3_HEART_DEFS }} />
      <div className="v3-stage">
        {c ? (
          <div className="ro-wrap">
            <div className="ro-shimmer" aria-hidden="true" />
            <div className="ro-pill">
              <div className="ro-number">{String(c.runningOrder).padStart(2, "0")}</div>
              <div className="ro-divider" aria-hidden="true" />
              <div className="ro-country">{c.country.toUpperCase()}</div>
              <div className="ro-heart v3-heart">
                <div
                  className="v3-heart__inner"
                  style={{ backgroundImage: `url(${flagUrlV3(c.countryCode)})` }}
                />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}

const PAGE_CSS = `
.ro-wrap {
  position: absolute;
  right: 60px;
  bottom: 80px;
  width: 720px;
  height: 160px;
}
.ro-shimmer {
  position: absolute;
  inset: -20px -40px -20px -160px;
  background:
    radial-gradient(ellipse 400px 80px at 20% 50%, rgba(244, 192, 74, .35), transparent 70%),
    radial-gradient(ellipse 250px 60px at 0% 60%, rgba(244, 192, 74, .25), transparent 70%);
  pointer-events: none;
  mix-blend-mode: screen;
  filter: blur(1px);
}
.ro-pill {
  position: relative;
  height: 160px;
  border-radius: 999px;
  background: linear-gradient(180deg, #1a2bb8 0%, #0a113f 100%);
  box-shadow: 0 20px 46px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.22);
  border: 2px solid rgba(255,255,255,.25);
  display: grid;
  grid-template-columns: 220px 2px 1fr 180px;
  align-items: center;
  overflow: hidden;
  padding: 0 20px 0 0;
}
.ro-number {
  font-size: 110px;
  font-weight: 950;
  color: #fff;
  text-align: center;
  letter-spacing: -.05em;
  line-height: 1;
  text-shadow: 0 2px 14px rgba(244, 192, 74, .35);
}
.ro-divider {
  width: 2px;
  height: 70%;
  background: linear-gradient(180deg, transparent 0%, rgba(244, 192, 74, .65) 50%, transparent 100%);
  justify-self: center;
}
.ro-country {
  font-size: 36px;
  font-weight: 900;
  color: #fff;
  letter-spacing: .12em;
  text-transform: uppercase;
  text-align: left;
  padding-left: 28px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ro-heart {
  width: 168px;
  height: 168px;
  justify-self: end;
  margin: -4px 0;
}
`;
