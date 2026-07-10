// MOTOR DE BLOCOS do site — base de toda a personalização (landing pages primeiro; site inteiro depois).
// Uma página é uma lista ordenada de blocos; cada bloco tem um tipo e os próprios dados.
// O conteúdo fica em jsonb (site_landing_pages.dados.blocos) — sem migração de schema.
import type { SiteLandingDados } from "@/lib/supabase/types";

export type TipoBloco =
  | "hero"          // imagem de fundo + logo + título sobrepostos
  | "titulo"        // título de seção centralizado
  | "texto"         // texto rico (HTML)
  | "imagem"        // imagem única (proporção natural)
  | "duas_colunas"  // texto rico + imagem lado a lado (empilha no mobile)
  | "pacote"        // nome + itens + VALOR + imagem (particularidade dos orçamentos)
  | "cards"         // grade de cards com foto + nome + link (ex.: casais/trabalhos)
  | "galeria"       // grade de fotos (sem texto), colunas configuráveis
  | "video"         // vídeo embed (YouTube)
  | "depoimentos"   // depoimentos manuais do site + botão "Escrever avaliação"
  | "divisor"       // linha horizontal
  | "espaco"        // respiro vertical
  | "whatsapp"      // CTA de WhatsApp
  | "formulario";   // formulário de contato/lead (grava em site_leads)

export type SiteBloco = {
  id: string;
  tipo: TipoBloco;
  dados: {
    // hero
    imagem_url?: string | null;
    logo_url?: string | null;
    titulo?: string | null;
    // titulo/texto
    texto?: string | null;
    html?: string | null;
    // imagem
    url?: string | null;
    largura_total?: boolean;
    // duas_colunas / pacote
    invertido?: boolean;
    nome?: string | null;
    itens?: string[];
    valor?: string | null;
    // cards
    cards?: { nome: string; foto_url?: string | null; href?: string | null }[];
    // galeria
    fotos?: string[];
    colunas?: number; // 2, 3 ou 4
    // depoimentos
    escrever_url?: string | null;
    // espaco
    altura?: number;
    // whatsapp
    numero?: string | null;
  };
};

// Catálogo para a paleta do editor
export const CATALOGO_BLOCOS: { tipo: TipoBloco; label: string; icone: string }[] = [
  { tipo: "hero",         label: "Topo (hero)",        icone: "🖼" },
  { tipo: "titulo",       label: "Título",             icone: "🔤" },
  { tipo: "texto",        label: "Texto",              icone: "📝" },
  { tipo: "imagem",       label: "Imagem",             icone: "🏞" },
  { tipo: "duas_colunas", label: "Texto + Imagem",     icone: "◫" },
  { tipo: "pacote",       label: "Pacote (orçamento)", icone: "💍" },
  { tipo: "cards",        label: "Cards com foto",     icone: "▦" },
  { tipo: "galeria",      label: "Galeria de fotos",   icone: "🖽" },
  { tipo: "video",        label: "Vídeo",              icone: "▶" },
  { tipo: "depoimentos",  label: "Depoimentos",        icone: "⭐" },
  { tipo: "divisor",      label: "Divisor",            icone: "―" },
  { tipo: "espaco",       label: "Espaço",             icone: "↕" },
  { tipo: "whatsapp",     label: "Botão WhatsApp",     icone: "💬" },
  { tipo: "formulario",   label: "Formulário de contato", icone: "✉" },
];

export function novoBloco(tipo: TipoBloco): SiteBloco {
  const base: SiteBloco = { id: crypto.randomUUID(), tipo, dados: {} };
  if (tipo === "titulo") base.dados.texto = "Novo título";
  if (tipo === "texto") base.dados.html = "<p>Escreva aqui…</p>";
  if (tipo === "pacote") base.dados = { nome: "Novo pacote", itens: ["Item 1;", "Item 2;"], valor: "R$ " };
  if (tipo === "cards") base.dados.cards = [];
  if (tipo === "galeria") { base.dados.fotos = []; base.dados.colunas = 3; }
  if (tipo === "espaco") base.dados.altura = 40;
  if (tipo === "depoimentos") base.dados.titulo = "O que meus clientes dizem";
  if (tipo === "whatsapp") base.dados.texto = "Conversar no WhatsApp";
  if (tipo === "formulario") base.dados.titulo = "Fale comigo";
  return base;
}

// Converte a landing do formato antigo (template fixo) para blocos — SEM perder nada.
// Usado quando a landing ainda não tem dados.blocos (compatibilidade retroativa).
export function dadosParaBlocos(d: SiteLandingDados): SiteBloco[] {
  const blocos: SiteBloco[] = [];
  const id = () => crypto.randomUUID();

  if (d.hero && (d.hero.imagem_url || d.hero.titulo)) {
    blocos.push({ id: id(), tipo: "hero", dados: { imagem_url: d.hero.imagem_url, logo_url: d.hero.logo_url, titulo: d.hero.titulo } });
  }
  if (d.video_url) blocos.push({ id: id(), tipo: "video", dados: { url: d.video_url } });
  (d.pacotes ?? []).forEach((p, i) => {
    blocos.push({ id: id(), tipo: "pacote", dados: { nome: p.nome, itens: p.itens, valor: p.valor, imagem_url: p.imagem_url, invertido: i % 2 === 1 } });
  });
  if (d.ensaio && (d.ensaio.titulo || d.ensaio.imagem_url)) {
    if (d.ensaio.titulo) blocos.push({ id: id(), tipo: "titulo", dados: { texto: d.ensaio.titulo } });
    if (d.ensaio.imagem_url) blocos.push({ id: id(), tipo: "imagem", dados: { url: d.ensaio.imagem_url, largura_total: true } });
  }
  if (d.albuns && (d.albuns.titulo || d.albuns.corpo_html || d.albuns.imagem_url)) {
    blocos.push({ id: id(), tipo: "duas_colunas", dados: { titulo: d.albuns.titulo, html: d.albuns.corpo_html, imagem_url: d.albuns.imagem_url } });
  }
  if ((d.casais?.length ?? 0) > 0) {
    blocos.push({ id: id(), tipo: "cards", dados: { titulo: d.casais_titulo, cards: (d.casais ?? []).map((c) => ({ nome: c.nome, foto_url: c.foto_url, href: c.href })) } });
  }
  blocos.push({ id: id(), tipo: "divisor", dados: {} });
  blocos.push({ id: id(), tipo: "depoimentos", dados: { titulo: d.avaliacoes?.titulo ?? "O que meus clientes dizem", escrever_url: d.avaliacoes?.escrever_url } });
  if (d.cta_whatsapp) blocos.push({ id: id(), tipo: "whatsapp", dados: { texto: d.cta_whatsapp.texto, numero: d.cta_whatsapp.numero } });

  return blocos;
}
