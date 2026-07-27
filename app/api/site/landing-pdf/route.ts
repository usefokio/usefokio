// Botão "Gerar PDF" do editor: monta a proposta em PDF da landing (com os VALORES reais) e
// vincula o arquivo a ela. É esse PDF que vai por e-mail a quem pede os valores no modo
// "só os valores". Recebe os blocos escolhidos no editor ("o que entra no PDF").
// Regerar cria um arquivo novo (nome com uuid, sem cache velho) e apaga o anterior.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { fotografoIdAtual } from "@/lib/auth/fotografoAtual";
import { createAdminClient } from "@/lib/supabase/admin";
import { gerarEVincularPdf } from "@/lib/site/gerarPropostaLanding";
import { deleteFile } from "@/lib/storage/delete";

export const runtime = "nodejs";
export const maxDuration = 60;

// Remove o PDF de uma landing (usado antes de excluir a landing — o registro some por cascade,
// mas o arquivo no storage ficaria órfão).
export async function DELETE(request: NextRequest) {
  try {
    const fotografoId = await fotografoIdAtual();
    if (!fotografoId) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

    const { landing_id } = await request.json().catch(() => ({}));
    if (!landing_id) return NextResponse.json({ erro: "landing_id obrigatório." }, { status: 400 });

    const admin = createAdminClient();
    const { data: lp } = await admin.from("site_landing_pages")
      .select("id, pdf_path, pdf_url").eq("id", landing_id).eq("fotografo_id", fotografoId).maybeSingle();
    if (!lp) return NextResponse.json({ erro: "Landing não encontrada." }, { status: 404 });

    if (lp.pdf_path) {
      try { await deleteFile(lp.pdf_path, lp.pdf_url); } catch (e) {
        console.error("[site/landing-pdf] falha ao remover o arquivo:", e instanceof Error ? e.message : e);
      }
      await admin.from("site_landing_pages")
        .update({ pdf_url: null, pdf_path: null, pdf_gerado_em: null, pdf_hash: null }).eq("id", lp.id);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[site/landing-pdf] erro no DELETE:", e);
    return NextResponse.json({ erro: "Erro ao remover o PDF." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const fotografoId = await fotografoIdAtual();
    if (!fotografoId) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

    const { landing_id, blocos } = await request.json().catch(() => ({}));
    if (!landing_id) return NextResponse.json({ erro: "landing_id obrigatório." }, { status: 400 });

    // Só a própria landing do fotógrafo logado.
    const admin = createAdminClient();
    const { data: dono } = await admin.from("site_landing_pages")
      .select("id").eq("id", landing_id).eq("fotografo_id", fotografoId).maybeSingle();
    if (!dono) return NextResponse.json({ erro: "Landing não encontrada." }, { status: 404 });

    const ids = Array.isArray(blocos) ? blocos.filter((b) => typeof b === "string") : undefined;
    const r = await gerarEVincularPdf(landing_id, ids);
    if (!r) return NextResponse.json({ erro: "Não foi possível gerar o PDF." }, { status: 500 });

    const { data: lp } = await admin.from("site_landing_pages")
      .select("pdf_url, pdf_gerado_em").eq("id", landing_id).maybeSingle();
    return NextResponse.json({ ok: true, ...lp });
  } catch (e) {
    console.error("[site/landing-pdf] erro:", e);
    return NextResponse.json({ erro: "Erro ao gerar o PDF: " + (e instanceof Error ? e.message : String(e)) }, { status: 500 });
  }
}
