import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { apiError } from "@/lib/api-errors";

/**
 * GET /api/active-room — public, no auth.
 *
 * Returns the room that's currently flagged active (one-row constraint
 * enforced by the partial unique index `rooms_one_active`), or null if
 * no room is active. Drives the roomless overlay routes and the root
 * page redirect.
 */
export async function GET() {
  const supabase = createServiceClient();
  const query = await supabase
    .from("rooms")
    .select("id, pin, status, year, event")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (query.error) {
    return apiError("INTERNAL_ERROR", "Could not load active room.", 500);
  }

  const response = NextResponse.json(
    {
      activeRoom: query.data
        ? {
            id: query.data.id,
            pin: query.data.pin,
            status: query.data.status,
            year: query.data.year,
            event: query.data.event,
          }
        : null,
    },
    { status: 200 }
  );
  response.headers.set("Cache-Control", "no-store");
  return response;
}
