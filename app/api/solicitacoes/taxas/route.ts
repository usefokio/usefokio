import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fotografoIdAtual } from "@/lib/auth/fotografoAtual";
import { taxasCartao } from "@/lib/asaas";
import { credAsaasDoFotografo } from "@/lib/pagamentos/solicitacoes";

// Taxas de cartão da conta Asaas do fotógrafo — para a prévia de parcelas no painel.
export async function GET() {
  const fid = await fotografoIdAtual();
  if (!fid) return NextResponse.json({ erro: "não autenticado" }, { status: 401 });
  const cred = await credAsaasDoFotografo(createAdminClient(), fid);
  if (!cred) return NextResponse.json({ conectado: false });
  try {
    return NextResponse.json({ conectado: true, taxas: await taxasCartao(cred.apiKey, cred.ambiente) });
  } catch (e) {
    return NextResponse.json({ conectado: true, taxas: null, erro: e instanceof Error ? e.message : "falha ao ler taxas" });
  }
}
