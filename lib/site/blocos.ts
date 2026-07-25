// MOTOR DE BLOCOS do site — base de toda a personalização (landing pages primeiro; site inteiro depois).
// Uma página é uma lista ordenada de blocos; cada bloco tem um tipo e os próprios dados.
// O conteúdo fica em jsonb (site_landing_pages.dados.blocos) — sem migração de schema.
import type { SiteLandingDados } from "@/lib/supabase/types";
import type { ConfigFormulario } from "@/lib/site/formulario";
import type { ProporcaoCapa, AncoraFoto, BannerAjuste } from "@/lib/site/design";

export type TipoBloco =
  | "hero"          // imagem de fundo + logo + título sobrepostos
  | "titulo"        // título de seção centralizado
  | "texto"         // texto rico (HTML)
  | "imagem"        // imagem única (proporção natural)
  | "duas_colunas"  // texto rico + imagem lado a lado (empilha no mobile)
  | "pacote"        // nome + itens + VALOR + imagem (particularidade dos orçamentos)
  | "pacotes"       // 2 a 4 pacotes lado a lado, para comparar as opções
  | "pagamento"     // condições de pagamento (parcelas, à vista, PIX) — texto explicativo por linha
  | "cards"         // grade de cards com foto + nome + link (ex.: casais/trabalhos)
  | "galeria"       // grade de fotos (sem texto), colunas configuráveis
  | "video"         // vídeo embed (YouTube)
  | "depoimentos"   // depoimentos manuais do site + botão "Escrever avaliação"
  | "divisor"       // linha horizontal
  | "espaco"        // respiro vertical
  | "whatsapp"      // CTA de WhatsApp
  | "formulario";   // formulário de contato/lead (grava em site_leads)

// Slugs reservados: rotas fixas do site público / produto de galeria — uma página custom
// com esses endereços nunca é servida (a rota estática tem precedência). Usado pelo
// editor de menu (bloqueia criação) e pela Aparência (esconde páginas inservíveis).
export const SLUGS_RESERVADOS = new Set([
  "sobre", "contato", "portfolio", "colecoes", "videos", "blog", "post", "galeria", "gallery.php", "sitemap.xml", "robots.txt",
  "proposta", // páginas públicas do Banco de Propostas (/proposta/{slug})
]);

