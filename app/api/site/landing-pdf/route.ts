// Anexa a PROPOSTA EM PDF a uma landing. O fotógrafo gera o arquivo pelo próprio navegador
// (view /landing-imprimir/{id} → "Salvar como PDF" — fiel ao layout da página) e envia aqui.
// É esse arquivo que vai por e-mail a quem pede os valores no modo "só os valores".
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { fotografoIdAtual } from "@/lib/auth/fotografoAtual";
import { createAdminClient } from "@/lib/supabase/admin";
import { uploadFile } from "@/lib/storage/upload";
import { deleteFile } from "@/lib/storage/delete";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 20 * 1024 * 1024; // 20 MB (mesmo teto do contrato)

export async function POST(request: NextRequest) {
  try {
    const fotografoId = await fotografoIdAtual();
    if (!fotografoId) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

    const form = await request.formData();
    const landingId = String(form.get("landing_id") ?? "");
    const file = form.get("file");
    if (!landingId || !(file instanceof File)) {
      return NextResponse.json({ erro: "Envie o arquivo PDF da proposta." }, { status: 400 });
    }
    if (file.type !== "application/pdf") {
      return NextResponse.json({ erro: "O arquivo precisa ser um PDF." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ erro: "PDF muito grande (máximo 20 MB)." }, { status: 400 });
    }

    // Só a própria landing do fotógrafo logado.
    const admin = createAdminClient();
    const { data: lp } = await admin.from("site_landing_pages")
      .select("id, titulo, pdf_path, pdf_url")
      .eq("id", landingId).eq("fotografo_id", fotografoId).maybeSingle();
    if (!lp) return NextResponse.json({ erro: "Landing não encontrada." }, { status: 404 });

    const path = `propostas-landing/${fotografoId}/${lp.id}/${crypto.randomUUID()}.pdf`;
    const { storage_path, url_publica } = await uploadFile(path, file, "application/pdf");

    const agora = new Date().toISOString();
    await admin.from("site_landing_pages").update({
      pdf_url: url_publica, pdf_path: storage_path, pdf_gerado_em: agora,
    }).eq("id", lp.id);

    // Apaga o PDF anterior (não bloqueia se falhar).
    if (lp.pdf_path && lp.pdf_path !== storage_path) {
      try { await deleteFile(lp.pdf_path, lp.pdf_url); } catch { /* já sumiu */ }
    }

    return NextResponse.json({ ok: true, pdf_url: url_publica, pdf_gerado_em: agora });
  } catch (e) {
    console.error("[site/landing-pdf] erro:", e);
    return NextResponse.json({ erro: "Erro ao anexar o PDF: " + (e instanceof Error ? e.message : String(e)) }, { status: 500 });
  }
}
