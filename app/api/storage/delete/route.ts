import { NextRequest, NextResponse } from "next/server";
import { deleteFilesBatch } from "@/lib/storage/delete";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const { items } = await req.json() as {
    items: Array<{ storage_path: string; url_publica?: string | null }>;
  };
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ ok: true });
  }

  // Usa service role (bypassa RLS) se disponível; senão usa sessão do usuário (auth.uid() satisfaz RLS)
  let storageClient;
  try {
    storageClient = createAdminClient();
  } catch {
    storageClient = await createClient();
  }

  // Uma chamada HTTP por backend (Supabase batch + R2 paralelo) — evita timeout de serverless
  await deleteFilesBatch(items, storageClient);

  return NextResponse.json({ ok: true });
}
