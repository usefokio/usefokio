import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verificarWebmaster } from "@/lib/webmaster/auth";
import { uploadFile } from "@/lib/storage/upload";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await verificarWebmaster(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  const updates: Record<string, unknown> = {};
  const ct = req.headers.get("content-type") ?? "";

  if (ct.includes("multipart/form-data")) {
    const form = await req.formData();
    const file      = form.get("file") as File | null;
    const nome      = form.get("nome") as string | null;
    const descricao = form.get("descricao") as string | null;
    const ordem     = form.get("ordem") as string | null;

    if (nome      !== null) updates.nome      = nome.trim();
    if (descricao !== null) updates.descricao = descricao.trim() || null;
    if (ordem     !== null) updates.ordem     = Number(ordem) || 0;

    if (file && file.size > 0) {
      const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12) || "bin";
      const path = `materiais/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      try {
        const { url_publica } = await uploadFile(path, file, "application/octet-stream");
        updates.arquivo_url  = url_publica;
        updates.arquivo_nome = file.name;
      } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : "Erro no upload" }, { status: 500 });
      }
    }
  } else {
    const body = await req.json().catch(() => ({}));
    if (body.nome      !== undefined) updates.nome      = String(body.nome).trim();
    if (body.descricao !== undefined) updates.descricao = body.descricao?.trim() || null;
    if (body.ordem     !== undefined) updates.ordem     = Number(body.ordem) || 0;
    if (body.ativo     !== undefined) updates.ativo     = !!body.ativo;
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("arquivos_download")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, arquivo: data });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await verificarWebmaster(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  const admin = createAdminClient();
  await admin.from("arquivos_download").update({ ativo: false }).eq("id", id);
  return NextResponse.json({ ok: true });
}