export type SiteBloco = {
  id: string;
  tipo: TipoBloco;
  dados: {
    // ── Opções de IMAGEM e ESPAÇAMENTO (mesmo vocabulário da Aparência — ver lib/site/design.ts).
    // Todas opcionais: sem elas o bloco renderiza como sempre renderizou (nada muda no que já existe).
    proporcao?: ProporcaoCapa;   // 16:9, 3:2, 4:3, vertical 2:3, quadrado — força o aspect-ratio
    ancora?: AncoraFoto;         // que parte da foto aparece quando ela é cortada (object-position)
    ajuste?: BannerAjuste;       // manter proporção (contain) x preencher (cover)
    espaco_antes?: number;       // respiro acima do bloco, em px
    espaco_depois?: number;      // respiro abaixo do bloco, em px
    largura_bloco?: "normal" | "total"; // normal = largura do site; total = ponta a ponta
    alinhamento?: "esquerda" | "centro" | "direita"; // alinhamento do conteúdo do bloco
    // Tamanho do título do bloco em % do padrão do tema (100 = como o tema define).
    // Vira o multiplicador --lp-esc-tit, então as reduções de mobile continuam valendo.
    titulo_escala?: number;
    // hero (texto = subtítulo; com_formulario sobrepõe o formulário à imagem de fundo)
    imagem_url?: string | null;
    logo_url?: string | null;
    titulo?: string | null;
    com_formulario?: boolean;
    // titulo/texto
    texto?: string | null;
    html?: string | null;
    // imagem
    url?: string | null;
    largura_total?: boolean;
    largura?: number; // largura da imagem em % (20-100); largura_total ignora e ocupa 100%
    // duas_colunas / pacote
    invertido?: boolean;          // legado: equivale a imagem_posicao = "esquerda"
    // Onde a imagem fica em relação ao texto. Sem escolha, cai no `invertido` legado.
    imagem_posicao?: "direita" | "esquerda" | "acima";
    nome?: string | null;
    // Itens do pacote em TEXTO RICO (HTML) — listas, negrito etc. É a forma atual.
    // `itens` (linhas) + `lista_estilo` ficam só como fallback dos pacotes antigos.
    itens_html?: string | null;
    itens?: string[];
    // Estilo da lista de itens (legado): bolinha (padrão), número, traço ou sem marcador
    lista_estilo?: "bolinha" | "numero" | "traco" | "nenhum";
    // Valor: número mascarado ("510,00"). O "R$" é automático na exibição.
    // `valor_prefixo` guarda o que vem antes do número (ex.: "10x", "a partir de").
    // Compatibilidade: valores antigos gravados com "R$" no texto são exibidos como estão.
    valor?: string | null;
    valor_prefixo?: string | null;
    // pacote — título em faixa de destaque, com imagem de fundo (mesmo visual do topo/hero)
    titulo_hero?: boolean;
    titulo_bg_url?: string | null;
    titulo_bg_altura?: number;    // altura da faixa em px (padrão 260)
    titulo_bg_ancora?: AncoraFoto;
    // pacotes (lado a lado) — cada coluna é um pacote completo
    pacotes?: {
      nome: string;
      itens_html?: string | null; // itens em texto rico (forma atual)
      itens?: string[];           // fallback dos pacotes antigos
      valor?: string | null;
      valor_prefixo?: string | null;
      imagem_url?: string | null;
      destaque?: boolean;         // coluna em evidência (ex.: o pacote mais vendido)
      etiqueta?: string | null;   // selo acima do nome (ex.: "Mais escolhido")
    }[];
    // pagamento — condições de pagamento (parcelas, à vista, PIX)
    intro_html?: string | null;                          // texto de introdução (rico), opcional
    condicoes?: { rotulo: string; descricao: string }[]; // linhas: rótulo em destaque + explicação
    // cards
    cards?: { nome: string; foto_url?: string | null; href?: string | null }[];
    // galeria
    fotos?: string[];
    colunas?: number; // 2, 3 ou 4
    // depoimentos
    escrever_url?: string | null;
    // espaco (respiro) — e também a altura fixa do hero/imagem, em px
    altura?: number;
    // whatsapp
    numero?: string | null;
    // formulario
    formulario?: ConfigFormulario;
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
  { tipo: "pacotes",      label: "Pacotes lado a lado", icone: "▥" },
  { tipo: "pagamento",    label: "Formas de pagamento", icone: "💳" },
  { tipo: "cards",        label: "Galeria com links",  icone: "▦" },
  { tipo: "galeria",      label: "Galeria de fotos",   icone: "🖽" },
  { tipo: "video",        label: "Vídeo",              icone: "▶" },
  { tipo: "depoimentos",  label: "Depoimentos",        icone: "⭐" },
  { tipo: "divisor",      label: "Divisor",            icone: "―" },
  { tipo: "espaco",       label: "Espaço",             icone: "↕" },
  { tipo: "whatsapp",     label: "Botão WhatsApp",     icone: "💬" },
  { tipo: "formulario",   label: "Formulário de contato", icone: "✉" },
];

// Valor do pacote como aparece na página: "R$" automático + prefixo opcional ("10x").
// Compatibilidade: valores gravados antes disso já vinham com "R$" escrito no texto
// (ex.: "R$ 10x 510,00") — esses são exibidos exatamente como estão.
export function valorExibido(d: SiteBloco["dados"]): string | null {
  const bruto = (d.valor ?? "").trim();
  if (!bruto) return null;
  if (/r\$/i.test(bruto)) return bruto;              // legado: já tem o símbolo
  const pre = (d.valor_prefixo ?? "").trim();
  return `R$ ${pre ? pre + " " : ""}${bruto}`;
}

// Separa um valor legado ("R$ 10x 510,00") em { prefixo: "10x", numero: "510,00" },
// para o editor mostrar nos campos certos sem o fotógrafo redigitar.
export function separarValor(v: string | null | undefined): { prefixo: string; numero: string } {
  const s = (v ?? "").trim();
  if (!s) return { prefixo: "", numero: "" };
  const semSimbolo = s.replace(/r\$\s*/i, "");
  const m = semSimbolo.match(/^(.*?)([\d.]+(?:,\d{1,2})?)\s*$/); // último número da string
  if (!m) return { prefixo: "", numero: semSimbolo.trim() };
  return { prefixo: m[1].trim(), numero: m[2].trim() };
}

// HTML de itens padrão para um pacote novo (o fotógrafo edita no editor rico).
const ITENS_HTML_PADRAO = "<ul><li>Item 1</li><li>Item 2</li></ul>";

// Converte itens legados (uma frase por linha) em HTML de lista, para semear o editor
// rico dos pacotes que ainda não têm `itens_html`. Sem perder o marcador escolhido antes.
function escaparHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
export function itensParaHtml(itens?: string[] | null, estilo?: "bolinha" | "numero" | "traco" | "nenhum"): string {
  const linhas = (itens ?? []).map((s) => (s ?? "").trim()).filter(Boolean);
  if (linhas.length === 0) return "";
  const tag = estilo === "numero" ? "ol" : "ul";
  return `<${tag}>${linhas.map((l) => `<li>${escaparHtml(l)}</li>`).join("")}</${tag}>`;
}

export function novoBloco(tipo: TipoBloco): SiteBloco {
  const base: SiteBloco = { id: crypto.randomUUID(), tipo, dados: {} };
  if (tipo === "titulo") base.dados.texto = "Novo título";
  if (tipo === "texto") base.dados.html = "<p>Escreva aqui…</p>";
  if (tipo === "pacote") base.dados = { nome: "Novo pacote", itens_html: ITENS_HTML_PADRAO, valor: "" };
  if (tipo === "pacotes") base.dados = {
    titulo: "Escolha o seu pacote",
    colunas: 3,
    pacotes: [
      { nome: "Essencial", itens_html: ITENS_HTML_PADRAO, valor: "" },
      { nome: "Completo", itens_html: ITENS_HTML_PADRAO, valor: "", destaque: true, etiqueta: "Mais escolhido" },
      { nome: "Premium", itens_html: ITENS_HTML_PADRAO, valor: "" },
    ],
  };
  if (tipo === "pagamento") base.dados = {
    titulo: "Formas de pagamento",
    intro_html: "<p>Os valores em parcelas indicam o número máximo de vezes de cada opção.</p>",
    condicoes: [
      { rotulo: "À vista (no ato)", descricao: "5% de desconto no pagamento via PIX ou dinheiro." },
      { rotulo: "PIX", descricao: "Sem taxas, confirmação na hora." },
      { rotulo: "Cartão de crédito", descricao: "Parcelamento conforme o máximo de cada opção (ex.: 5x, 7x)." },
    ],
  };
  if (tipo === "cards") base.dados.cards = [];
  if (tipo === "galeria") { base.dados.fotos = []; base.dados.colunas = 3; }
  if (tipo === "espaco") base.dados.altura = 40;
  if (tipo === "depoimentos") base.dados.titulo = "O que meus clientes dizem";
  if (tipo === "whatsapp") base.dados.texto = "Conversar no WhatsApp";
  if (tipo === "formulario") base.dados.titulo = "Fale comigo";
  return base;
}

// Converte o conteúdo legado de uma página institucional (site_paginas.conteudo =
// {html, imagens, formulario}) para blocos — seed do editor e fallback de render.
// O TÍTULO fica fora (é o H1 fixo da rota pública — preserva o SEO indexado).
export function conteudoParaBlocos(conteudo: unknown, comFormulario = false): SiteBloco[] {
  const c = (conteudo && typeof conteudo === "object" ? conteudo : {}) as { html?: string | null; imagens?: string[]; formulario?: ConfigFormulario };
  const blocos: SiteBloco[] = [];
  const id = () => crypto.randomUUID();
  const img = Array.isArray(c.imagens) ? c.imagens[0] : null;
  if (img && c.html) blocos.push({ id: id(), tipo: "duas_colunas", dados: { html: c.html, imagem_url: img } });
  else if (c.html) blocos.push({ id: id(), tipo: "texto", dados: { html: c.html } });
  else if (img) blocos.push({ id: id(), tipo: "imagem", dados: { url: img } });
  if (comFormulario || c.formulario) blocos.push({ id: id(), tipo: "formulario", dados: { formulario: c.formulario } });
  return blocos;
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
