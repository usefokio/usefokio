// Página pública de resposta da campanha de reativação.
// GET  → retorna dados para exibir na página (sem auth)
// POST → registra a resposta do cliente (sem auth)
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { confirmarTemArquivos } from "@/lib/campanha/resposta";
import { opcoesDaGaleria } from "@/lib/entrega/renovacaoServidor";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: registro } = await admin
    .from("respostas_campanha")
    .select("galeria_id, fotografo_id, resposta, respondido_em, token")
    .eq("token", token)
    .maybeSingle();

  if (!registro) return NextResponse.json({ erro: "Link inválido ou expirado." }, { status: 404 });

  const { data: galeria } = await admin
    .from("galerias_entrega")
    .select("id, titulo, renewal_fee, rascunho, clientes(nome), fotografos:fotografo_id(nome_completo, nome_empresa, email, asaas_ativo)")
    .eq("id", registro.galeria_id)
    .maybeSingle() as { data: {
      id: string;
      titulo: string;
      renewal_fee: number | null;
      rascunho: boolean;
      clientes: { nome: string } | null;
      fotografos: { nome_completo: string; nome_empresa: string; email: string; asaas_ativo: boolean } | null;
    } | null };

  if (!galeria || galeria.rascunho) return NextResponse.json({ erro: "Galeria não disponível." }, { status: 404 });

  // Valor exibido = a primeira opção de renovação (a mesma que a cobrança usa sem escolha explícita).
  const [principal] = await opcoesDaGaleria(admin, galeria.id);

  return NextResponse.json({
    titulo:       galeria.titulo,
    nomeCliente:  galeria.clientes?.nome ?? null,
    nomeEmpresa:  galeria.fotografos?.nome_empresa ?? galeria.fotografos?.nome_completo ?? "Fotógrafo",
    galeriaId:    galeria.id,
    asaasAtivo:   galeria.fotografos?.asaas_ativo ?? false,
    renewalFee:   principal?.valor ?? 0,
    resposta:     registro.resposta,
    respondidoEm: registro.respondido_em,
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { resposta, nome, email, force } = await req.json().catch(() => ({})) as {
    resposta?: string; nome?: string; email?: string; force?: boolean;
  };

  if (resposta !== "renovar" && resposta !== "tem_arquivos") {
    return NextResponse.json({ erro: "Resposta inválida." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: registro } = await admin
    .from("respostas_campanha")
    .select("id, galeria_id, fotografo_id, resposta, token")
    .eq("token", token)
    .maybeSingle();

  if (!registro) return NextResponse.json({ erro: "Link inválido." }, { status: 404 });
  // Allow override only when correcting "tem_arquivos" → "renovar"
  if (registro.resposta !== null) {
    if (!(force && registro.resposta === "tem_arquivos" && resposta === "renovar")) {
      return NextResponse.json({ ok: true, galeriaId: registro.galeria_id, jaRespondeu: true });
    }
  }

  // "Já tenho os arquivos": grava, encerra o funil e avisa o fotógrafo (mesma regra da tela da galeria)
  if (resposta === "tem_arquivos") {
    await confirmarTemArquivos(admin, registro.galeria_id, nome, email);
    return NextResponse.json({ ok: true, galeriaId: registro.galeria_id });
  }

  // "Renovar": o estágio fica aberto até o pagamento ser confirmado (/renovar/verificar)
  await admin
    .from("respostas_campanha")
    .update({
      resposta,
      respondido_em:    new Date().toISOString(),
      respondido_nome:  nome?.trim() || null,
      respondido_email: email?.trim() || null,
    })
    .eq("token", token);

  return NextResponse.json({ ok: true, galeriaId: registro.galeria_id });
}

// DELETE — desfaz resposta "tem_arquivos" (cliente clicou errado)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: registro } = await admin
    .from("respostas_campanha")
    .select("id, galeria_id, resposta")
    .eq("token", token)
    .maybeSingle();

  if (!registro) return NextResponse.json({ erro: "Link inválido." }, { status: 404 });
  if (registro.resposta !== "tem_arquivos") {
    return NextResponse.json({ erro: "Apenas respostas 'tem_arquivos' podem ser desfeitas." }, { status: 400 });
  }

  const { error } = await admin
    .from("respostas_campanha")
    .update({
      resposta:         null,
      respondido_em:    null,
      respondido_nome:  null,
      respondido_email: null,
      estagio:          "nao_contatado",
      notificado:       false,
    })
    .eq("token", token);

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
