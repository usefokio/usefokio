// Proposta para o PDF — mesma mecânica do /api/crm-contrato: a página /crm-proposta/{id}
// é aberta por link (sem sessão garantida) e o client anônimo esbarraria no RLS em produção,
// então os dados saem por aqui com service role. Proteção: id UUID não adivinhável, sem listagem,
// e só propostas ATIVAS.
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimitOk, clientIp } from "@/lib/rate-limit";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  try {
    if (!(await rateLimitOk(`crm-proposta:${clientIp(request)}`, 30, 60))) {
      return NextResponse.json({ erro: "Muitas tentativas. Aguarde um instante." }, { status: 429 });
    }

    const id = new URL(request.url).searchParams.get("id");
    if (!id || !UUID_RE.test(id)) return NextResponse.json({ proposta: null });

    const admin = createAdminClient();
    const { data: proposta } = await admin
      .from("crm_propostas")
      .select("id, fotografo_id, titulo, descricao_html, validade_dias, slug, publicado")
      .eq("id", id).eq("ativo", true)
      .maybeSingle();
    if (!proposta) return NextResponse.json({ proposta: null });

    const fid = (proposta as { fotografo_id: string }).fotografo_id;
    const [{ data: opcoes }, { data: f }] = await Promise.all([
      admin.from("crm_proposta_opcoes").select("*").eq("proposta_id", id).order("ordem"),
      admin.from("fotografos")
        .select("nome_empresa, nome_completo, logo_url, whatsapp, telefone, email, cidade, estado")
        .eq("id", fid).maybeSingle(),
    ]);

    return NextResponse.json({ proposta, opcoes: opcoes ?? [], fotografo: f ?? null });
  } catch {
    return NextResponse.json({ erro: "Erro ao carregar a proposta." }, { status: 500 });
  }
}
