import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";

const WEBMASTER_EMAIL = "usefokio@gmail.com";
const WEBMASTER_ID    = process.env.NEXT_PUBLIC_WEBMASTER_ID ?? "";

export async function GET() {
  try {
    const supabase = await createServerClient();
    const { data: { session } } = await supabase.auth.getSession();
    const isWebmaster = session && (
      (WEBMASTER_ID    && session.user.id    === WEBMASTER_ID) ||
      (WEBMASTER_EMAIL && session.user.email === WEBMASTER_EMAIL)
    );
    if (!isWebmaster) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
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
