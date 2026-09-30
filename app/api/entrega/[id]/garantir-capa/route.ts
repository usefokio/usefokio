import { NextRequest, NextResponse } from "next/server";
import { CopyObjectCommand } from "@aws-sdk/client-s3";
import { createAdminClient } from "@/lib/supabase/admin";
import { fotografoIdAtual } from "@/lib/auth/fotografoAtual";
import { r2, R2_BUCKET, R2_PUBLIC_URL } from "@/lib/storage/r2";
import { uploadFile } from "@/lib/storage/upload";

// Garante que a galeria de entrega tenha capa PRÓPRIA (arquivo capa.jpg independente das fotos).
// Galerias antigas não tinham: a listagem usava a 1ª foto como capa "emprestada", e excluir as fotos
// apagava a capa junto. Chamada antes de qualquer exclusão de fotos e pela listagem (autocorreção).
// Idempotente: se já tem capa, não faz nada.
export const maxDuration = 60;

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const fid = await fotografoIdAtual();
  if (!fid) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const admin = createAdminClient();
  const { data: g } = await admin.from("galerias_entrega").select("fotografo_id, foto_capa_url").eq("id", id).maybeSingle();
  if (!g || g.fotografo_id !== fid) return NextResponse.json({ error: "sem permissão" }, { status: 403 });
  if (g.foto_capa_url) return NextResponse.json({ ok: true, capa: g.foto_capa_url });

  const { data: foto } = await admin.from("galerias_entrega_fotos")
    .select("storage_path, url_publica").eq("galeria_id", id)
    .order("ordem").order("created_at").limit(1).maybeSingle();
  if (!foto) return NextResponse.json({ ok: true, capa: null });

  const destino = `entrega/${fid}/${id}/capa.jpg`;
  try {
    let url: string;
    if (R2_BUCKET && R2_PUBLIC_URL && foto.url_publica?.startsWith(R2_PUBLIC_URL)) {
      await r2.send(new CopyObjectCommand({
        Bucket: R2_BUCKET,
        CopySource: `${R2_BUCKET}/${foto.storage_path.split("/").map(encodeURIComponent).join("/")}`,
        Key: destino,
      }));
      url = `${R2_PUBLIC_URL}/${destino}`;
    } else {
      if (!foto.url_publica) throw new Error("foto sem endereço de origem");
      const r = await fetch(foto.url_publica);
      if (!r.ok) throw new Error(`origem respondeu ${r.status}`);
      ({ url_publica: url } = await uploadFile(destino, await r.blob(), "image/jpeg"));
    }
    const { error } = await admin.from("galerias_entrega")
      .update({ foto_capa_url: url, foto_capa_storage_path: destino }).eq("id", id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true, capa: url });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "falha ao gerar a capa" }, { status: 500 });
  }
}
