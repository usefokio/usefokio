import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const WEBMASTER_EMAIL = "usefokio@gmail.com";
const WEBMASTER_ID    = process.env.NEXT_PUBLIC_WEBMASTER_ID ?? "";

export async function GET(request: NextRequest) {
  try {
    // Validate caller via access token in Authorization header
    const authHeader = request.headers.get("authorization");
    const accessToken = authHeader?.replace("Bearer ", "");

    if (!accessToken) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Verify the token and get user info
    const { data: { user }, error: userError } = await admin.auth.getUser(accessToken);
    if (userError || !user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const isWebmaster =
      (WEBMASTER_ID    && user.id    === WEBMASTER_ID) ||
      (WEBMASTER_EMAIL && user.email === WEBMASTER_EMAIL);

    if (!isWebmaster) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { data, error } = await admin.rpc("webmaster_get_stats");
    if (error) {
      console.error("[webmaster/stats]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ data: data ?? [] });
  } catch (err) {
    console.error("[webmaster/stats]", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
