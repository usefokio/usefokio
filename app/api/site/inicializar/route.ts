// Cria o ESQUELETO do site para uma conta nova (idempotente): páginas Sobre + Contato
// (vazias, prontas pra editar) + menu inicial real (Início, Portfólio, Trabalhos, Sobre, Contato).
// "Portfólio" (/colecoes) lista as coleções best-of; "Trabalhos" (/portfolio) lista os posts de
// evento — conceitos SEPARADOS (ver memória project_site_portfolio_vs_trabalho).
// Roda no primeiro acesso ao módulo Site. A flag site_config.site_inicializado garante
// que só acontece uma vez (não re-seeda após o fotógrafo excluir itens de propósito).
import { NextResponse } from "next/server";
import { fotografoIdAtual } from "@/lib/auth/fotografoAtual";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  const fotografoId = await fotografoIdAtual();
  if (!fotografoId) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const admin = createAdminClient();
  const { data: cfg } = await admin.from("site_config").select("site_inicializado").eq("fotografo_id", fotografoId).maybeSingle();
  if (cfg?.site_inicializado) return NextResponse.json({ ok: true, ja: true });

  const agora = new Date().toISOString();

  // Páginas institucionais (conteúdo vazio, prontas pra editar). tipo 'institucional' = slug fixo.
  await admin.from("site_paginas").upsert([
    { fotografo_id: fotografoId, tipo: "institucional", titulo: "Sobre", slug: "sobre", conteudo: {}, publicado: true, updated_at: agora },
    { fotografo_id: fotografoId, tipo: "institucional", titulo: "Contato", slug: "contato", conteudo: {}, publicado: true, updated_at: agora },
  ], { onConflict: "fotografo_id,slug", ignoreDuplicates: true });

  // Menu inicial (itens reais, editáveis). Ordem = ordem no topo do site.
  await admin.from("site_menu").upsert([
    { fotografo_id: fotografoId, label: "Início",    href: "/",          tipo: "secao",  ordem: 0, visivel: true },
    { fotografo_id: fotografoId, label: "Portfólio", href: "/colecoes",  tipo: "secao",  ordem: 1, visivel: true },
    { fotografo_id: fotografoId, label: "Trabalhos", href: "/portfolio", tipo: "secao",  ordem: 2, visivel: true },
    { fotografo_id: fotografoId, label: "Sobre",     href: "/sobre",     tipo: "pagina", ordem: 3, visivel: true },
    { fotografo_id: fotografoId, label: "Contato",   href: "/contato",   tipo: "pagina", ordem: 4, visivel: true },
  ]);

  await admin.from("site_config").upsert(
    { fotografo_id: fotografoId, site_inicializado: true, updated_at: agora },
    { onConflict: "fotografo_id" },
  );

  return NextResponse.json({ ok: true, ja: false });
}
