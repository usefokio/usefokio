import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fotografoIdAtual } from "@/lib/auth/fotografoAtual";
import { lerCapturadaEm } from "@/lib/fotos/capturaEm";

// Preenche capturada_em (hora da foto pelo EXIF) das fotos já enviadas de uma galeria de seleção ou entrega.
// Lê só o começo do arquivo (o EXIF fica no início do JPEG). Processa um lote por chamada — a tela chama de
// novo enquanto `restantes > 0`. Foto sem EXIF recebe a data do upload, para não ser relida sempre.
export const maxDuration = 60;

const LOTE = 40;
const CONCORRENCIA = 8;
const BYTES = 196_608;

const TABELAS = {
  selecao: { galeria: "galerias_selecao", fotos: "galerias_selecao_fotos" },
  entrega: { galeria: "galerias_entrega", fotos: "galerias_entrega_fotos" },
} as const;

async function lerDoArquivo(url: string): Promise<string | null> {
  try {
    const r = await fetch(url, { headers: { Range: `bytes=0-${BYTES - 1}` } });
    if (!r.ok && r.status !== 206) return null;
    return await lerCapturadaEm(new Uint8Array(await r.arrayBuffer()));
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const fid = await fotografoIdAtual();
  if (!fid) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { tipo?: string; galeria_id?: string } | null;
  const t = body?.tipo === "selecao" || body?.tipo === "entrega" ? TABELAS[body.tipo] : null;
  if (!t || !body?.galeria_id) return NextResponse.json({ error: "tipo e galeria_id são obrigatórios" }, { status: 400 });

  const admin = createAdminClient();
  const { data: g } = await admin.from(t.galeria).select("fotografo_id").eq("id", body.galeria_id).maybeSingle();
  if (!g || g.fotografo_id !== fid) return NextResponse.json({ error: "sem permissão" }, { status: 403 });

  const { data: fotos } = await admin.from(t.fotos)
    .select("id, url_publica, created_at").eq("galeria_id", body.galeria_id).is("capturada_em", null).limit(LOTE);
  const lista = (fotos ?? []) as { id: string; url_publica: string | null; created_at: string }[];

  let cursor = 0;
  let comExif = 0;
  async function proximo(): Promise<void> {
    const f = lista[cursor++];
    if (!f) return;
    const hora = f.url_publica ? await lerDoArquivo(f.url_publica) : null;
    if (hora) comExif++;
    await admin.from(t!.fotos).update({ capturada_em: hora ?? f.created_at }).eq("id", f.id);
    return proximo();
  }
  await Promise.all(Array.from({ length: Math.min(CONCORRENCIA, lista.length) }, proximo));

  const { count } = await admin.from(t.fotos).select("id", { count: "exact", head: true })
    .eq("galeria_id", body.galeria_id).is("capturada_em", null);
  return NextResponse.json({ ok: true, processadas: lista.length, comExif, restantes: count ?? 0 });
}
