import { NextResponse } from "next/server";
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
 * DELETE /api/admin/rooms/{id} — broadcast-control hard delete.
 * Schema FKs cascade memberships, votes, results, awards. Prod-disabled.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  if (adminGuardFails()) {
    return apiError("ROOM_NOT_FOUND", "Not found.", 404);
  }
  if (!UUID_REGEX.test(params.id)) {
    return apiError("INVALID_ROOM_ID", "roomId must be a UUID.", 400, "roomId");
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from("rooms").delete().eq("id", params.id);
  if (error) {
    return apiError("INTERNAL_ERROR", "Could not delete room.", 500);
  }
  return NextResponse.json({ ok: true }, { status: 200 });
}
