import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  try { await supabase.rpc("increment_download_count", { galeria_id: id }); } catch { /* silencioso */ }

  return NextResponse.json({ ok: true });
}
