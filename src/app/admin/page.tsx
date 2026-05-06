"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface RoomListItem {
  id: string;
  pin: string;
  year: number;
  event: string;
  status: string;
  ownerDisplayName: string | null;
  memberCount: number;
  nowPerformingId: string | null;
  allowNowPerforming: boolean;
  isActive: boolean;
  createdAt: string;
}

const CURRENT_YEAR = new Date().getFullYear();

export default function AdminRoomsPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<RoomListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [year, setYear] = useState<number>(CURRENT_YEAR);
  const [eventType, setEventType] = useState<string>("final");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/rooms", { cache: "no-store" });
      if (res.status === 404) {
        setError("Admin UI is disabled in this environment.");
        return;
      }
      if (!res.ok) {
        setError(`HTTP ${res.status}`);
        return;
      }
      const body = (await res.json()) as { rooms: RoomListItem[] };
      setError(null);
      setRooms(body.rooms);
    } catch (e) {
      setError(String(e));
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(load, 5000);
    return () => window.clearInterval(id);
  }, [load]);

  const createRoom = useCallback(async () => {
    setBusy("__create__");
    try {
      const res = await fetch("/api/admin/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, event: eventType }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        room?: { id: string };
        error?: { code: string; message: string };
      };
      if (!res.ok || !body.room) {
        setError(
          body.error
            ? `${body.error.code}: ${body.error.message}`
            : `HTTP ${res.status}`
        );
        return;
      }
      router.push(`/admin/${body.room.id}`);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(null);
    }
  }, [year, eventType, router]);

  const setActive = useCallback(
    async (id: string | null) => {
      setBusy(id ? `__activate_${id}__` : "__activate_clear__");
      try {
        const res = await fetch("/api/admin/active-room", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId: id }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            error?: { code: string; message: string };
          };
          setError(
            body.error
              ? `${body.error.code}: ${body.error.message}`
              : `HTTP ${res.status}`
          );
          return;
        }
        await load();
      } catch (e) {
        setError(String(e));
      } finally {
        setBusy(null);
      }
    },
    [load]
  );

  const deleteRoom = useCallback(
    async (id: string, pin: string) => {
      if (
        !window.confirm(
          `Delete room ${pin}? This wipes all members, votes, results, and awards.`
        )
      ) {
        return;
      }
      setBusy(id);
      try {
        const res = await fetch(
          `/api/admin/rooms/${encodeURIComponent(id)}`,
          { method: "DELETE" }
        );
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            error?: { code: string; message: string };
          };
          setError(
            body.error
              ? `${body.error.code}: ${body.error.message}`
              : `HTTP ${res.status}`
          );
          return;
        }
        await load();
      } catch (e) {
        setError(String(e));
      } finally {
        setBusy(null);
      }
    },
    [load]
  );

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="mb-2 text-3xl font-bold">Broadcast control</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        All rooms in the database. No auth — local-only. Auto-refreshes every
        5 s.
      </p>

      <div className="mb-8 flex flex-wrap items-end gap-3 rounded-lg border border-dashed p-4">
        <div className="flex flex-col">
          <label className="text-xs uppercase tracking-wider opacity-70">
            Year
          </label>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            min={2000}
            max={CURRENT_YEAR}
            className="w-24 rounded border bg-background px-2 py-1.5 text-sm"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs uppercase tracking-wider opacity-70">
            Event
          </label>
          <select
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            className="rounded border bg-background px-2 py-1.5 text-sm"
          >
            <option value="final">Grand final</option>
            <option value="semi1">Semi-final 1</option>
            <option value="semi2">Semi-final 2</option>
          </select>
        </div>
        <button
          type="button"
          onClick={createRoom}
          disabled={busy !== null}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {busy === "__create__" ? "Creating…" : "+ New room"}
        </button>
        <p className="ml-auto text-xs text-muted-foreground">
          Defaults: Classic template, instant announcement, allow-now-performing
          on. Lobby state — start voting from the room page or here.
        </p>
      </div>

      {error && (
        <p className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {rooms === null && !error && (
        <p className="text-muted-foreground">Loading…</p>
      )}

      {rooms !== null && rooms.length === 0 && (
        <p className="text-muted-foreground">No rooms yet.</p>
      )}

      {rooms !== null && rooms.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left">
                <th className="px-3 py-2">Active</th>
                <th className="px-3 py-2">PIN</th>
                <th className="px-3 py-2">Year / Event</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Owner</th>
                <th className="px-3 py-2 text-right">Members</th>
                <th className="px-3 py-2">Now performing?</th>
                <th className="px-3 py-2">Allow toggle</th>
                <th className="px-3 py-2">Created</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((r) => (
                <tr
                  key={r.id}
                  className={`border-t ${
                    r.isActive ? "bg-emerald-500/10" : ""
                  }`}
                >
                  <td className="px-3 py-2">
                    {r.isActive ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 motion-safe:animate-pulse" />
                        LIVE
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setActive(r.id)}
                        disabled={busy !== null}
                        className="rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-wider hover:bg-muted disabled:opacity-50"
                      >
                        {busy === `__activate_${r.id}__`
                          ? "Activating…"
                          : "Make active"}
                      </button>
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono">{r.pin}</td>
                  <td className="px-3 py-2">
                    {r.year} {r.event}
                  </td>
                  <td className="px-3 py-2">
                    <StatusPill status={r.status} />
                  </td>
                  <td className="px-3 py-2">
                    {r.ownerDisplayName ?? <span className="opacity-50">—</span>}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {r.memberCount}
                  </td>
                  <td className="px-3 py-2">
                    {r.nowPerformingId ? (
                      <code className="text-xs">{r.nowPerformingId}</code>
                    ) : (
                      <span className="opacity-50">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {r.allowNowPerforming ? "yes" : "no"}
                  </td>
                  <td className="px-3 py-2 text-xs opacity-70">
                    {formatRelative(r.createdAt)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/admin/${r.id}`}
                        className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
                      >
                        Control →
                      </Link>
                      <button
                        type="button"
                        onClick={() => deleteRoom(r.id, r.pin)}
                        disabled={busy !== null}
                        className="rounded-md border border-destructive/50 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50"
                      >
                        {busy === r.id ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "voting"
      ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
      : status === "lobby"
      ? "bg-blue-500/20 text-blue-700 dark:text-blue-300"
      : status === "announcing"
      ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
      : status === "done"
      ? "bg-slate-500/20 text-slate-700 dark:text-slate-300"
      : "bg-muted text-muted-foreground";
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}
    >
      {status}
    </span>
  );
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.round(ms / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  return `${day}d ago`;
}
