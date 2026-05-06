import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { apiError } from "@/lib/api-errors";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function adminGuardFails(): boolean {
  return (
    process.env.NODE_ENV === "production" &&
    process.env.ENABLE_ADMIN_UI !== "1"
  );
}

/**
 * POST /api/admin/active-room — broadcast control: pick which room is the
 * "live" one for overlay routes + root entry point. Body { roomId } or
 * { roomId: null } to clear.
 *
 * The partial unique index `rooms_one_active` enforces "only one active",
 * so we have to clear the previous active in the same transaction. We do
 * that with two sequential updates: clear-all-active, then set-this-one.
 * Acceptable race window is single-admin so no real lock needed.
 */
export async function POST(request: NextRequest) {
  if (adminGuardFails()) {
    return apiError("ROOM_NOT_FOUND", "Not found.", 404);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("INVALID_BODY", "Body must be JSON.", 400);
  }
  if (typeof body !== "object" || body === null) {
    return apiError("INVALID_BODY", "Body must be an object.", 400);
  }

  const input = body as { roomId?: unknown };
  const target =
    input.roomId === null
      ? null
      : typeof input.roomId === "string" && UUID_REGEX.test(input.roomId)
      ? input.roomId
      : undefined;
  if (target === undefined) {
    return apiError(
      "INVALID_ROOM_ID",
      "roomId must be a UUID or null.",
      400,
      "roomId"
    );
  }

  const supabase = createServiceClient();

  // Clear all currently-active rooms first (the unique index won't let us
  // have two true at once anyway).
  const clearResult = await supabase
    .from("rooms")
    .update({ is_active: false })
    .eq("is_active", true);
  if (clearResult.error) {
    return apiError("INTERNAL_ERROR", "Could not clear active room.", 500);
  }

  if (target === null) {
    return NextResponse.json({ activeRoomId: null }, { status: 200 });
  }

  const setResult = await supabase
    .from("rooms")
    .update({ is_active: true })
    .eq("id", target)
    .select("id")
    .maybeSingle();
  if (setResult.error || !setResult.data) {
    return apiError(
      "ROOM_NOT_FOUND",
      "Room to mark active was not found.",
      404
    );
  }
  return NextResponse.json({ activeRoomId: setResult.data.id }, { status: 200 });
}
