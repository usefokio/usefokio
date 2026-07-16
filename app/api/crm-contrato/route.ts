// Contrato PÚBLICO — o cliente abre por link, sem login. Mesmo caso do recibo:
// `crm_contracts` tem RLS (fotografo_id = auth.uid()), então o client anônimo lia ZERO linhas
// e a página mostrava "Contrato não encontrado". Padrão: rota de API com service role.
// Proteção: id UUID não adivinhável; a rota nunca lista, só devolve o contrato pedido.
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimitOk, clientIp } from "@/lib/rate-limit";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  try {
    if (!(await rateLimitOk(`crm-contrato:${clientIp(request)}`, 30, 60))) {
      return NextResponse.json({ erro: "Muitas tentativas. Aguarde um instante." }, { status: 429 });
    }

    const id = new URL(request.url).searchParams.get("id");
    if (!id || !UUID_RE.test(id)) return NextResponse.json({ contrato: null });

    const admin = createAdminClient();
    const { data: contrato } = await admin
      .from("crm_contracts")
      .select("id, fotografo_id, pedido_id, nome_template, corpo_gerado, arquivo_url, arquivo_nome, created_at")
      .eq("id", id)
      .maybeSingle();

    if (!contrato) return NextResponse.json({ contrato: null });

    const fid = (contrato as { fotografo_id?: string }).fotografo_id;
    let nomeFotografo = "";
    if (fid) {
      const { data: f } = await admin.from("fotografos_nomes").select("nome_completo, nome_empresa").eq("id", fid).maybeSingle();
      if (f) nomeFotografo = (f as { nome_empresa: string | null; nome_completo: string | null }).nome_empresa
        ?? (f as { nome_completo: string | null }).nome_completo ?? "";
    }

    return NextResponse.json({ contrato, nomeFotografo });
  } catch {
    return NextResponse.json({ erro: "Erro ao carregar o contrato." }, { status: 500 });
  }
}
