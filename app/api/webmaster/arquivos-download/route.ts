import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verificarWebmaster } from "@/lib/webmaster/auth";
import { uploadFile } from "@/lib/storage/upload";

export async function GET(req: Request) {
  if (!await verificarWebmaster(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const admin = createAdminClient();
  const { data } = await admin
    .from("arquivos_download")
    .select("*")
    .order("ordem")
    .order("created_at");

  return NextResponse.json({ arquivos: data ?? [] });
}

export async function POST(req: Request) {
  if (!await verificarWebmaster(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const form = await req.formData();
  const file      = form.get("file") as File | null;
  const nome      = (form.get("nome") as string | null)?.trim() ?? "";
  const descricao = (form.get("descricao") as string | null)?.trim() || null;
  const ordem     = Number(form.get("ordem") ?? 0) || 0;

  if (!nome)               return NextResponse.json({ error: "nome obrigatório" }, { status: 400 });
  if (!file || file.size === 0) return NextResponse.json({ error: "arquivo obrigatório" }, { status: 400 });

  const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12) || "bin";
  const path = `materiais/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  let arquivo_url: string;
  try {
    ({ url_publica: arquivo_url } = await uploadFile(path, file, "application/octet-stream"));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro no upload" }, { status: 500 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("arquivos_download")
    .insert({ nome, descricao, arquivo_url, arquivo_nome: file.name, ordem, ativo: true })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, arquivo: data });
}
