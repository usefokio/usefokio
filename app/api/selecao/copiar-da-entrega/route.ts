import { NextRequest, NextResponse } from "next/server";
import { CopyObjectCommand } from "@aws-sdk/client-s3";
import { createAdminClient } from "@/lib/supabase/admin";
import { fotografoIdAtual } from "@/lib/auth/fotografoAtual";
import { r2, R2_BUCKET, R2_PUBLIC_URL } from "@/lib/storage/r2";
import { uploadFile } from "@/lib/storage/upload";
import { limiteEfetivoMax } from "@/lib/planos";

// Copia fotos de uma galeria de ENTREGA para uma galeria de SELEÇÃO — cópia interna no servidor,
// sem o fotógrafo reenviar nada. Cada foto vira um arquivo NOVO e independente: excluir uma galeria
// nunca afeta a outra, e a contagem do plano segue a regra de sempre (arquivo real = conta).
//
// Chamada em lotes pelo navegador (barra de progresso). Idempotente: o destino de cada foto é fixo
// (<fotografo>/<selecao>/entrega-<id da foto>.<ext>) e foto já copiada é pulada — se a conexão cair,
// é só chamar de novo.
export const maxDuration = 60;

const LOTE_MAX = 25;

type FotoEntrega = {
  id: string; storage_path: string; url_publica: string | null; nome_arquivo: string | null;
  largura: number | null; altura: number | null; tamanho_bytes: number | null; ordem: number | null;
};

function destinoDa(fid: string, selecaoId: string, f: FotoEntrega) {
  const ext = (f.storage_path.split(".").pop() ?? "").toLowerCase();
  return `${fid}/${selecaoId}/entrega-${f.id}.${/^(jpe?g|png|webp)$/.test(ext) ? ext : "jpg"}`;
}

async function copiarArquivo(f: FotoEntrega, destino: string): Promise<string> {
  // Origem no R2 das galerias → cópia direta dentro do bucket (não baixa nada).
  if (R2_BUCKET && R2_PUBLIC_URL && f.url_publica?.startsWith(R2_PUBLIC_URL)) {
    await r2.send(new CopyObjectCommand({
      Bucket: R2_BUCKET,
      CopySource: `${R2_BUCKET}/${f.storage_path.split("/").map(encodeURIComponent).join("/")}`,
      Key: destino,
    }));
    return `${R2_PUBLIC_URL}/${destino}`;
  }
  // Origem fora do R2 (dev, ou fotos antigas no Supabase): baixa no servidor e grava pelo mesmo
  // caminho do upload normal (R2 em produção; Supabase só em dev).
  if (!f.url_publica) throw new Error("foto sem endereço de origem");
  const r = await fetch(f.url_publica);
  if (!r.ok) throw new Error(`origem respondeu ${r.status}`);
  const blob = await r.blob();
  const tipo = blob.type?.startsWith("image/") ? blob.type : "image/jpeg";
  const { url_publica } = await uploadFile(destino, blob, tipo);
  return url_publica;
}

export async function POST(req: NextRequest) {
  const fid = await fotografoIdAtual();
  if (!fid) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const body = await req.json().catch(() => null) as { selecao_id?: string; entrega_id?: string; foto_ids?: string[] } | null;
  const selecaoId = body?.selecao_id;
  const entregaId = body?.entrega_id;
  const fotoIds = (body?.foto_ids ?? []).slice(0, LOTE_MAX);
  if (!selecaoId || !entregaId || fotoIds.length === 0) {
    return NextResponse.json({ error: "selecao_id, entrega_id e foto_ids são obrigatórios" }, { status: 400 });
  }

  const admin = createAdminClient();

  // As duas galerias precisam ser do fotógrafo da requisição.
  const [{ data: sel }, { data: ent }] = await Promise.all([
    admin.from("galerias_selecao").select("fotografo_id").eq("id", selecaoId).maybeSingle(),
    admin.from("galerias_entrega").select("fotografo_id").eq("id", entregaId).maybeSingle(),
  ]);
  if (!sel || !ent || sel.fotografo_id !== fid || ent.fotografo_id !== fid) {
    return NextResponse.json({ error: "sem permissão" }, { status: 403 });
  }

  const { data: fotosData, error: errFotos } = await admin.from("galerias_entrega_fotos")
    .select("id, storage_path, url_publica, nome_arquivo, largura, altura, tamanho_bytes, ordem")
    .eq("galeria_id", entregaId).in("id", fotoIds);
  if (errFotos) return NextResponse.json({ error: errFotos.message }, { status: 500 });
  const fotos = (fotosData ?? []) as FotoEntrega[];

  const destinos = new Map(fotos.map(f => [f.id, destinoDa(fid, selecaoId, f)]));
  const { data: jaCopiadas } = await admin.from("galerias_selecao_fotos")
    .select("storage_path").eq("galeria_id", selecaoId).in("storage_path", [...destinos.values()]);
  const existentes = new Set((jaCopiadas ?? []).map((x: { storage_path: string }) => x.storage_path));
  const pendentes = fotos.filter(f => !existentes.has(destinos.get(f.id)!));

  // Limite de fotos do plano (mesma regra do upload; pula em dev).
  if (pendentes.length > 0 && process.env.NODE_ENV !== "development") {
    const { data: foto } = await admin.from("fotografos")
      .select("plano, total_fotos_usadas, limite_fotos_custom").eq("id", fid).maybeSingle();
    if (foto) {
      const { data: pc } = await admin.from("planos_config")
        .select("limite_fotos").eq("codigo", foto.plano).eq("ativo", true).maybeSingle();
      const limite = limiteEfetivoMax(foto.limite_fotos_custom, pc?.limite_fotos ?? null);
      if (limite !== null && (foto.total_fotos_usadas ?? 0) + pendentes.length > limite) {
        return NextResponse.json({ error: `Limite de ${limite.toLocaleString("pt-BR")} fotos do plano atingido. Faça upgrade em /conta/plano.`, limitReached: true }, { status: 403 });
      }
    }
  }

  const erros: { id: string; erro: string }[] = [];
  const linhas: Record<string, unknown>[] = [];
  const CONCORRENCIA = 5;
  for (let i = 0; i < pendentes.length; i += CONCORRENCIA) {
    await Promise.all(pendentes.slice(i, i + CONCORRENCIA).map(async (f) => {
      const destino = destinos.get(f.id)!;
      try {
        const url = await copiarArquivo(f, destino);
        linhas.push({
          galeria_id: selecaoId, storage_path: destino, url_publica: url, thumbnail_path: null,
          nome_arquivo: f.nome_arquivo, largura: f.largura, altura: f.altura,
          tamanho_bytes: f.tamanho_bytes, resolucao: null, ordem: f.ordem ?? 0,
        });
      } catch (e) {
        erros.push({ id: f.id, erro: e instanceof Error ? e.message : "falha na cópia" });
      }
    }));
  }

  if (linhas.length > 0) {
    const { error } = await admin.from("galerias_selecao_fotos").insert(linhas);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ copiadas: linhas.length, ja_existiam: fotos.length - pendentes.length, erros });
}
