import { describe, it, expect, vi } from "vitest";
import {
  getLiveAggregates,
  type GetLiveAggregatesDeps,
} from "@/lib/live/getLiveAggregates";
import type { VotingCategory } from "@/types";

const ROOM_ID = "11111111-2222-4333-8444-555555555555";
const CONTESTANT_ID = "2026-ua";

const categories: VotingCategory[] = [
  { name: "Vocals", weight: 1 },
  { name: "Staging", weight: 2 },
];

interface VoteRow {
  user_id: string;
  scores: Record<string, number | null> | null;
  missed: boolean;
  hot_take: string | null;
}

function makeSupabase(voteRows: VoteRow[], totalVoters: number) {
  return {
    from: vi.fn((table: string) => {
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
      if (table === "room_memberships") {
        return {
          select: vi.fn(() => ({
            eq: vi
              .fn()
              .mockResolvedValue({ count: totalVoters, error: null }),
          })),
        };
      }
      throw new Error(`unexpected table: ${table}`);
    }),
  } as unknown as GetLiveAggregatesDeps["supabase"];
}

describe("getLiveAggregates", () => {
  it("returns nulls and zeros when no votes exist", async () => {
    const supabase = makeSupabase([], 5);
    const result = await getLiveAggregates(
      ROOM_ID,
      CONTESTANT_ID,
      categories,
      { supabase }
    );
    expect(result).toEqual({
      contestantId: CONTESTANT_ID,
      avgPerCategory: { Vocals: null, Staging: null },
      avgTotal: null,
      submittedCount: 0,
      missedCount: 0,
      totalVoters: 5,
      hotTakesCount: 0,
    });
  });

  it("computes per-category and weighted-total averages over submitted votes", async () => {
    // Two voters: 8/6 and 10/4 → cat avg Vocals=9, Staging=5; weighted-per-user
    // (using weights 1,2) = (8+12)/3=6.667 and (10+8)/3=6.0; avgTotal = 6.333
    const supabase = makeSupabase(
      [
        {
          user_id: "u1",
          scores: { Vocals: 8, Staging: 6 },
          missed: false,
          hot_take: null,
        },
        {
          user_id: "u2",
          scores: { Vocals: 10, Staging: 4 },
          missed: false,
          hot_take: null,
        },
      ],
      4
    );
    const result = await getLiveAggregates(
      ROOM_ID,
      CONTESTANT_ID,
      categories,
      { supabase }
    );
    expect(result.submittedCount).toBe(2);
    expect(result.missedCount).toBe(0);
    expect(result.totalVoters).toBe(4);
    expect(result.avgPerCategory.Vocals).toBe(9);
    expect(result.avgPerCategory.Staging).toBe(5);
    expect(result.avgTotal).not.toBeNull();
    expect(result.avgTotal!).toBeCloseTo((20 / 3 + 18 / 3) / 2, 5);
  });

  it("excludes missed votes from averages but counts them in missedCount", async () => {
    const supabase = makeSupabase(
      [
        {
          user_id: "u1",
          scores: { Vocals: 6, Staging: 6 },
          missed: false,
          hot_take: null,
        },
        { user_id: "u2", scores: null, missed: true, hot_take: null },
      ],
      3
    );
    const result = await getLiveAggregates(
      ROOM_ID,
      CONTESTANT_ID,
      categories,
      { supabase }
    );
    expect(result.submittedCount).toBe(1);
    expect(result.missedCount).toBe(1);
    expect(result.avgPerCategory.Vocals).toBe(6);
    expect(result.avgTotal).toBe(6);
  });

  it("counts hot takes from both submitted and missed votes", async () => {
    const supabase = makeSupabase(
      [
        {
          user_id: "u1",
          scores: { Vocals: 5, Staging: 5 },
          missed: false,
          hot_take: "fire",
        },
        { user_id: "u2", scores: null, missed: true, hot_take: "miss but spicy" },
        {
          user_id: "u3",
          scores: { Vocals: 7, Staging: 7 },
          missed: false,
          hot_take: null,
        },
        {
          user_id: "u4",
          scores: { Vocals: 7, Staging: 7 },
          missed: false,
          hot_take: "",
        },
      ],
      4
    );
    const result = await getLiveAggregates(
      ROOM_ID,
      CONTESTANT_ID,
      categories,
      { supabase }
    );
    expect(result.hotTakesCount).toBe(2);
    expect(result.submittedCount).toBe(3);
    expect(result.missedCount).toBe(1);
  });

  it("ignores categories not present on the row", async () => {
    // Only Vocals filled; Staging absent → Vocals avg = 7, Staging avg = null
    // weightedTotal per-user = 7×1 / 1 = 7 (Staging weight not counted because no score).
    const supabase = makeSupabase(
      [
        {
          user_id: "u1",
          scores: { Vocals: 7 },
          missed: false,
          hot_take: null,
        },
      ],
      2
    );
    const result = await getLiveAggregates(
      ROOM_ID,
      CONTESTANT_ID,
      categories,
      { supabase }
    );
    expect(result.submittedCount).toBe(1);
    expect(result.avgPerCategory.Vocals).toBe(7);
    expect(result.avgPerCategory.Staging).toBeNull();
    expect(result.avgTotal).toBe(7);
  });
});
