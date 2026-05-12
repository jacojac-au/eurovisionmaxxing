"use client";

import { useEffect, useState } from "react";
import { V3_BASE_CSS, V3_HEART_DEFS, flagUrlV3 } from "@/lib/overlay-v3/shared";

interface Contestant {
  id: string;
  country: string;
  countryCode: string;
  artist: string;
  song: string;
}

interface LiveResp {
  nowPerforming: Contestant | null;
}

interface ActiveResp {
  activeRoom: { id: string } | null;
}

export default function V3SongOverlay() {
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
          <div className="song-wrap">
            <div className="song-pill">
              <div className="song-heart v3-heart">
                <div
                  className="v3-heart__inner"
                  style={{ backgroundImage: `url(${flagUrlV3(c.countryCode)})` }}
                />
              </div>
              <div className="song-body">
                <div className="song-title">{c.artist}</div>
                <div className="song-sub">{c.song}</div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}

const PAGE_CSS = `
.song-wrap {
  position: absolute;
  left: 50%;
  bottom: 110px;
  transform: translateX(-50%);
  width: 1200px;
  height: 150px;
}
.song-pill {
  position: relative;
  height: 150px;
  border-radius: 999px;
  background: var(--v3-white);
  box-shadow: var(--v3-pill-shadow);
  display: grid;
  grid-template-columns: 180px 1fr;
  align-items: center;
  padding: 0 48px 0 28px;
}
.song-heart {
  width: 156px;
  height: 156px;
  margin: -3px 0;
}
.song-body {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding-left: 28px;
  min-width: 0;
}
.song-title {
  font-size: 56px;
  font-weight: 950;
  color: var(--v3-ink);
  line-height: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: -.01em;
}
.song-sub {
  font-size: 30px;
  font-weight: 600;
  color: var(--v3-cobalt);
  line-height: 1.1;
  margin-top: 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
`;
