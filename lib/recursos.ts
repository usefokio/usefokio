// Produtos independentes (UseFokio, CRM e Site) derivados das flags de fotografos.recursos — fonte
// única usada pela Sidebar (menu) e pelo DashboardGuard (bloqueio de rota).
// Organização (06/11/2026):
//   UseFokio = Seleção · Entrega (com Funil, Revelação, Recebimentos e Listas de e-mail) · Álbum (beta)
//   CRM      = bloco inteiro · parte "Cobrança por cartão" (flag `pagamentos` — nome antigo mantido no banco)
//   Site     = bloco inteiro (beta)
// A flag `contatos` não é mais usada (as Listas de e-mail seguem a Entrega); fica no banco, sem efeito.
// Política: selecao/entrega/crm/pagamentos são opt-out (ausente = tem); album/site são opt-in (só com true).
import type { RecursosFotografo } from "@/lib/supabase/types";

type Rec = Partial<RecursosFotografo> | null | undefined;

// O módulo UseFokio é o bundle da fotografia: visível se QUALQUER parte dele estiver ativa.
const FLAGS_FOTOGRAFIA = ["selecao", "entrega"] as const;

export function temProdutoFotografia(rec: Rec): boolean {
  return FLAGS_FOTOGRAFIA.some((k) => rec?.[k] !== false) || rec?.album === true;
}

export function temProdutoCRM(rec: Rec): boolean {
  return rec?.crm !== false;
}

export function temProdutoSite(rec: Rec): boolean {
  return rec?.site === true;
}

// Cobrança por cartão (tela /solicitacoes): parte do CRM. Precisa do Asaas conectado para funcionar.
export function temCobrancaCartao(rec: Rec): boolean {
  return temProdutoCRM(rec) && rec?.pagamentos !== false;
}

// Rotas universais do sistema (nem UseFokio nem CRM): ficam na barra do topo e valem para
// quem tem fotografia OU CRM. Fonte única para o Header, o Sidebar e o gate de rota.
export const ROTAS_UNIVERSAIS = ["/crm/agenda", "/crm/clientes"] as const;

export function ehRotaUniversal(pathname: string): boolean {
  return ROTAS_UNIVERSAIS.some((base) => pathname === base || pathname.startsWith(base + "/"));
}

// Gate por rota — mesmo critério do menu (zero divergência menu ↔ acesso).
// Rotas fora dos produtos (/conta, /configurar, …) passam sempre.
export function rotaPermitida(rec: Rec, pathname: string): boolean {
  const sob = (base: string) => pathname === base || pathname.startsWith(base + "/");

  // Itens com flag própria (idêntico ao gate do menu)
  if (sob("/selecao")) return rec?.selecao !== false;
  if (sob("/entrega")) return rec?.entrega !== false;
  if (sob("/revelacao")) return rec?.entrega !== false;
  if (sob("/album")) return rec?.album === true;
  if (sob("/contatos")) return rec?.entrega !== false;      // Listas de e-mail = parte da Entrega
  if (sob("/recebimentos")) return rec?.entrega !== false;  // renovação e revelação = parte da Entrega
  if (sob("/solicitacoes")) return temCobrancaCartao(rec);

  // Agenda e Clientes são universais — acessíveis por fotografia OU CRM.
  if (ehRotaUniversal(pathname)) return temProdutoFotografia(rec) || temProdutoCRM(rec);
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
  return "/configuracoes/usuario";
}
