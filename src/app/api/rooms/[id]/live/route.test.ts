import { describe, it, expect, vi, beforeEach } from "vitest";

const VALID_ROOM_ID = "11111111-2222-4333-8444-555555555555";

interface RoomRowShape {
  id: string;
  pin: string;
  year: number;
  event: string;
  categories: Array<{ name: string; weight: number }>;
  owner_user_id: string;
  status: string;
  announcement_mode: string;
  announcement_order: string[] | null;
  announcing_user_id: string | null;
  current_announce_idx: number;
  now_performing_id: string | null;
  allow_now_performing: boolean;
  created_at: string;
}

const baseRoomRow: RoomRowShape = {
  id: VALID_ROOM_ID,
  pin: "AAAAAA",
  year: 2026,
  event: "final",
  categories: [
    { name: "Vocals", weight: 1 },
    { name: "Staging", weight: 2 },
  ],
  owner_user_id: "user-owner",
  status: "voting",
  announcement_mode: "instant",
  announcement_order: null,
  announcing_user_id: null,
  current_announce_idx: 0,
  now_performing_id: "2026-ua",
  allow_now_performing: true,
  created_at: "2026-04-19T12:00:00Z",
};

let roomRow: RoomRowShape | null = baseRoomRow;
let voteRows: Array<{
  user_id: string;
  scores: Record<string, number | null> | null;
  missed: boolean;
  hot_take: string | null;
}> = [];
let memberCount = 0;

vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: () => ({
    from: vi.fn((table: string) => {
      if (table === "rooms") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi
                .fn()
                .mockResolvedValue({ data: roomRow, error: null }),
            })),
          })),
        };
      }
      if (table === "room_memberships") {
        return {
          select: vi.fn((_cols: string, opts?: { count?: string; head?: boolean }) => {
            if (opts?.head) {
              return {
                eq: vi
                  .fn()
                  .mockResolvedValue({ count: memberCount, error: null }),
              };
            }
            return {
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            };
          }),
        };
      }
      if (table === "votes") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi
                .fn()
                .mockResolvedValue({ data: voteRows, error: null }),
            })),
          })),
        };
      }
      throw new Error(`unexpected table: ${table}`);
    }),
  }),
}));

vi.mock("@/lib/contestants", async () => {
  const actual = await vi.importActual<typeof import("@/lib/contestants")>(
    "@/lib/contestants"
  );
  return {
    ...actual,
    fetchContestants: vi.fn().mockResolvedValue([
      {
        id: "2026-ua",
        country: "Ukraine",
        countryCode: "ua",
        flagEmoji: "🇺🇦",
        artist: "TestArtist",
        song: "TestSong",
        runningOrder: 1,
        event: "final",
        year: 2026,
      },
      {
        id: "2026-gb",
        country: "United Kingdom",
        countryCode: "gb",
        flagEmoji: "🇬🇧",
        artist: "Other",
        song: "Other Song",
        runningOrder: 2,
        event: "final",
        year: 2026,
      },
    ]),
  };
});

import { GET } from "@/app/api/rooms/[id]/live/route";
import { NextRequest } from "next/server";

function makeRequest(): NextRequest {
  return new NextRequest(`http://localhost/api/rooms/${VALID_ROOM_ID}/live`);
}

describe("GET /api/rooms/[id]/live", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    roomRow = { ...baseRoomRow };
    voteRows = [];
    memberCount = 0;
  });

  it("returns 200 with nowPerforming and aggregate when a contestant is set", async () => {
    voteRows = [
      {
        user_id: "u1",
        scores: { Vocals: 8, Staging: 6 },
        missed: false,
        hot_take: "spicy",
      },
      {
        user_id: "u2",
        scores: { Vocals: 10, Staging: 4 },
        missed: false,
        hot_take: null,
      },
    ];
    memberCount = 4;

    const res = await GET(makeRequest(), { params: { id: VALID_ROOM_ID } });
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    const body = (await res.json()) as {
      room: { id: string; status: string; categories: unknown[] };
      nowPerforming: { id: string; country: string } | null;
      aggregate: {
        contestantId: string;
        submittedCount: number;
        totalVoters: number;
        hotTakesCount: number;
        avgPerCategory: Record<string, number | null>;
      } | null;
    };
    expect(body.room.id).toBe(VALID_ROOM_ID);
    expect(body.room.status).toBe("voting");
    expect(body.nowPerforming).toMatchObject({ id: "2026-ua", country: "Ukraine" });
    expect(body.aggregate).not.toBeNull();
    expect(body.aggregate!.submittedCount).toBe(2);
    expect(body.aggregate!.totalVoters).toBe(4);
    expect(body.aggregate!.hotTakesCount).toBe(1);
    expect(body.aggregate!.avgPerCategory.Vocals).toBe(9);
  });

  it("returns 200 with nowPerforming=null and aggregate=null when nothing is performing", async () => {
    roomRow = { ...baseRoomRow, now_performing_id: null };
    const res = await GET(makeRequest(), { params: { id: VALID_ROOM_ID } });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      nowPerforming: unknown;
      aggregate: unknown;
    };
    expect(body.nowPerforming).toBeNull();
    expect(body.aggregate).toBeNull();
  });

  it("returns 400 INVALID_ROOM_ID on a malformed id", async () => {
    const res = await GET(makeRequest(), { params: { id: "not-a-uuid" } });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("INVALID_ROOM_ID");
  });

  it("returns 404 ROOM_NOT_FOUND when the room does not exist", async () => {
    roomRow = null;
    const res = await GET(makeRequest(), { params: { id: VALID_ROOM_ID } });
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("ROOM_NOT_FOUND");
  });
});
