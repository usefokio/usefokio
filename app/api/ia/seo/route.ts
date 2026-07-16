// Assistente de SEO por IA — STUB (contrato definido; provedor será plugado depois).
// Contrato: POST { tipo: "titulo"|"descricao"|"keywords"|"alt"|"texto"|"sobre",
//                  entidade: "trabalho"|"post"|"pagina"|"colecao"|"site",
//                  campos: Record<string,string>, briefing?: object }
//        → { sugestao: string }  (futuro; hoje responde 501)
// Provedor previsto: Anthropic (env ANTHROPIC_API_KEY — ainda não configurada).
import { NextResponse } from "next/server";
import { fotografoIdAtual } from "@/lib/auth/fotografoAtual";

export async function POST() {
  const fotografoId = await fotografoIdAtual();
  if (!fotografoId) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  return NextResponse.json({ erro: "Assistente de IA em breve." }, { status: 501 });
}
