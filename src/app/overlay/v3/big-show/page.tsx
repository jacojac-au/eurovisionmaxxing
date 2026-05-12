"use client";

import { useEffect, useState } from "react";
import { V3_BASE_CSS, V3_HEART_DEFS, flagUrlV3 } from "@/lib/overlay-v3/shared";

interface Card {
  countryCode: string;
  country: string;
  venue: string;
  date: string;
}

const DEFAULTS: Card[] = [
  { countryCode: "AT", country: "Austria", venue: "Wiener Stadthalle, Vienna", date: "Semi-final 1" },
  { countryCode: "AT", country: "Austria", venue: "Wiener Stadthalle, Vienna", date: "Semi-final 2" },
  { countryCode: "AT", country: "Austria", venue: "Wiener Stadthalle, Vienna", date: "Grand Final" },
];

/**
 * /overlay/v3/big-show — Vienna 2026 host-city poster. Edit defaults
 * above or override via query params: ?c1=AT&n1=Austria&v1=Wiener Stadthalle, Vienna&d1=Semi-final 1
 * (and c2..c4 / n2..n4 / etc).
 */
export default function V3BigShow() {
  const [cards, setCards] = useState<Card[]>(DEFAULTS);

  useEffect(() => {
    const u = new URL(window.location.href);
    const next = DEFAULTS.map((d, i) => {
      const n = i + 1;
      return {
        countryCode: u.searchParams.get(`c${n}`) ?? d.countryCode,
        country: u.searchParams.get(`n${n}`) ?? d.country,
        venue: u.searchParams.get(`v${n}`) ?? d.venue,
        date: u.searchParams.get(`d${n}`) ?? d.date,
      };
    });
    setCards(next);
  }, []);

  useEffect(() => {
    document.documentElement.style.background = "#050c3a";
    document.body.style.background = "#050c3a";
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: V3_BASE_CSS + PAGE_CSS }} />
      <div dangerouslySetInnerHTML={{ __html: V3_HEART_DEFS }} />
      <div className="v3-stage v3-bg">
        <div className="v3-curtain" />
        <div className="v3-shimmer" />
        <div className="bs-eyebrow">eurovision · song contest</div>
        <h1 className="bs-title">VIENNA 2026</h1>
        <div className="bs-grid">
          {cards.map((c, i) => (
            <div className="bs-card" key={i}>
              <span className="bs-num">{i + 1}</span>
              <div className="bs-pill">
                <div className="bs-heart v3-heart">
                  <div
                    className="v3-heart__inner"
                    style={{ backgroundImage: `url(${flagUrlV3(c.countryCode)})` }}
                  />
                </div>
                <div className="bs-body">
                  <span className="bs-country">{c.country.toUpperCase()}</span>
                  <span className="bs-venue">{c.venue}</span>
                  <span className="bs-date">{c.date.toUpperCase()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

const PAGE_CSS = `
.bs-eyebrow {
  position: absolute;
  left: 200px;
  top: 110px;
  font-size: 28px;
  font-weight: 800;
  letter-spacing: .42em;
  text-transform: lowercase;
  color: var(--v3-gold-soft);
  z-index: 2;
}
.bs-title {
  position: absolute;
  left: 200px;
  top: 150px;
  margin: 0;
  font-size: 180px;
  font-weight: 950;
  letter-spacing: -.04em;
  color: #fff;
  line-height: .92;
  text-shadow: 0 6px 40px rgba(244, 192, 74, .35);
  z-index: 2;
}
.bs-grid {
  position: absolute;
  inset: 420px 200px 110px 200px;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 36px;
  z-index: 2;
}
.bs-card { position: relative; }
.bs-num {
  position: absolute;
  left: -30px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 110px;
  font-weight: 950;
  color: rgba(244, 192, 74, .35);
  z-index: 0;
}
.bs-pill {
  position: relative;
  z-index: 1;
  height: 160px;
  border-radius: 999px;
  background: var(--v3-white);
  box-shadow: 0 14px 38px rgba(8, 14, 60, .55), inset 0 1px 0 rgba(255,255,255,.55);
  margin-left: 60px;
  display: grid;
  grid-template-columns: 180px 1fr;
  align-items: center;
  padding-right: 28px;
}
.bs-heart {
  width: 168px;
  height: 168px;
  margin: -4px 0 -4px 6px;
}
.bs-body {
  padding: 0 24px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  color: var(--v3-ink);
  min-width: 0;
}
.bs-country { font-size: 32px; font-weight: 950; letter-spacing: .04em; line-height: 1; }
.bs-venue { font-size: 22px; font-weight: 700; letter-spacing: .01em; line-height: 1.1; color: var(--v3-cobalt); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bs-date { font-size: 16px; font-weight: 900; letter-spacing: .18em; color: var(--v3-gold); line-height: 1; margin-top: 4px; }
`;
