"use client";

import Link from "next/link";

interface OverlayEntry {
  name: string;
  href: string;
  size: string;
  bg: "transparent" | "branded";
  description: string;
}

const OVERLAYS: OverlayEntry[] = [
  {
    name: "Voting overlay (full-screen)",
    href: "/overlay/voting",
    size: "1920 × 1080",
    bg: "branded",
    description:
      "Standalone broadcast scene. Now-performing card + per-category bars + voter % + running-order strip.",
  },
  {
    name: "All countries — live ranking",
    href: "/overlay/all-countries",
    size: "1920 × 1080",
    bg: "branded",
    description:
      "Full-screen leaderboard during voting, sorted by current avg, top 3 highlighted. Eurovision broadcast aesthetic.",
  },
  {
    name: "Running order — playback view",
    href: "/overlay/running-order",
    size: "1920 × 1080",
    bg: "branded",
    description:
      'Lineup in broadcast running order (not score-sorted). Currently-performing row highlighted with "ON STAGE", upcoming rows dimmed, past rows settled with their score.',
  },
  {
    name: "Final ranking",
    href: "/overlay/ranking",
    size: "1920 × 1080",
    bg: "branded",
    description:
      "Eurovision-points leaderboard with gold/silver/bronze podium. Driven by /api/results — meaningful in announcing/done states.",
  },
  {
    name: "Now-performing lower-third",
    href: "/overlay/now-performing",
    size: "1294 × 170",
    bg: "transparent",
    description: "Country + song + artist + live avg in one bar.",
  },
  {
    name: "CTA banner — vote at",
    href: "/overlay/cta?url=https://your-site.com",
    size: "1294 × 170",
    bg: "transparent",
    description: 'Bold "Vote live at <url>" banner. ?cta= and ?url= override defaults.',
  },
  {
    name: "Just-vote banner (no room context)",
    href: "/overlay/just-vote?url=xyz.com",
    size: "1294 × 170",
    bg: "transparent",
    description:
      'Generic "Just vote @ <url>". No room data — for promo/intermission scenes.',
  },
  {
    name: "Scorecard — average score only",
    href: "/overlay/scorecard",
    size: "400 × 220",
    bg: "transparent",
    description:
      "Just the live-average number, huge. Persists per-contestant across transient nulls + OBS source reloads.",
  },
  {
    name: "Song name only",
    href: "/overlay/song",
    size: "1000 × 140",
    bg: "transparent",
    description: "Wide bar with just song title + artist of the now-performing contestant.",
  },
  {
    name: "QR code",
    href: "/overlay/qr",
    size: "200 × 170",
    bg: "transparent",
    description:
      "Encodes the root URL — viewers scan and auto-join the active room.",
  },
];

export default function OverlayIndex() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-3xl font-bold">OBS overlays</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Every overlay below follows the currently-active room (set in{" "}
        <Link href="/admin" className="underline underline-offset-2 hover:text-foreground">
          /admin
        </Link>
        ). Paste the URL into an OBS Browser Source at the size shown.
      </p>

      <ul className="mt-8 space-y-3">
        {OVERLAYS.map((o) => {
          const url =
            typeof window !== "undefined"
              ? `${window.location.origin}${o.href}`
              : o.href;
          return (
            <li
              key={o.href}
              className="rounded-lg border bg-card p-5 transition hover:border-primary/40"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <div className="flex items-baseline gap-3">
                  <h2 className="text-lg font-semibold">{o.name}</h2>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      o.bg === "branded"
                        ? "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300"
                        : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                    }`}
                  >
                    {o.bg === "branded" ? "Branded BG" : "Transparent"}
                  </span>
                </div>
                <span className="font-mono text-xs text-muted-foreground">
                  Browser Source: {o.size}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {o.description}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Link
                  href={o.href}
                  target="_blank"
                  className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
                >
                  Open ↗
                </Link>
                <code className="break-all rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
                  {url}
                </code>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-10 text-xs text-muted-foreground">
        Need a per-room hard-coded URL (e.g., to test against a specific
        room)? Open{" "}
        <Link href="/admin" className="underline underline-offset-2 hover:text-foreground">
          /admin
        </Link>{" "}
        → click <strong>Control →</strong> on a room → scroll to the OBS
        overlay reference at the bottom of that page.
      </p>
    </main>
  );
}
