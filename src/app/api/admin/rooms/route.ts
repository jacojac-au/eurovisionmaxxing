import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import { createServiceClient } from "@/lib/supabase/server";
import { apiError } from "@/lib/api-errors";
import { createRoom } from "@/lib/rooms/create";
import { generatePin } from "@/lib/pin";
import { VOTING_TEMPLATES } from "@/lib/templates";

const BROADCAST_ADMIN_DISPLAY_NAME = "Broadcast Admin";

function adminGuardFails(): boolean {
  return (
    process.env.NODE_ENV === "production" &&
    process.env.ENABLE_ADMIN_UI !== "1"
  );
}

interface RoomListItem {
  id: string;
  pin: string;
  year: number;
  event: string;
  status: string;
  ownerUserId: string | null;
  ownerDisplayName: string | null;
  memberCount: number;
  nowPerformingId: string | null;
  allowNowPerforming: boolean;
  isActive: boolean;
  createdAt: string;
}

interface RoomRowWithOwner {
  id: string;
  pin: string;
  year: number;
  event: string;
  status: string;
  owner_user_id: string | null;
  now_performing_id: string | null;
  allow_now_performing: boolean;
  is_active: boolean;
  created_at: string;
  users: { display_name: string } | null;
}

/**
 * GET /api/admin/rooms — broadcast-control surface, no auth.
 *
 * Returns every room in the database with summary fields. Locked off in
 * production builds unless ENABLE_ADMIN_UI=1 is set explicitly, so a stray
 * Vercel deploy doesn't expose room control to the world.
 */
export async function GET() {
  if (adminGuardFails()) {
    return apiError("ROOM_NOT_FOUND", "Not found.", 404);
  }

  const supabase = createServiceClient();

  const [roomsQuery, membersQuery] = await Promise.all([
    supabase
      .from("rooms")
      .select(
        "id, pin, year, event, status, owner_user_id, now_performing_id, allow_now_performing, is_active, created_at, users:owner_user_id(display_name)"
      )
      .order("created_at", { ascending: false }),
    supabase.from("room_memberships").select("room_id"),
  ]);

  if (roomsQuery.error) {
    return apiError("INTERNAL_ERROR", "Could not load rooms.", 500);
  }

  const memberCountByRoom = new Map<string, number>();
  for (const row of (membersQuery.data ?? []) as Array<{ room_id: string }>) {
    memberCountByRoom.set(
      row.room_id,
      (memberCountByRoom.get(row.room_id) ?? 0) + 1
    );
  }

  const rooms: RoomListItem[] = (
    (roomsQuery.data ?? []) as unknown as RoomRowWithOwner[]
  ).map((row) => ({
    id: row.id,
    pin: row.pin,
    year: row.year,
    event: row.event,
    status: row.status,
    ownerUserId: row.owner_user_id,
    ownerDisplayName: row.users?.display_name ?? null,
    memberCount: memberCountByRoom.get(row.id) ?? 0,
    nowPerformingId: row.now_performing_id,
    allowNowPerforming: row.allow_now_performing,
    isActive: row.is_active,
    createdAt: row.created_at,
  }));

  const response = NextResponse.json({ rooms }, { status: 200 });
  response.headers.set("Cache-Control", "no-store");
  return response;
}

/**
 * POST /api/admin/rooms — quick-create a room owned by a system
 * "Broadcast Admin" user. Body (all optional):
 *   { year?: number, event?: 'semi1'|'semi2'|'final',
 *     allowNowPerforming?: boolean }
 * Defaults: current year, final, allowNowPerforming=true,
 * announcementMode=instant, Classic template categories.
 */
export async function POST(request: NextRequest) {
  if (adminGuardFails()) {
    return apiError("ROOM_NOT_FOUND", "Not found.", 404);
  }

  let body: { year?: unknown; event?: unknown; allowNowPerforming?: unknown } =
    {};
  try {
    const parsed = await request.json();
    if (typeof parsed === "object" && parsed !== null) body = parsed;
  } catch {
    // Empty body is fine — we'll use defaults.
  }

  const supabase = createServiceClient();

  // Get-or-create the broadcast admin user. Idempotent.
  const adminLookup = await supabase
    .from("users")
    .select("id")
    .eq("display_name", BROADCAST_ADMIN_DISPLAY_NAME)
    .limit(1)
    .maybeSingle();

  if (adminLookup.error) {
    return apiError("INTERNAL_ERROR", "Could not query admin user.", 500);
  }

  let adminUserId = adminLookup.data?.id ?? null;
  if (!adminUserId) {
    const newId = uuidv4();
    // bcrypt hash of a discardable token — this user never logs in interactively;
    // it's a stable owner-of-record for admin-created rooms.
    const tokenHash = await bcrypt.hash(uuidv4(), 4);
    const insertResult = await supabase
      .from("users")
      .insert({
        id: newId,
        display_name: BROADCAST_ADMIN_DISPLAY_NAME,
        avatar_seed: "broadcast-admin",
        rejoin_token_hash: tokenHash,
      })
      .select("id")
      .single();
    if (insertResult.error || !insertResult.data) {
      return apiError("INTERNAL_ERROR", "Could not create admin user.", 500);
    }
    adminUserId = insertResult.data.id;
  }

  const classic = VOTING_TEMPLATES.find((t) => t.id === "classic");
  if (!classic) {
    return apiError("INTERNAL_ERROR", "Classic template missing.", 500);
  }
  const categories = classic.categories.map((c) => ({
    name: c.name,
    weight: c.weight,
    hint: c.hint,
  }));

  const year = typeof body.year === "number" ? body.year : new Date().getFullYear();
  const event =
    typeof body.event === "string" &&
    ["semi1", "semi2", "final"].includes(body.event)
      ? body.event
      : "final";
  const allowNowPerforming =
    typeof body.allowNowPerforming === "boolean"
      ? body.allowNowPerforming
      : true;

  const result = await createRoom(
    {
      year,
      event,
      categories,
      announcementMode: "instant",
      allowNowPerforming,
      userId: adminUserId,
    },
    {
      supabase,
      generateRoomId: uuidv4,
      generatePin,
    }
  );

  if (!result.ok) {
    return apiError(
      result.error.code,
      result.error.message,
      result.status,
      result.error.field
    );
  }

  return NextResponse.json({ room: result.room }, { status: 201 });
}
