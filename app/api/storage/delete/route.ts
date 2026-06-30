import { NextRequest, NextResponse } from "next/server";
import { deleteFile } from "@/lib/storage/delete";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const { items } = await req.json() as {
    items: Array<{ storage_path: string; url_publica?: string | null }>;
  };
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ ok: true });
  }

  // Usa service role (bypassa RLS) se disponível; senão, usa sessão do usuário (auth.uid() satisfaz a policy RLS)
  let storageClient;
  try {
    storageClient = createAdminClient();
  } catch {
    storageClient = await createClient();
  }

  await Promise.allSettled(
    items.map((item) => deleteFile(item.storage_path, item.url_publica, storageClient))
  );
  return NextResponse.json({ ok: true });
}
