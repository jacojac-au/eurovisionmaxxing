"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "@/lib/session";

interface ActiveRoomResponse {
  activeRoom: {
    id: string;
    pin: string;
    status: string;
    year: number;
    event: string;
  } | null;
}

type Phase =
  | { kind: "loading" }
  | { kind: "no_active" }
  | { kind: "joining"; roomId: string }
  | { kind: "error"; message: string };

/**
 * Root entry point — single-active-room flow. Behaviour:
 *
 * 1. No session → redirect to /onboard?next=/ so we land back here after.
 * 2. Session + active room → join (idempotent) and redirect to that room.
 * 3. Session + no active room → "Waiting for the show…" copy, polls every
 *    3s and auto-redirects when the host marks a room. No admin chrome
 *    shown to guests.
 */
export default function HomePage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const sessionRef = useRef<ReturnType<typeof getSession>>(null);

  const tryActivate = useCallback(async () => {
    const session = sessionRef.current;
    if (!session) return;
    try {
      const res = await fetch("/api/active-room", { cache: "no-store" });
      if (!res.ok) {
        setPhase({ kind: "error", message: `HTTP ${res.status}` });
        return;
      }
      const body = (await res.json()) as ActiveRoomResponse;
      if (!body.activeRoom) {
        setPhase((prev) =>
          prev.kind === "no_active" ? prev : { kind: "no_active" }
        );
        return;
      }
      const roomId = body.activeRoom.id;
      setPhase({ kind: "joining", roomId });

      // Idempotent join — the room page handles auth errors with a clearer
      // recovery path than the home page.
      try {
        await fetch(`/api/rooms/${encodeURIComponent(roomId)}/join`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: session.userId }),
        });
      } catch {
        /* swallow */
      }
      router.replace(`/room/${encodeURIComponent(roomId)}`);
    } catch (e) {
      setPhase({ kind: "error", message: String(e) });
    }
  }, [router]);

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.replace("/onboard?next=/");
      return;
    }
    sessionRef.current = session;
    void tryActivate();
    // Poll while no active room — guests on the empty-state screen jump in
    // automatically once the host marks one.
    const id = window.setInterval(() => {
      void tryActivate();
    }, 3000);
    return () => window.clearInterval(id);
  }, [router, tryActivate]);

  if (phase.kind === "loading" || phase.kind === "joining") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
        <p className="text-lg text-muted-foreground motion-safe:animate-shimmer">
          {phase.kind === "joining" ? "Joining the room…" : "…"}
        </p>
      </main>
    );
  }

  if (phase.kind === "error") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-6 py-12 text-center">
        <p className="mb-4 text-xl text-destructive">
          Couldn&apos;t load the active room.
        </p>
        <p className="text-sm text-muted-foreground">{phase.message}</p>
      </main>
    );
  }

  // No active room — clean guest-facing copy, no admin link.
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="max-w-md text-center">
        <h1 className="mb-3 text-3xl font-bold">Waiting for the show…</h1>
        <p className="text-muted-foreground">
          Hang tight — this page will jump you in as soon as the show
          starts.
        </p>
      </div>
    </main>
  );
}
