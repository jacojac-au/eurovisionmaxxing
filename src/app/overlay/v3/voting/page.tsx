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

export default function V3VotingOverlay() {
  const [c, setC] = useState<Contestant | null>(null);
  const [cta, setCta] = useState<{ left: string; body: string }>({
    left: "ONLINE ESC.VOTE",
    body: "GO TO ESC.VOTE TO CAST YOUR POINTS",
  });

  useEffect(() => {
    const url = new URL(window.location.href);
    const left = url.searchParams.get("left");
    const body = url.searchParams.get("body");
    if (left || body) setCta({ left: left ?? cta.left, body: body ?? cta.body });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        <div className="vot-strip">
          <div className="vot-left">
            <div className="vot-left-inner">
              <div className="vot-left-eyebrow">{cta.left}</div>
              <div className="vot-left-body">{cta.body}</div>
            </div>
          </div>
          {c ? (
            <div className="vot-right">
              <div className="vot-right-num">{String(c.runningOrder).padStart(2, "0")}</div>
              <div className="vot-right-country">{c.country.toUpperCase()}</div>
              <div className="vot-right-heart v3-heart">
                <div
                  className="v3-heart__inner"
                  style={{ backgroundImage: `url(${flagUrlV3(c.countryCode)})` }}
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}

const PAGE_CSS = `
.vot-strip {
  position: absolute;
  left: 60px;
  right: 60px;
  bottom: 70px;
  display: grid;
  grid-template-columns: 1fr 600px;
  gap: 24px;
  align-items: stretch;
}
.vot-left {
  position: relative;
  padding: 3px;
  border-radius: 999px;
  background: linear-gradient(135deg, #f4c04a 0%, #fff5c8 35%, #f4c04a 70%, #b88a25 100%);
  box-shadow: 0 18px 42px rgba(0,0,0,.55);
}
.vot-left-inner {
  height: 130px;
  border-radius: 999px;
  background: linear-gradient(180deg, #1a2bb8 0%, #0a113f 100%);
  padding: 18px 56px;
  color: #fff;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.vot-left-eyebrow {
  font-size: 26px;
  font-weight: 900;
  letter-spacing: .18em;
  text-transform: uppercase;
  color: var(--v3-gold-soft);
  opacity: .95;
}
.vot-left-body {
  font-size: 32px;
  font-weight: 700;
  letter-spacing: .04em;
  margin-top: 6px;
  text-transform: uppercase;
}
.vot-right {
  position: relative;
  height: 130px;
  border-radius: 999px;
  background: linear-gradient(180deg, #1a2bb8 0%, #0a113f 100%);
  box-shadow: 0 18px 42px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.22);
  border: 3px solid var(--v3-gold);
  display: grid;
  grid-template-columns: 130px 1fr 150px;
  align-items: center;
  overflow: visible;
  padding-right: 8px;
}
.vot-right-num {
  font-size: 78px;
  font-weight: 950;
  color: #fff;
  text-align: center;
  letter-spacing: -.05em;
  line-height: 1;
}
.vot-right-country {
  font-size: 28px;
  font-weight: 900;
  color: #fff;
  letter-spacing: .14em;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.vot-right-heart {
  width: 138px;
  height: 138px;
  justify-self: end;
  margin: -4px 4px -4px 0;
}
`;
