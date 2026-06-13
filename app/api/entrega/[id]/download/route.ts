import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createAdminClient();

  try { await supabase.rpc("increment_download_count", { galeria_id: id }); } catch { /* silencioso */ }

  return NextResponse.json({ ok: true });
}
