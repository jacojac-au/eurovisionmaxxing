/**
 * Shared helpers + CSS for V3 broadcast overlays — Vienna 2026 look.
 *
 * Visual language: deep cobalt-navy field + golden particle texture
 * (eurovision.com/Vienna 2026 brand), white stadium pills with deep-navy
 * type, heart-shaped flag chips, golden ribbon side decorations, glossy
 * lower-thirds with navy + gold accents. All overlays sized for 1920×1080
 * OBS browser sources, matching the V2 dimensions for drop-in upgrade.
 */

export const V3_INK = "#101a64";
export const V3_INK_DEEP = "#0a113f";
export const V3_GOLD = "#f4c04a";
export const V3_GOLD_SOFT = "#ffe082";
export const V3_COBALT = "#1c2db8";

/** Flag image URL — official Eurovision flags downloaded to public/flags/v3/. */
export function flagUrlV3(countryCode: string | undefined): string {
  if (!countryCode) return "";
  return `/flags/v3/${countryCode.toLowerCase()}.svg`;
}

/** Heart clip-path used by .v3-heart elements. Rendered once per page. */
export const V3_HEART_DEFS = `
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <defs>
    <clipPath id="v3-heart" clipPathUnits="objectBoundingBox">
      <path d="M0.5,0.95 C0.5,0.95 0.06,0.68 0.06,0.34 C0.06,0.15 0.2,0.06 0.32,0.06 C0.42,0.06 0.5,0.14 0.5,0.26 C0.5,0.14 0.58,0.06 0.68,0.06 C0.8,0.06 0.94,0.15 0.94,0.34 C0.94,0.68 0.5,0.95 0.5,0.95 Z" />
    </clipPath>
  </defs>
</svg>
`;

export const V3_BASE_CSS = `
:root {
  --v3-ink: ${V3_INK};
  --v3-ink-deep: ${V3_INK_DEEP};
  --v3-gold: ${V3_GOLD};
  --v3-gold-soft: ${V3_GOLD_SOFT};
  --v3-cobalt: ${V3_COBALT};
  --v3-white: #ffffff;
  --v3-pill-shadow: 0 18px 44px rgba(7, 12, 50, .55), inset 0 2px 0 rgba(255,255,255,.55);
  --v3-pill-border: 2px solid rgba(255,255,255,.85);
}
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: var(--v3-ink);
}

.v3-stage {
  position: fixed;
  inset: 0;
  width: 1920px;
  height: 1080px;
  overflow: hidden;
}

/* Full-bleed Vienna 2026 backdrop: gold particle texture sandwiched
   between deep-navy fades and cobalt side curtains. */
.v3-bg {
  background:
    linear-gradient(90deg, #050c3a 0%, transparent 14%, transparent 86%, #050c3a 100%),
    radial-gradient(ellipse at 50% 50%, rgba(8, 14, 60, .45) 0%, rgba(5, 8, 35, .92) 75%),
    url("/overlay/v3/background.png") center/cover no-repeat,
    #050c3a;
}
.v3-curtain {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(90deg,
      rgba(28, 45, 184, .85) 0%,
      rgba(28, 45, 184, .55) 4%,
      rgba(10, 17, 63, 0) 14%,
      rgba(10, 17, 63, 0) 86%,
      rgba(28, 45, 184, .55) 96%,
      rgba(28, 45, 184, .85) 100%);
  mix-blend-mode: normal;
}

/* Heart-shaped flag chip primitive. The flag fills the heart via clip-path
   (defined globally by V3_HEART_DEFS). White outer puck gives the heart its
   crisp rim; subtle drop shadow lifts it off the dark background. */
.v3-heart {
  position: relative;
  background: #fff;
  -webkit-clip-path: url(#v3-heart);
  clip-path: url(#v3-heart);
  filter: drop-shadow(0 6px 14px rgba(0,0,0,.45));
  flex: 0 0 auto;
  aspect-ratio: 1 / 1;
}
.v3-heart__inner {
  position: absolute;
  inset: 8%;
  -webkit-clip-path: url(#v3-heart);
  clip-path: url(#v3-heart);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

/* Stadium pill primitive — white body with deep-navy type. */
.v3-pill {
  display: flex;
  align-items: stretch;
  background: var(--v3-white);
  border-radius: 999px;
  box-shadow: var(--v3-pill-shadow);
  overflow: hidden;
  position: relative;
}
.v3-pill__body {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0 32px;
  min-width: 0;
}
.v3-pill__title {
  font-weight: 900;
  letter-spacing: .04em;
  color: var(--v3-ink);
  line-height: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.v3-pill__sub {
  color: var(--v3-cobalt);
  line-height: 1.1;
  margin-top: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Golden ribbon shimmer for full-screen layouts — decorative scribbles
   mimicking the gold-silk swirls in the brand artwork. */
.v3-shimmer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(ellipse 800px 280px at 18% 88%, rgba(244, 192, 74, .22), transparent 70%),
    radial-gradient(ellipse 800px 280px at 82% 12%, rgba(244, 192, 74, .18), transparent 70%);
  mix-blend-mode: screen;
}
`;
