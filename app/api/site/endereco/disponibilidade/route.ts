// Checa se um subdomínio ou domínio próprio está DISPONÍVEL (colunas UNIQUE em site_config),
// ignorando a linha do próprio fotógrafo — dá feedback amigável antes do upsert
// (sem isso o 23505 do Postgres chega cru na tela).
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { fotografoIdAtual } from "@/lib/auth/fotografoAtual";
import { createAdminClient } from "@/lib/supabase/admin";
import { REGEX_SUBDOMINIO, SUBDOMINIOS_RESERVADOS, normalizarHost } from "@/lib/site/publico";

export async function GET(req: NextRequest) {
  const fotografoId = await fotografoIdAtual();
  if (!fotografoId) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const tipo = req.nextUrl.searchParams.get("tipo");
  const valor = (req.nextUrl.searchParams.get("valor") ?? "").trim().toLowerCase();
  if (!valor || (tipo !== "subdominio" && tipo !== "dominio")) {
    return NextResponse.json({ erro: "Parâmetros inválidos." }, { status: 400 });
  }

  const admin = createAdminClient();

  if (tipo === "subdominio") {
    if (!REGEX_SUBDOMINIO.test(valor)) return NextResponse.json({ disponivel: false, motivo: "formato" });
    if (SUBDOMINIOS_RESERVADOS.has(valor)) return NextResponse.json({ disponivel: false, motivo: "reservado" });
    const { data } = await admin.from("site_config").select("fotografo_id")
      .eq("subdominio", valor).neq("fotografo_id", fotografoId).limit(1);
    return NextResponse.json({ disponivel: !data || data.length === 0, motivo: data && data.length > 0 ? "em_uso" : null });
  }

  // Domínio próprio: colisão considera as variantes www/apex (o proxy resolve as duas).
  const host = normalizarHost(valor.replace(/^https?:\/\//, "").replace(/\/.*$/, ""));
  const alt = host.startsWith("www.") ? host.slice(4) : `www.${host}`;
  const { data } = await admin.from("site_config").select("fotografo_id")
    .or(`dominio_customizado.eq.${host},dominio_customizado.eq.${alt}`)
    .neq("fotografo_id", fotografoId).limit(1);
  return NextResponse.json({ disponivel: !data || data.length === 0, motivo: data && data.length > 0 ? "em_uso" : null });
}
