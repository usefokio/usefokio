// Doação ao desenvolvedor — usa a conta Asaas do webmaster (webmaster_config).
// GET: dados de doação disponíveis (asaas ativo? dados manuais?)
// POST: cria cobrança de doação para o fotógrafo logado.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fotografoIdAtual } from "@/lib/auth/fotografoAtual";
import { decryptKey, criarCobranca, type AsaasAmbiente } from "@/lib/asaas";

export async function GET() {
  const fotografoId = await fotografoIdAtual();
  if (!fotografoId) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const admin = createAdminClient();
  const { data: cfg } = await admin.from("webmaster_config").select("asaas_ativo, doacao_manual_pix, doacao_manual_link, doacao_manual_msg, pix_qrcode_url").eq("id", 1).maybeSingle();

  return NextResponse.json({
    asaasAtivo: cfg?.asaas_ativo ?? false,
    manualPix:  cfg?.doacao_manual_pix ?? null,
    manualLink: cfg?.doacao_manual_link ?? null,
    manualMsg:  cfg?.doacao_manual_msg ?? null,
    qrCodeUrl:  cfg?.pix_qrcode_url ?? null,
  });
}

export async function POST(request: NextRequest) {
  const fotografoId = await fotografoIdAtual();
  if (!fotografoId) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const { valor } = await request.json().catch(() => ({}));
  const v = Number(valor);
  if (!v || v < 1) return NextResponse.json({ erro: "Valor mínimo R$ 1,00" }, { status: 400 });

  const admin = createAdminClient();
  const { data: cfg } = await admin.from("webmaster_config").select("*").eq("id", 1).maybeSingle();
  if (!cfg?.asaas_ativo || !cfg.asaas_api_key_enc) {
    return NextResponse.json({ erro: "Doação online indisponível no momento." }, { status: 400 });
  }

  const { data: doador } = await admin.from("fotografos").select("nome_completo, email").eq("id", fotografoId).maybeSingle();

  try {
    const apiKey = decryptKey(cfg.asaas_api_key_enc);
    const { paymentId, invoiceUrl } = await criarCobranca({
      apiKey,
      ambiente: cfg.asaas_ambiente as AsaasAmbiente,
      cliente: { nome: doador?.nome_completo ?? "Fotógrafo UseFokio", email: doador?.email ?? "" },
      valor: v,
      descricao: "Doação ao desenvolvedor — UseFokio ❤️",
      externalReference: `doacao:${fotografoId}`,
    });

    await admin.from("pagamentos").insert({
      tipo:                "doacao",
      doador_fotografo_id: fotografoId,
      asaas_payment_id:    paymentId,
      valor:               v,
      status:              "pendente",
      invoice_url:         invoiceUrl,
      pagador_nome:        doador?.nome_completo ?? null,
      pagador_email:       doador?.email ?? null,
    });

    return NextResponse.json({ ok: true, invoiceUrl });
  } catch (e) {
    return NextResponse.json({ erro: "Erro ao gerar doação: " + (e instanceof Error ? e.message : "") }, { status: 500 });
  }
}
