// Recibo PÚBLICO — o cliente abre por link, sem login.
// `crm_financial_entries` tem RLS (fotografo_id = auth.uid()), então o client anônimo do browser
// lia ZERO linhas e a página mostrava "Recibo não encontrado". Padrão do projeto para dado
// protegido em página pública: rota de API com service role (ver app/api/album/acesso/route.ts).
// Proteção: o id/grupo é um UUID não adivinhável e a rota NUNCA lista — só devolve o que foi pedido.
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimitOk, clientIp } from "@/lib/rate-limit";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  try {
    if (!(await rateLimitOk(`recibo:${clientIp(request)}`, 30, 60))) {
      return NextResponse.json({ erro: "Muitas tentativas. Aguarde um instante." }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const grupo = searchParams.get("grupo");
    const ids = (searchParams.get("ids") ?? "").split(",").map((s) => s.trim()).filter(Boolean);

    // Só aceita UUID: evita varredura e query inválida
    const grupoOk = grupo && UUID_RE.test(grupo) ? grupo : null;
    const idsOk = ids.filter((i) => UUID_RE.test(i)).slice(0, 50);
    if (!grupoOk && idsOk.length === 0) return NextResponse.json({ entradas: [] });

    const admin = createAdminClient();
    const base = admin
      .from("crm_financial_entries")
      .select("id, descricao, valor, vencimento, pago_em, status, conta_id, parcela, fotografo_id, crm_orders(nome, numero, data_evento, clientes(nome, email, telefone))")
      .order("vencimento");

    const { data } = await (grupoOk ? base.eq("recibo_grupo_id", grupoOk) : base.in("id", idsOk));
    const entradas = data ?? [];
    if (entradas.length === 0) return NextResponse.json({ entradas: [] });

    // Nome do fotógrafo junto: evita um segundo round-trip do browser
    const fid = (entradas[0] as { fotografo_id?: string }).fotografo_id;
    let nomeFotografo = "Fotógrafo";
    if (fid) {
      const { data: f } = await admin.from("fotografos_nomes").select("nome_completo, nome_empresa").eq("id", fid).maybeSingle();
      if (f) nomeFotografo = (f as { nome_empresa: string | null; nome_completo: string | null }).nome_empresa
        || (f as { nome_completo: string | null }).nome_completo || "Fotógrafo";
    }

    return NextResponse.json({ entradas, nomeFotografo });
  } catch {
    return NextResponse.json({ erro: "Erro ao carregar o recibo." }, { status: 500 });
  }
}
