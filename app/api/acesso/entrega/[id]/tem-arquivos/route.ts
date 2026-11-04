// Tela da galeria vencida/suspensa: o cliente confirma que já tem os arquivos salvos e não quer novas
// mensagens. Mesmo efeito da resposta pelo link da campanha (encerra o funil e avisa o fotógrafo).
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { confirmarTemArquivos } from "@/lib/campanha/resposta";
import { rateLimitOk, clientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { nome, email } = await req.json().catch(() => ({})) as { nome?: string; email?: string };

  const ip = clientIp(req);
  if (!(await rateLimitOk(`tem-arquivos:${ip}`, 10, 3600))) {
    return NextResponse.json({ erro: "Muitas tentativas. Tente mais tarde." }, { status: 429 });
  }

  const admin = createAdminClient();
  const { data: galeria } = await admin
    .from("galerias_entrega")
    .select("id, fotografo_id, rascunho, suspensa, expires_at")
    .eq("id", id)
    .maybeSingle();
  const vencida = !!galeria && (galeria.suspensa || (galeria.expires_at && new Date(galeria.expires_at).getTime() <= Date.now()));
  if (!galeria || galeria.rascunho || !vencida) return NextResponse.json({ erro: "Galeria não disponível." }, { status: 404 });

  // Garante o registro no funil (galeria pode ainda não ter entrado)
  await admin.from("respostas_campanha")
    .upsert({ galeria_id: id, fotografo_id: galeria.fotografo_id }, { onConflict: "galeria_id", ignoreDuplicates: true });

  const { data: registro } = await admin.from("respostas_campanha")
    .select("resposta, respondido_em").eq("galeria_id", id).maybeSingle();
  if (registro?.resposta === "tem_arquivos") return NextResponse.json({ ok: true, respondido_em: registro.respondido_em });

  try {
    const respondidoEm = await confirmarTemArquivos(admin, id, nome, email);
    return NextResponse.json({ ok: true, respondido_em: respondidoEm });
  } catch (e) {
    return NextResponse.json({ erro: e instanceof Error ? e.message : "Erro ao registrar." }, { status: 500 });
  }
}
