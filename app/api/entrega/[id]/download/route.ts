import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const tipo = req.nextUrl.searchParams.get("tipo");
  const supabase = createAdminClient();

  try {
    if (tipo === "drive") {
      await supabase.rpc("increment_drive_download_count", { galeria_id: id });
    } else {
      await supabase.rpc("increment_download_count", { galeria_id: id });
    }
  } catch { /* silencioso */ }

  return NextResponse.json({ ok: true });
}
