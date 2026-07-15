// Produtos independentes (UseFokio-fotografia, CRM e Site) derivados das 7 flags de
// fotografos.recursos — fonte única usada pela Sidebar (menu) e pelo DashboardGuard
// (bloqueio de rota). Política: fotografia/crm são opt-out (ausente = tem); album/site
// são opt-in (só com true explícito). O backfill da migration 20260715_0001 garante as
// 7 chaves em toda linha, mas os predicados toleram objeto parcial/ausente.
import type { RecursosFotografo } from "@/lib/supabase/types";

type Rec = Partial<RecursosFotografo> | null | undefined;

// O módulo UseFokio é o bundle da fotografia: visível se QUALQUER flag dele estiver ativa.
const FLAGS_FOTOGRAFIA = ["selecao", "entrega", "contatos", "pagamentos"] as const;

export function temProdutoFotografia(rec: Rec): boolean {
  return FLAGS_FOTOGRAFIA.some((k) => rec?.[k] !== false) || rec?.album === true;
}

export function temProdutoCRM(rec: Rec): boolean {
  return rec?.crm !== false;
}

export function temProdutoSite(rec: Rec): boolean {
  return rec?.site === true;
}

// Gate por rota — mesmo critério do menu (zero divergência menu ↔ acesso).
// Rotas fora dos produtos (/conta, /configurar, …) passam sempre.
export function rotaPermitida(rec: Rec, pathname: string): boolean {
  const sob = (base: string) => pathname === base || pathname.startsWith(base + "/");

  // Itens com flag própria (idêntico ao gate do menu)
  if (sob("/selecao")) return rec?.selecao !== false;
  if (sob("/entrega")) return rec?.entrega !== false;
  if (sob("/album")) return rec?.album === true;
  if (sob("/contatos")) return rec?.contatos !== false;
  if (sob("/recebimentos")) return rec?.pagamentos !== false;

  // Clientes é a base única, compartilhada — acessível por fotografia OU CRM.
  if (sob("/crm/clientes")) return temProdutoFotografia(rec) || temProdutoCRM(rec);
  if (sob("/crm")) return temProdutoCRM(rec);
  if (sob("/site")) return temProdutoSite(rec);
  if (sob("/dashboard") || sob("/tutoriais") || sob("/config")) return temProdutoFotografia(rec);

  return true;
}

// Destino seguro do redirect quando a rota é negada: a "casa" do primeiro produto
// que o fotógrafo tem. Nunca hardcodar o destino (evita loop com usuário só-Site).
export function rotaInicialPermitida(rec: Rec): string {
  if (temProdutoFotografia(rec)) return "/dashboard";
  if (temProdutoCRM(rec)) return "/crm/agenda";
  if (temProdutoSite(rec)) return "/site";
  return "/conta";
}
