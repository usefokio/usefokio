import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verificarWebmaster } from "@/lib/webmaster/auth";
import { uploadFile } from "@/lib/storage/upload";

const KEYS = ["lr_preset_url", "lr_preset_nome", "lr_preset_descricao"];

export async function GET(req: Request) {
  if (!await verificarWebmaster(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const admin = createAdminClient();
  const { data } = await admin.from("sistema_config").select("chave, valor").in("chave", KEYS);
  const map: Record<string, string> = {};
  for (const r of data ?? []) map[r.chave] = r.valor;

  return NextResponse.json({
    url:       map["lr_preset_url"] ?? null,
    nome:      map["lr_preset_nome"] ?? null,
    descricao: map["lr_preset_descricao"] ?? null,
  });
}

export async function POST(req: Request) {
  if (!await verificarWebmaster(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const descricao = (form.get("descricao") as string | null)?.trim() ?? null;

  const admin = createAdminClient();
  const upserts: { chave: string; valor: string }[] = [];

  if (file && file.size > 0) {
    const ext = (file.name.split(".").pop() || "xmp").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12) || "xmp";
    const path = `presets/lightroom-entrega-${Date.now()}.${ext}`;
    try {
      const { url_publica } = await uploadFile(path, file, "application/octet-stream");
      upserts.push({ chave: "lr_preset_url", valor: url_publica });
      upserts.push({ chave: "lr_preset_nome", valor: file.name });
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "Erro no upload" }, { status: 500 });
    }
  }
  if (descricao !== null) upserts.push({ chave: "lr_preset_descricao", valor: descricao });

  if (upserts.length > 0) {
    const { error } = await admin.from("sistema_config").upsert(upserts, { onConflict: "chave" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!await verificarWebmaster(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const admin = createAdminClient();
  await admin.from("sistema_config").delete().in("chave", KEYS);
  return NextResponse.json({ ok: true });
}
