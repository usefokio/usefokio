// Cria a cobrança de renovação de acesso da galeria (público — cliente do fotógrafo).
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptKey, criarCobranca, type AsaasAmbiente } from "@/lib/asaas";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { nome, email, cpf } = await request.json().catch(() => ({}));

  if (!nome?.trim() || !EMAIL_RE.test(email?.trim() ?? "")) {
    return NextResponse.json({ erro: "Informe nome e um e-mail válido." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: galeria } = await admin
    .from("galerias_entrega")
    .select("id, titulo, renewal_fee, renovacao_dias, fotografo_id, rascunho")
    .eq("id", id)
    .maybeSingle();

  if (!galeria || galeria.rascunho) return NextResponse.json({ erro: "Galeria não encontrada." }, { status: 404 });
  if (!galeria.renewal_fee || galeria.renewal_fee <= 0) {
    return NextResponse.json({ erro: "Esta galeria não tem taxa de renovação configurada." }, { status: 400 });
  }

  const { data: fotografo } = await admin
    .from("fotografos")
    .select("id, asaas_api_key_enc, asaas_ambiente, asaas_ativo")
    .eq("id", galeria.fotografo_id)
    .maybeSingle();

  if (!fotografo?.asaas_ativo || !fotografo.asaas_api_key_enc) {
    return NextResponse.json({ erro: "Pagamento online não disponível. Entre em contato com o fotógrafo." }, { status: 400 });
  }

  const emailNorm = email.trim().toLowerCase();

  // Reaproveita cobrança pendente da mesma galeria + email (não duplica)
  const { data: pendente } = await admin
    .from("pagamentos")
    .select("id, invoice_url, asaas_payment_id")
    .eq("galeria_id", id)
    .eq("tipo", "renovacao")
    .eq("status", "pendente")
    .eq("pagador_email", emailNorm)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (pendente?.invoice_url) {
    return NextResponse.json({ ok: true, invoiceUrl: pendente.invoice_url, pagamentoId: pendente.id });
  }

  try {
    const apiKey = decryptKey(fotografo.asaas_api_key_enc);
    const { paymentId, invoiceUrl } = await criarCobranca({
      apiKey,
      ambiente: fotografo.asaas_ambiente as AsaasAmbiente,
      cliente: { nome: nome.trim(), email: emailNorm, cpf: cpf?.trim() || undefined },
      valor: galeria.renewal_fee,
      descricao: `Renovação de acesso — ${galeria.titulo}`,
      externalReference: `renovacao:${id}`,
    });

    const { data: pgto, error } = await admin.from("pagamentos").insert({
      tipo:             "renovacao",
      galeria_id:       id,
      fotografo_id:     fotografo.id,
      asaas_payment_id: paymentId,
      valor:            galeria.renewal_fee,
      status:           "pendente",
      invoice_url:      invoiceUrl,
      dias_liberados:   galeria.renovacao_dias ?? 30,
      pagador_nome:     nome.trim(),
      pagador_email:    emailNorm,
    }).select("id").single();

    if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, invoiceUrl, pagamentoId: pgto.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[renovar] Asaas error:", msg);
    return NextResponse.json({ erro: "Erro ao gerar cobrança: " + msg }, { status: 500 });
  }
}
