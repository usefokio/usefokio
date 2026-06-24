import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("webmaster_get_stats");
    if (error) {
      console.error("[webmaster/stats] rpc error:", error);
      return NextResponse.json({ error: error.message, detail: error }, { status: 500 });
    }
    return NextResponse.json({ data: data ?? [] });
  } catch (err) {
    console.error("[webmaster/stats] exception:", String(err));
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
