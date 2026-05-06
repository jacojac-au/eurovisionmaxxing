"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRoomRealtime } from "@/hooks/useRoomRealtime";

interface LiveResponse {
  nowPerforming: { id: string } | null;
  aggregate: { avgTotal: number | null } | null;
}

const PERSIST_KEY_PREFIX = "emx_scorecard:";

interface PersistedScore {
  contestantId: string;
  avgTotal: number;
}

/**
 * /room/{id}/overlay/scorecard — OBS Browser Source. Just the live-average
 * number, huge. 400×220, transparent.
 *
 * **Per-contestant persistence.** The displayed value:
 * - Updates whenever a fresh average is computed for the **current**
 *   now-performing contestant.
 * - Persists across transient nulls **for the same contestant** (so a
 *   network blip doesn't blank the screen mid-performance).
 * - **Resets to blank when the now-performing contestant changes** — we
 *   never carry one performer's number into another's slot.
 * - Survives OBS source reloads via localStorage, but only restores if
 *   the persisted contestantId matches what's currently performing.
 */
export default function ScorecardOverlayPage({
  params,
}: {
  params: { id: string };
}) {
  const roomId = params.id;
  const [lastAvg, setLastAvg] = useState<number | null>(null);
  const lastContestantIdRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/rooms/${encodeURIComponent(roomId)}/live`,
        { cache: "no-store" }
      );
      if (!res.ok) return;
      const body = (await res.json()) as LiveResponse;
      const currentId = body.nowPerforming?.id ?? null;
      const previousId = lastContestantIdRef.current;
      const incoming = body.aggregate?.avgTotal ?? null;
      const storageKey = `${PERSIST_KEY_PREFIX}${roomId}`;

      // Contestant changed (or cleared) — reset displayed number until a
      // new average lands for the new contestant.
      if (currentId !== previousId) {
        lastContestantIdRef.current = currentId;
        setLastAvg(null);
        try {
          if (currentId === null) window.localStorage.removeItem(storageKey);
        } catch {
          /* ignore */
        }
      }

      // Update the displayed number when we have a real average for the
      // current contestant.
      if (currentId !== null && incoming !== null) {
        setLastAvg(incoming);
        try {
          const persisted: PersistedScore = {
            contestantId: currentId,
            avgTotal: incoming,
          };
          window.localStorage.setItem(storageKey, JSON.stringify(persisted));
        } catch {
          /* ignore */
        }
      }
    } catch {
      /* keep stale on transient network failure */
    }
  }, [roomId]);

  // Hydrate from localStorage on mount, but only once we know the current
  // contestant — load() handles this by comparing IDs.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(`${PERSIST_KEY_PREFIX}${roomId}`);
      if (raw === null) return;
      const persisted = JSON.parse(raw) as PersistedScore;
      // Optimistically display the stored value; the first load() will
      // either confirm it (same contestant) or reset it (new contestant).
      if (
        typeof persisted.avgTotal === "number" &&
        Number.isFinite(persisted.avgTotal)
      ) {
        setLastAvg(persisted.avgTotal);
        lastContestantIdRef.current = persisted.contestantId ?? null;
      }
    } catch {
      /* ignore parse failures — stale schema */
    }
  }, [roomId]);

  useEffect(() => {
    void load();
  }, [load]);

  useRoomRealtime(roomId, (event) => {
    if (
      event.type === "now_performing" ||
      event.type === "voting_progress" ||
      event.type === "status_changed"
    ) {
      void load();
    }
  });

  useEffect(() => {
    const id = window.setInterval(load, 3000);
    return () => window.clearInterval(id);
  }, [load]);

  // Force transparent body for OBS Browser Source.
  useEffect(() => {
    const prevHtmlBg = document.documentElement.style.background;
    const prevBodyBg = document.body.style.background;
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
    return () => {
      document.documentElement.style.background = prevHtmlBg;
      document.body.style.background = prevBodyBg;
    };
  }, []);

  if (lastAvg === null) return null;

  return (
    <div
      className="fixed left-0 top-0 flex flex-col items-center justify-center font-sans text-white"
      style={{ width: 400, height: 220 }}
    >
      <span className="text-sm font-semibold uppercase tracking-[0.4em] opacity-90">
        Average score
      </span>
      <span className="text-[8rem] font-extrabold tabular-nums leading-none">
        {lastAvg.toFixed(1)}
      </span>
    </div>
  );
}
