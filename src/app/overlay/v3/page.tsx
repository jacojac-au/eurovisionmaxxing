import Link from "next/link";

const ITEMS = [
  { slug: "song", label: "Now-performing lower-third" },
  { slug: "running-order", label: "Running-order tile (current country)" },
  { slug: "all-countries", label: "Tonight's Lineup (3-column heart board)" },
  { slug: "voting", label: "Voting lower-third (CTA + country)" },
  { slug: "scorecard", label: "Country + score pill" },
  { slug: "scoreboard", label: "Final ranking scoreboard (podium + 2-col)" },
  { slug: "qualifying", label: "Qualifying split (still / qualified)" },
  { slug: "big-show", label: "Big Show — host city poster" },
];

export default function V3Index() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="mb-2 text-3xl font-bold">V3 Overlays — Vienna 2026</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Each opens at 1920×1080. Add as an OBS Browser Source at that resolution. Sizes match V2 for drop-in replacement.
      </p>
      <ul className="space-y-2">
        {ITEMS.map((it) => (
          <li
            key={it.slug}
            className="flex items-center justify-between gap-4 rounded-lg border p-3"
          >
            <span className="text-sm">{it.label}</span>
            <Link
              className="font-mono text-xs underline opacity-80 hover:opacity-100"
              href={`/overlay/v3/${it.slug}`}
              target="_blank"
            >
              /overlay/v3/{it.slug}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
