"use client";

// Aparência do site — HUB de personalização de TODAS as páginas. Seletor de página no topo:
// Início (construtor de blocos da home), Sobre/Contato (3 MODELOS fixos + campos — mesmo
// padrão da home; blocos livres ficam SÓ nas landing pages), Portfólio/Trabalhos (exibição
// da grade). Coluna esquerda: controles; coluna direita: PRÉVIA AO VIVO (sticky) usando os
// MESMOS componentes do site real, com barra de dispositivo PC/Tablet/Celular.
// Salva em site_config.design + site_paginas.conteudo, com estado "não salvo" (useEditorEstado).
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchAllRows } from "@/lib/supabase/fetchAll";
import { useFotografo } from "@/lib/context/FotografoContext";
import { uploadFileClient } from "@/lib/storage/uploadClient";
import { getTema, temaCssVars, type TemaSite } from "@/lib/site/temas";
import { useEditorEstado, SeloEstado, BotaoSalvarEstado, ModalNaoSalvo } from "@/app/(dashboard)/_components/EditorEstado";
import {
  PARES_FONTE, CATEGORIA_LABEL, FONTE_NOME, getPar, normalizarDesign, DESIGN_PADRAO, BLOCO_LABEL,
  type ConfigDesign, type BarraConfig, type HeaderConfig, type CategoriaFonte,
  type HomeBloco, type HomeBlocoKey, type BlogLayout, type DepoLayout, type GradeConfig,
} from "@/lib/site/design";
import { cfgContatoDe, cfgSobreDe, conteudoComCfg, LAYOUTS_CONTATO, LAYOUTS_SOBRE, type CfgContato, type CfgSobre } from "@/lib/site/paginaCfg";
import { normalizarConfig } from "@/lib/site/formulario";
import { processarImagemEntrega } from "@/lib/imageResize";
import { SiteRichEditor } from "@/app/(dashboard)/site/_components/SiteRichEditor";
import { BotaoEscolherDoSite } from "@/app/(dashboard)/site/_components/SeletorImagemSite";
import { FormularioConfigEditor } from "@/app/(dashboard)/site/_components/FormularioConfigEditor";
import { SiteHeader } from "@/app/sites/[fid]/_components/SiteHeader";
import { HomeBlocos } from "@/app/sites/[fid]/_components/home/HomeBlocos";
import { PaginaContato, type CanalContato } from "@/app/sites/[fid]/_components/PaginaContato";
import { PaginaSobre } from "@/app/sites/[fid]/_components/PaginaSobre";
import { GradeCards, type ItemGrade } from "@/app/sites/[fid]/_components/GradeCards";
import { VideosGrade, type ItemVideo } from "@/app/sites/[fid]/_components/VideosGrade";
import { DADOS_EXEMPLO } from "@/app/sites/[fid]/_components/home/exemplo";
import type { DadosHome } from "@/app/sites/[fid]/_components/home/tipos";
import type { SiteBanner, SiteDepoimento, SitePagina, SitePortfolio, SitePost, SiteSelo, SiteTrabalho, SiteVideo } from "@/lib/supabase/types";

const CATS: CategoriaFonte[] = ["minimalista", "serifada", "elegante"];
const FONTES_UNICAS = [...new Set(PARES_FONTE.flatMap((p) => [p.titulo, p.texto]))];
const GOOGLE_HREF = "https://fonts.googleapis.com/css2?" + FONTES_UNICAS.map((id) => `family=${FONTE_NOME[id].replace(/ /g, "+")}`).join("&") + "&display=swap";

const PALETA = ["#FFFFFF", "#F8F7F4", "#F1EFEA", "#E8E2D6", "#5E6E5F", "#463F37", "#2B2B2B", "#1C1A17"];
const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

const PROP_OPTS = [{ v: "horizontal_16x9", l: "Vídeo 16:9" }, { v: "horizontal_3x2", l: "Horizontal 3:2" }, { v: "horizontal_4x3", l: "Horizontal 4:3" }, { v: "vertical_2x3", l: "Vertical 2:3" }, { v: "quadrado_1x1", l: "Quadrado" }] as const;
const POS_OPTS = [{ v: "acima", l: "Acima" }, { v: "centro", l: "Sobre a capa" }, { v: "abaixo", l: "Abaixo" }] as const;
const ANC_OPTS = [{ v: "superior", l: "Superior" }, { v: "centro", l: "Central" }, { v: "inferior", l: "Inferior" }, { v: "esquerda", l: "Esquerda" }, { v: "direita", l: "Direita" }] as const;

// ── Estilos base ──
const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" };
const mini: React.CSSProperties = { fontSize: 12, color: "var(--color-text-secondary)" };
const cardBox: React.CSSProperties = { border: "1px solid var(--color-border-tertiary)", borderRadius: 12, padding: 16, background: "var(--color-background-primary)", marginBottom: 12 };
const inp: React.CSSProperties = { width: "100%", padding: "8px 10px", borderRadius: 8, boxSizing: "border-box", border: "1px solid var(--color-border-secondary)", fontSize: 13, background: "var(--color-background-primary)", color: "var(--color-text-primary)" };

// ── Conversões de cor + seletor (matriz saturação/brilho + matiz + hex) ──
function hsvToHex(h: number, s: number, v: number): string {
  const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; } else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; } else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
  const to = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, "0");
  return "#" + to(r) + to(g) + to(b);
}
function hexToHsv(hex: string): { h: number; s: number; v: number } {
  let x = hex.replace("#", "");
  if (x.length === 3) x = x.split("").map((c) => c + c).join("");
  const r = parseInt(x.slice(0, 2), 16) / 255, g = parseInt(x.slice(2, 4), 16) / 255, b = parseInt(x.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6; else if (max === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
    h = h * 60; if (h < 0) h += 360;
  }
  return { h, s: max === 0 ? 0 : d / max, v: max };
}
function SeletorCor({ valor, onChange }: { valor: string; onChange: (hex: string) => void }) {
  const init = hexToHsv(HEX_RE.test(valor) ? valor : "#5E6E5F");
  const [h, setH] = useState(init.h); const [s, setS] = useState(init.s); const [v, setV] = useState(init.v);
  const [hexTxt, setHexTxt] = useState(valor);
  const svRef = useRef<HTMLDivElement>(null); const hueRef = useRef<HTMLDivElement>(null);
  const emit = (nh: number, ns: number, nv: number) => { const hx = hsvToHex(nh, ns, nv); setHexTxt(hx); onChange(hx); };
  const updateSV = (e: React.PointerEvent) => { const r = svRef.current!.getBoundingClientRect(); const ns = clamp01((e.clientX - r.left) / r.width), nv = 1 - clamp01((e.clientY - r.top) / r.height); setS(ns); setV(nv); emit(h, ns, nv); };
  const updateHue = (e: React.PointerEvent) => { const r = hueRef.current!.getBoundingClientRect(); const nh = clamp01((e.clientX - r.left) / r.width) * 360; setH(nh); emit(nh, s, v); };
  const dot: React.CSSProperties = { position: "absolute", width: 14, height: 14, borderRadius: "50%", border: "2px solid #fff", boxShadow: "0 0 0 1px rgba(0,0,0,0.4)", transform: "translate(-50%,-50%)", pointerEvents: "none" };
  return (
    <div onPointerDown={(e) => e.stopPropagation()} style={{ position: "absolute", top: 34, right: 0, zIndex: 30, width: 216, background: "var(--color-background-primary)", border: "1px solid var(--color-border-secondary)", borderRadius: 12, padding: 12, boxShadow: "0 12px 40px rgba(0,0,0,0.22)" }}>
      <div ref={svRef} onPointerDown={(e) => { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); updateSV(e); }} onPointerMove={(e) => { if ((e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) updateSV(e); }}
        style={{ position: "relative", width: "100%", height: 130, borderRadius: 8, cursor: "crosshair", touchAction: "none", background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent), hsl(${h} 100% 50%)` }}>
        <span style={{ ...dot, left: `${s * 100}%`, top: `${(1 - v) * 100}%`, background: hsvToHex(h, s, v) }} />
      </div>
      <div ref={hueRef} onPointerDown={(e) => { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); updateHue(e); }} onPointerMove={(e) => { if ((e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) updateHue(e); }}
        style={{ position: "relative", width: "100%", height: 14, borderRadius: 7, margin: "12px 0 10px", cursor: "pointer", touchAction: "none", background: "linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)" }}>
        <span style={{ ...dot, left: `${(h / 360) * 100}%`, top: "50%", background: `hsl(${h} 100% 50%)` }} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 22, height: 22, borderRadius: "50%", background: hsvToHex(h, s, v), border: "1px solid rgba(0,0,0,0.2)", flex: "0 0 auto" }} />
        <input value={hexTxt} onChange={(e) => { const t = e.target.value; setHexTxt(t); if (HEX_RE.test(t)) { const c = hexToHsv(t); setH(c.h); setS(c.s); setV(c.v); onChange(t.length === 4 ? t : t.toLowerCase()); } }}
          style={{ flex: 1, minWidth: 0, padding: "6px 8px", borderRadius: 7, border: "1px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 13, fontFamily: "var(--font-mono)" }} />
      </div>
    </div>
  );
}

// Paleta de cores (bolinhas + personalizada) — genérica: header, texto do menu, rodapé.
function PaletaCor({ valor, onChange, corTema }: { valor: string | null; onChange: (c: string | null) => void; corTema: string }) {
  const [aberto, setAberto] = useState(false);
  const atual = valor;
  const ehPreset = atual !== null && PALETA.some((c) => c.toLowerCase() === atual.toLowerCase());
  const ehCustom = atual !== null && !ehPreset;
  const anel = (on: boolean): React.CSSProperties => on ? { boxShadow: "0 0 0 2px var(--color-background-primary), 0 0 0 4px #2563EB" } : {};
  const circ: React.CSSProperties = { width: 26, height: 26, borderRadius: "50%", cursor: "pointer", border: "1px solid rgba(0,0,0,0.18)", padding: 0, flex: "0 0 auto" };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
      <button type="button" title="Cor do tema (automática)" onClick={() => { onChange(null); setAberto(false); }} style={{ ...circ, background: corTema, borderStyle: "dashed", borderColor: "#9ca3af", ...anel(atual === null) }} />
      {PALETA.map((c) => (
        <button key={c} type="button" title={c} onClick={() => { onChange(c); setAberto(false); }} style={{ ...circ, background: c, ...anel(ehPreset && atual!.toLowerCase() === c.toLowerCase()) }} />
      ))}
      <div style={{ position: "relative" }}>
        <button type="button" title="Cor personalizada" onClick={() => setAberto((a) => !a)} style={{ ...circ, background: ehCustom ? atual! : "conic-gradient(from 0deg, #f43f5e, #f59e0b, #10b981, #3b82f6, #a855f7, #f43f5e)", ...anel(ehCustom || aberto) }} />
        {aberto && (
          <>
            <div onClick={() => setAberto(false)} style={{ position: "fixed", inset: 0, zIndex: 29 }} />
            <SeletorCor valor={atual ?? "#5E6E5F"} onChange={(hex) => onChange(hex)} />
          </>
        )}
      </div>
    </div>
  );
}

// ── Controles reutilizáveis ──
function Seg<T extends string>({ value, options, onChange }: { value: T; options: readonly { v: T; l: string }[]; onChange: (v: T) => void }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {options.map((o) => (
        <button key={o.v} type="button" onClick={() => onChange(o.v)}
          style={{ padding: "7px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", border: value === o.v ? "1.5px solid #2563EB" : "1px solid var(--color-border-tertiary)", background: value === o.v ? "rgba(37,99,235,0.06)" : "transparent", color: value === o.v ? "#2563EB" : "var(--color-text-primary)" }}>
          {o.l}
        </button>
      ))}
    </div>
  );
}
function Range({ label, value, min, max, unidade, onChange }: { label: string; value: number; min: number; max: number; unidade?: string; onChange: (v: number) => void }) {
  return (
    <div>
      <div style={{ ...mini, marginBottom: 4 }}>{label} <strong>{value}{unidade ?? ""}</strong></div>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ width: "100%", accentColor: "#2563EB" }} />
    </div>
  );
}
function Chave({ on, onChange, titulo }: { on: boolean; onChange: (v: boolean) => void; titulo?: string }) {
  return (
    <button type="button" title={titulo} onClick={(e) => { e.stopPropagation(); onChange(!on); }}
      style={{ width: 38, height: 22, borderRadius: 11, border: "none", cursor: "pointer", padding: 2, background: on ? "#2563EB" : "var(--color-border-secondary)", display: "flex", justifyContent: on ? "flex-end" : "flex-start", alignItems: "center", transition: "background .15s", flex: "0 0 auto" }}>
      <span style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", display: "block" }} />
    </button>
  );
}

// Card minimizável (chevron à esquerda; clicar no cabeçalho alterna; alça/chave param a propagação).
function Card({ titulo, aberto, onToggle, alca, chave, destaque, rootProps, children }: {
  titulo: React.ReactNode; aberto: boolean; onToggle: () => void;
  alca?: React.ReactNode; chave?: React.ReactNode; destaque?: boolean;
  rootProps?: React.HTMLAttributes<HTMLDivElement> & { draggable?: boolean }; children: React.ReactNode;
}) {
  const { style: rootStyle, ...restRoot } = rootProps ?? {};
  return (
    <div {...restRoot} style={{ ...cardBox, ...(destaque ? { borderColor: "#2563EB", boxShadow: "0 0 0 1px #2563EB" } : {}), ...(rootStyle || {}) }}>
      <div onClick={onToggle} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", userSelect: "none" }}>
        <span style={{ fontSize: 12, color: "var(--color-text-secondary)", transition: "transform .15s", transform: aberto ? "none" : "rotate(-90deg)", display: "inline-block" }}>▾</span>
        {alca}
        <span style={{ ...lbl, flex: 1 }}>{titulo}</span>
        {chave}
      </div>
      {aberto && <div style={{ marginTop: 14 }}>{children}</div>}
    </div>
  );
}

// ── Prévia ao vivo: renderiza o site real numa largura virtual (dispositivo), escalada p/ caber.
// O MIOLO é o children (HomeBlocos, RenderBlocos ou grade) — o chassi (header/tema) é o mesmo. ──
function Preview({ design, menu, nome, logoUrl, disp, tema, children }: {
  design: ConfigDesign; menu: { id: string; label: string; href: string }[];
  nome: string; logoUrl: string | null; disp: "pc" | "tablet" | "celular"; tema: TemaSite;
  children: React.ReactNode;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [wrapW, setWrapW] = useState(420);
  const [innerH, setInnerH] = useState(760);
  useEffect(() => {
    const el = wrapRef.current; if (!el) return;
    const ro = new ResizeObserver(() => setWrapW(el.clientWidth));
    ro.observe(el); setWrapW(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    const el = innerRef.current; if (!el) return;
    const ro = new ResizeObserver(() => setInnerH(el.scrollHeight));
    ro.observe(el); setInnerH(el.scrollHeight);
    return () => ro.disconnect();
  }, []);
  const VIRT = disp === "pc" ? 1280 : disp === "tablet" ? 768 : 380;
  const scale = Math.min(1, wrapW / VIRT);
  const par = getPar(design.par);
  const fTitulo = `'${FONTE_NOME[par.titulo]}', Georgia, serif`;
  const fTexto = `'${FONTE_NOME[par.texto]}', Georgia, serif`;
  const lateral = design.header.orientacao === "lateral_esquerda";
  const fundoBarra = (b: BarraConfig, base: string) => `color-mix(in srgb, ${b.cor ?? base} ${b.opacidade}%, transparent)`;
  const itens = menu.length ? menu : [
    { id: "1", label: "Histórias", href: "/portfolio" }, { id: "2", label: "Orçamento", href: "/contato" },
    { id: "3", label: "Sobre", href: "/sobre" }, { id: "4", label: "Blog", href: "/blog" },
  ];
  return (
    <div ref={wrapRef} style={{ borderRadius: 14, overflowX: "hidden", overflowY: "auto", maxHeight: "76vh", border: "1px solid var(--color-border-secondary)", boxShadow: "0 8px 30px rgba(0,0,0,0.1)", background: tema.cores.fundo }}>
      <div style={{ position: "relative", width: "100%", height: Math.round(innerH * scale) }}>
        <div ref={innerRef} style={{
          position: "absolute", top: 0, left: 0, width: VIRT, transform: `scale(${scale})`, transformOrigin: "top left", pointerEvents: "none",
          ...temaCssVars(tema),
          ["--site-fonte-titulo" as string]: fTitulo,
          ["--site-fonte-corpo" as string]: fTexto,
          // Espelha a var do site real (layout.tsx) para a prévia refletir a largura ao vivo
          ["--site-largura" as string]: `${design.largura_maxima}px`,
          background: "var(--site-fundo)", color: "var(--site-texto)", fontFamily: "var(--site-fonte-corpo), Georgia, serif",
          containerType: "inline-size", // paridade com .site-root: o corpo/menu respondem à largura virtual
        } as React.CSSProperties}>
          <div className={`site-corpo${lateral ? " site-corpo-lateral" : ""}`}>
            <SiteHeader base="#" logoUrl={logoUrl} nome={nome} itens={itens}
              logoAltura={design.logo_altura} fundo={fundoBarra(design.header, tema.cores.fundo)} padY={design.header.altura}
              orientacao={design.header.orientacao} logoPos={design.header.logo_pos} corTexto={design.header.cor_texto} largura={design.header.largura} />
            <div style={lateral ? { flex: 1, minWidth: 0 } : undefined}>
              <div className="site-main">
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const DADOS_VAZIO: DadosHome = { banners: [], trabalhos: [], videos: [], posts: [], depoimentos: [], selos: [] };

export default function AparenciaPage() {
  const { fotografo } = useFotografo();
  const [design, setDesign] = useState<ConfigDesign>(DESIGN_PADRAO);
  const [temaId, setTemaId] = useState<string | null>(null);
  const [dados, setDados] = useState<DadosHome>(DADOS_VAZIO);
  const [menu, setMenu] = useState<{ id: string; label: string; href: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [enviandoLogo, setEnviandoLogo] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [disp, setDisp] = useState<"pc" | "tablet" | "celular">("pc");
  const [aberto, setAberto] = useState<Record<string, boolean>>({});
  const inputLogo = useRef<HTMLInputElement>(null);
  const dragIdx = useRef<number | null>(null);
  const [sobreIdx, setSobreIdx] = useState<number | null>(null);

  // ── HUB: página selecionada + config de Sobre/Contato (modelos fixos — padrão da home) ──
  const [pagina, setPagina] = useState<string>("inicio"); // "inicio" | "pg:sobre" | "pg:contato" | "grade:portfolio" | "grade:trabalhos"
  const [pgSobre, setPgSobre] = useState<SitePagina | null>(null);
  const [pgContato, setPgContato] = useState<SitePagina | null>(null);
  const [cfgSobre, setCfgSobre] = useState<CfgSobre | null>(null);
  const [cfgContato, setCfgContato] = useState<CfgContato | null>(null);
  const baseSobre = useRef("");   // baseline (JSON) — só grava a página se mudou
  const baseContato = useRef("");
  const [portfolios, setPortfolios] = useState<SitePortfolio[]>([]);
  const [videosSite, setVideosSite] = useState<SiteVideo[]>([]);
  // Upload de imagem das páginas (foto/banner/fundo)
  const inputImgPagina = useRef<HTMLInputElement>(null);
  const alvoImgPagina = useRef<{ qual: "sobre" | "contato"; campo: "foto" | "banner" | "fundo" } | null>(null);
  const [enviandoImgPagina, setEnviandoImgPagina] = useState(false);

  const snapshot = JSON.stringify({ design, cfgSobre, cfgContato });
  const estado = useEditorEstado(snapshot, "/site");

  useEffect(() => {
    if (!fotografo) return;
    const sb = createClient();
    (async () => {
      const { data: cfg } = await sb.from("site_config").select("design, tema").eq("fotografo_id", fotografo.id).maybeSingle();
      const row = cfg as { design?: unknown; tema?: string | null } | null;
      const d = normalizarDesign(row?.design);
      setDesign(d); setTemaId(row?.tema ?? null);
      const fid = fotografo.id;
      const [banners, trabalhos, posts, depoimentos, selos, menuRows, paginasRows, portfoliosRows, videosRows] = await Promise.all([
        fetchAllRows<SiteBanner>((s, f, t) => s.from("site_banners").select("*").eq("fotografo_id", fid).eq("publicado", true).order("ordem").range(f, t), sb),
        fetchAllRows<SiteTrabalho>((s, f, t) => s.from("site_trabalhos").select("*").eq("fotografo_id", fid).eq("publicado", true).order("data_evento", { ascending: false }).range(f, t), sb),
        fetchAllRows<SitePost>((s, f, t) => s.from("site_posts").select("*").eq("fotografo_id", fid).eq("publicado", true).order("ordem").range(f, t), sb),
        fetchAllRows<SiteDepoimento>((s, f, t) => s.from("site_depoimentos").select("*").eq("fotografo_id", fid).eq("publicado", true).order("ordem").range(f, t), sb),
        fetchAllRows<SiteSelo>((s, f, t) => s.from("site_selos").select("*").eq("fotografo_id", fid).eq("publicado", true).order("ordem").range(f, t), sb),
        fetchAllRows<{ id: string; label: string; href: string; visivel: boolean }>((s, f, t) => s.from("site_menu").select("id,label,href,visivel").eq("fotografo_id", fid).order("ordem").range(f, t), sb),
        fetchAllRows<SitePagina>((s, f, t) => s.from("site_paginas").select("*").eq("fotografo_id", fid).order("created_at").range(f, t), sb),
        fetchAllRows<SitePortfolio>((s, f, t) => s.from("site_portfolios").select("*").eq("fotografo_id", fid).eq("publicado", true).order("ordem").range(f, t), sb),
        fetchAllRows<SiteVideo>((s, f, t) => s.from("site_videos").select("*").eq("fotografo_id", fid).eq("publicado", true).order("ordem").range(f, t), sb),
      ]);
      const trabDestac = trabalhos.filter((t) => t.destaque_home);
      setDados({ banners, trabalhos: (trabDestac.length ? trabDestac : trabalhos).slice(0, 9), videos: videosRows.slice(0, 6), posts: posts.slice(0, 6), depoimentos, selos });
      setVideosSite(videosRows);
      setMenu(menuRows.filter((m) => m.visivel !== false).map((m) => ({ id: String(m.id), label: m.label, href: m.href })));
      // Sobre/Contato: config de modelo fixo derivada do conteudo (padrão da home — sem blocos).
      const rSobre = paginasRows.find((p) => p.slug === "sobre") ?? null;
      const rContato = paginasRows.find((p) => p.slug === "contato") ?? null;
      const cS = rSobre ? cfgSobreDe(rSobre.conteudo) : null;
      const cC = rContato ? cfgContatoDe(rContato.conteudo) : null;
      setPgSobre(rSobre); setPgContato(rContato); setCfgSobre(cS); setCfgContato(cC);
      baseSobre.current = JSON.stringify(cS); baseContato.current = JSON.stringify(cC);
      setPortfolios(portfoliosRows);
      estado.inicializar(JSON.stringify({ design: d, cfgSobre: cS, cfgContato: cC }));
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fotografo]);

  const setHeader = (patch: Partial<HeaderConfig>) => setDesign((d) => ({ ...d, header: { ...d.header, ...patch } }));
  const setRodape = (patch: Partial<BarraConfig>) => setDesign((d) => ({ ...d, rodape: { ...d.rodape, ...patch } }));
  // Atualiza um bloco por ID DE INSTÂNCIA. Blocos únicos têm id = key (legado), então chamadas
  // com a key literal (ex.: setBloco("banner", …)) continuam funcionando; os CTAs duplicados usam o id próprio.
  const setBloco = (id: string, patch: Partial<HomeBloco>) => setDesign((d) => ({ ...d, blocos: d.blocos.map((bl) => (bl.id ?? bl.key) === id ? { ...bl, ...patch } : bl) }));
  const duplicarBloco = (b: HomeBloco) => setDesign((d) => {
    const i = d.blocos.findIndex((x) => (x.id ?? x.key) === (b.id ?? b.key));
    const arr = [...d.blocos];
    arr.splice(i + 1, 0, { ...b, id: crypto.randomUUID() });
    return { ...d, blocos: arr };
  });
  const removerBloco = (id: string) => setDesign((d) => ({ ...d, blocos: d.blocos.filter((x) => (x.id ?? x.key) !== id) }));
  const setGrade = (k: "portfolio" | "trabalhos" | "videos", patch: Partial<GradeConfig>) => setDesign((d) => ({ ...d, grades: { ...d.grades, [k]: { ...d.grades[k], ...patch } } }));
  const toggle = (k: string) => setAberto((a) => ({ ...a, [k]: !a[k] }));

  function soltar(destino: number) {
    const from = dragIdx.current;
    if (from === null || from === destino) return;
    setDesign((d) => { const arr = [...d.blocos]; const [m] = arr.splice(from, 1); arr.splice(destino, 0, m); return { ...d, blocos: arr }; });
  }

  async function enviarLogo(files: FileList | null) {
    if (!files || !files[0] || !fotografo) return;
    setEnviandoLogo(true); setMsg(null);
    try {
      const ext = (files[0].name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
      const path = `site/${fotografo.id}/logo/logo-${crypto.randomUUID().slice(0, 6)}.${ext}`;
      const { url_publica } = await uploadFileClient(path, files[0], files[0].type || "image/png");
      setDesign((d) => ({ ...d, logo_url: url_publica }));
    } catch (e) { setMsg("Erro no upload da logo: " + (e instanceof Error ? e.message : "")); }
    setEnviandoLogo(false);
    if (inputLogo.current) inputLogo.current.value = "";
  }

  async function salvar(): Promise<boolean> {
    if (!fotografo) return false;
    setSalvando(true); setMsg(null);
    const sb = createClient();
    const { error } = await sb.from("site_config").upsert({ fotografo_id: fotografo.id, design, updated_at: new Date().toISOString() }, { onConflict: "fotografo_id" });
    if (error) { setSalvando(false); setMsg("Erro: " + error.message); return false; }
    // Sobre/Contato: grava a config no conteudo (jsonb) SÓ se mudou em relação ao baseline.
    // blocos: null — as páginas institucionais deixaram de usar o motor de blocos (só landings).
    const gravarPagina = async (row: SitePagina | null, cfg: CfgContato | CfgSobre | null, base: React.MutableRefObject<string>) => {
      if (!row || !cfg) return true;
      const json = JSON.stringify(cfg);
      if (json === base.current) return true;
      const { error: e2 } = await sb.from("site_paginas")
        .update({ conteudo: conteudoComCfg(row.conteudo, cfg), blocos: null, updated_at: new Date().toISOString() })
        .eq("id", row.id);
      if (e2) { setMsg("Erro: " + e2.message); return false; }
      base.current = json;
      return true;
    };
    if (!(await gravarPagina(pgSobre, cfgSobre, baseSobre)) || !(await gravarPagina(pgContato, cfgContato, baseContato))) {
      setSalvando(false);
      return false;
    }
    setSalvando(false);
    estado.marcarSalvo(JSON.stringify({ design, cfgSobre, cfgContato }));
    setMsg("Aparência salva! Recarregue seu site para ver.");
    return true;
  }

  // Upload das imagens de Sobre/Contato (foto/banner/fundo) — mesmo pipeline das fotos do site.
  function pedirImagemPagina(qual: "sobre" | "contato", campo: "foto" | "banner" | "fundo") {
    alvoImgPagina.current = { qual, campo };
    inputImgPagina.current?.click();
  }
  async function enviarImagemPagina(files: FileList | null) {
    const alvo = alvoImgPagina.current;
    if (!files || !files[0] || !fotografo || !alvo) return;
    setEnviandoImgPagina(true); setMsg(null);
    try {
      const { blob } = await processarImagemEntrega(files[0], 2400, 0.85);
      const path = `site/${fotografo.id}/paginas/${alvo.qual}/${alvo.campo}-${crypto.randomUUID().slice(0, 6)}.jpg`;
      const { url_publica } = await uploadFileClient(path, blob);
      if (alvo.qual === "sobre") setCfgSobre((c) => c ? { ...c, [alvo.campo === "foto" ? "foto" : "fundo"]: url_publica } : c);
      else setCfgContato((c) => c ? { ...c, [alvo.campo === "foto" ? "foto" : "banner"]: url_publica } : c);
    } catch (e) { setMsg("Erro no upload: " + (e instanceof Error ? e.message : "")); }
    setEnviandoImgPagina(false);
    if (inputImgPagina.current) inputImgPagina.current.value = "";
  }
  // Aplica uma imagem escolhida do site (já copiada) no mesmo campo que o upload alimentaria.
  function aplicarImagemPagina(qual: "sobre" | "contato", campo: "foto" | "banner" | "fundo", url: string) {
    if (qual === "sobre") setCfgSobre((c) => c ? { ...c, [campo === "foto" ? "foto" : "fundo"]: url } : c);
    else setCfgContato((c) => c ? { ...c, [campo === "foto" ? "foto" : "banner"]: url } : c);
  }

  const tema = getTema(temaId);
  const logo = design.logo_url ?? fotografo?.logo_url ?? null;
  const logoProprio = !!design.logo_url;
  const nome = fotografo?.nome_empresa || "Seu Estúdio";

  // Prévia sempre completa: bloco sem conteúdo real usa dados fictícios (imagens viram gradientes),
  // para o fotógrafo ver TODOS os blocos como se já tivesse conteúdo.
  const dadosPreview: DadosHome = {
    banners: dados.banners.length ? dados.banners : DADOS_EXEMPLO.banners,
    trabalhos: dados.trabalhos.length ? dados.trabalhos : DADOS_EXEMPLO.trabalhos,
    videos: dados.videos.length ? dados.videos : DADOS_EXEMPLO.videos,
    posts: dados.posts.length ? dados.posts : DADOS_EXEMPLO.posts,
    depoimentos: dados.depoimentos.length ? dados.depoimentos : DADOS_EXEMPLO.depoimentos,
    selos: dados.selos.length ? dados.selos : DADOS_EXEMPLO.selos,
  };

  // ── HUB: abas de página + dados da prévia ──
  const abas: { id: string; label: string }[] = [
    { id: "inicio", label: "Início" },
    ...(pgSobre ? [{ id: "pg:sobre", label: pgSobre.titulo || "Sobre" }] : []),
    ...(pgContato ? [{ id: "pg:contato", label: pgContato.titulo || "Contato" }] : []),
    { id: "grade:portfolio", label: "Portfólio" },
    { id: "grade:trabalhos", label: "Trabalhos" },
    { id: "grade:videos", label: "Vídeos" },
  ];

  // Canais exibidos na prévia do Contato (derivados do cadastro, como no site real)
  const canaisPreview: CanalContato[] = [
    fotografo?.whatsapp && { icon: "💬", label: "WhatsApp", href: "#", texto: fotografo.whatsapp },
    fotografo?.email && { icon: "✉️", label: "E-mail", href: "#", texto: fotografo.email },
  ].filter(Boolean) as CanalContato[];
  const trabalhosPrev: ItemGrade[] = dadosPreview.trabalhos.map((t) => ({
    id: t.id, href: "#", capa_url: t.capa_url, titulo: t.titulo, subtitulo: t.categoria, subtitulo2: t.local,
    rodape: { views: t.views ?? 0, likes: t.likes ?? 0 },
  }));
  const portfoliosPrev: ItemGrade[] = portfolios.length
    ? portfolios.map((p) => ({ id: p.id, href: "#", capa_url: p.capa_url, titulo: p.titulo }))
    : DADOS_EXEMPLO.trabalhos.map((t) => ({ id: t.id, href: "#", capa_url: t.capa_url, titulo: t.titulo }));
  const videosPrev: ItemVideo[] = videosSite.length
    ? videosSite.map((v) => ({ id: v.id, video_url: v.video_url, titulo: v.titulo, descricao: v.descricao }))
    : [1, 2, 3].map((n) => ({ id: `ex-${n}`, video_url: "", titulo: `Vídeo ${n}`, descricao: null }));

  const campo = (titulo: string, node: React.ReactNode) => (
    <div style={{ marginBottom: 14 }}>
      <div style={{ ...mini, marginBottom: 6, fontWeight: 600 }}>{titulo}</div>
      {node}
    </div>
  );
  const linhaChave = (label: string, on: boolean, onChange: (v: boolean) => void) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "5px 0" }}>
      <span style={mini}>{label}</span>
      <Chave on={on} onChange={onChange} />
    </div>
  );

  // Controles de cada bloco (por chave).
  function camposBloco(b: HomeBloco): React.ReactNode {
    switch (b.key) {
      case "banner": {
        // Rotativo: foto_unica/deslizante sempre; grade só quando há limite de linhas
        // (a velocidade passa a controlar o carrossel das fotos excedentes).
        const rotativo = (b.tipo ?? "deslizante") !== "grid" || (b.linhas ?? 0) > 0;
        return (
          <>
            {campo("Tipo", <Seg value={b.tipo ?? "deslizante"} options={[{ v: "foto_unica", l: "Foto única" }, { v: "deslizante", l: "Deslizante" }, { v: "grid", l: "Grade" }] as const} onChange={(v) => setBloco("banner", { tipo: v })} />)}
            {b.tipo === "foto_unica" && campo("Ajuste da imagem", <Seg value={b.ajuste ?? "manter_proporcao"} options={[{ v: "manter_proporcao", l: "Manter proporção" }, { v: "preencher", l: "Preencher" }] as const} onChange={(v) => setBloco("banner", { ajuste: v })} />)}
            {b.tipo !== "grid" && campo("Tamanho (altura)", <Range label="Altura" value={b.altura ?? 300} min={120} max={720} unidade="px" onChange={(v) => setBloco("banner", { altura: v })} />)}
            {b.tipo === "grid" && campo("Colunas", <Range label="Colunas" value={b.colunas ?? 3} min={2} max={6} onChange={(v) => setBloco("banner", { colunas: v })} />)}
            {b.tipo === "grid" && campo("Orientação das fotos", <Seg value={b.proporcao ?? "horizontal_3x2"} options={PROP_OPTS} onChange={(v) => setBloco("banner", { proporcao: v })} />)}
            {campo("Alinhamento do recorte", <>
              <Seg value={b.ancora ?? "centro"} options={ANC_OPTS} onChange={(v) => setBloco("banner", { ancora: v })} />
              <p style={{ ...mini, margin: "4px 0 0" }}>Escolhe qual parte da foto aparece quando ela é cortada.</p>
            </>)}
            {b.tipo === "grid" && campo("Limite de linhas", <>
              <Range label={(b.linhas ?? 0) === 0 ? "Sem limite" : "Linhas"} value={b.linhas ?? 0} min={0} max={20} onChange={(v) => setBloco("banner", { linhas: v })} />
              <p style={{ ...mini, margin: "4px 0 0" }}>0 = sem limite (a grade mostra todas as fotos). Com limite, as fotos excedentes viram um carrossel deslizante.</p>
            </>)}
            {rotativo && campo("Passagem automática", <Range label="Velocidade" value={b.velocidade ?? 4} min={1} max={15} unidade="s" onChange={(v) => setBloco("banner", { velocidade: v })} />)}
          </>
        );
      }
      case "trabalhos":
        return (
          <>
            {campo("Título da seção", <input value={b.titulo_secao ?? ""} onChange={(e) => setBloco("trabalhos", { titulo_secao: e.target.value })} placeholder="Trabalhos recentes" style={inp} />)}
            {campo("Colunas do grid", <Range label="Colunas" value={b.colunas ?? 3} min={1} max={6} onChange={(v) => setBloco("trabalhos", { colunas: v })} />)}
            {campo("Proporção da capa", <Seg value={b.proporcao ?? "horizontal_3x2"} options={PROP_OPTS} onChange={(v) => setBloco("trabalhos", { proporcao: v })} />)}
            {campo("Posição do título", <Seg value={b.titulo_pos ?? "abaixo"} options={POS_OPTS} onChange={(v) => setBloco("trabalhos", { titulo_pos: v })} />)}
            {campo("Texto do card", <Seg value={b.texto_card ?? "titulo_subtitulo"} options={[{ v: "titulo_subtitulo", l: "Título + subtítulo" }, { v: "so_titulo", l: "Só título" }] as const} onChange={(v) => setBloco("trabalhos", { texto_card: v })} />)}
          </>
        );
      case "videos":
        return (
          <>
            {campo("Título da seção", <input value={b.titulo_secao ?? ""} onChange={(e) => setBloco("videos", { titulo_secao: e.target.value })} placeholder="Vídeos" style={inp} />)}
            {campo("Colunas do grid", <Range label="Colunas" value={b.colunas ?? 3} min={1} max={6} onChange={(v) => setBloco("videos", { colunas: v })} />)}
            {campo("Proporção da miniatura", <Seg value={b.proporcao ?? "horizontal_16x9"} options={PROP_OPTS} onChange={(v) => setBloco("videos", { proporcao: v })} />)}
            {campo("Posição do título", <Seg value={b.titulo_pos ?? "abaixo"} options={POS_OPTS} onChange={(v) => setBloco("videos", { titulo_pos: v })} />)}
            {campo("Texto do card", <Seg value={b.texto_card ?? "so_titulo"} options={[{ v: "titulo_subtitulo", l: "Título + descrição" }, { v: "so_titulo", l: "Só título" }] as const} onChange={(v) => setBloco("videos", { texto_card: v })} />)}
            <p style={{ ...mini, margin: "4px 0 0" }}>Mostra os vídeos de <strong>Site → Vídeos</strong> (os 6 primeiros). O player abre em janela sobreposta ao clicar.</p>
          </>
        );
      case "blog": {
        const capaTopo = (b.layout ?? "capa_esquerda") !== "capa_esquerda";
        return (
          <>
            {campo("Layout", <Seg value={(b.layout ?? "capa_esquerda") as BlogLayout} options={[{ v: "capa_esquerda", l: "Capa à esquerda" }, { v: "capa_em_cima", l: "Capa em cima" }, { v: "horizontal_deslizante", l: "Horizontal" }] as const} onChange={(v) => setBloco("blog", { layout: v })} />)}
            {b.layout === "capa_em_cima" && campo("Colunas do grid", <Range label="Colunas" value={b.colunas ?? 3} min={1} max={4} onChange={(v) => setBloco("blog", { colunas: v })} />)}
            {campo("Proporção da capa", <Seg value={b.proporcao ?? "horizontal_3x2"} options={PROP_OPTS} onChange={(v) => setBloco("blog", { proporcao: v })} />)}
            {capaTopo && campo("Posição do título", <Seg value={b.titulo_pos ?? "abaixo"} options={POS_OPTS} onChange={(v) => setBloco("blog", { titulo_pos: v })} />)}
            {campo("Descrição", linhaChave("Mostrar o início do post", b.descricao !== false, (v) => setBloco("blog", { descricao: v })))}
          </>
        );
      }
      case "depoimentos":
        return (
          <>
            {campo("Layout", <Seg value={(b.layout ?? "lista_vertical") as DepoLayout} options={[{ v: "lista_vertical", l: "Lista vertical" }, { v: "horizontal", l: "Horizontal" }, { v: "grade", l: "Grade" }] as const} onChange={(v) => setBloco("depoimentos", { layout: v })} />)}
            {b.layout === "grade" && campo("Colunas", <Range label="Colunas" value={b.colunas ?? 3} min={2} max={5} onChange={(v) => setBloco("depoimentos", { colunas: v })} />)}
            {campo("Exibir", <div>
              {linhaChave("Foto", b.mostrar_foto !== false, (v) => setBloco("depoimentos", { mostrar_foto: v }))}
              {linhaChave("Nome", b.mostrar_nome !== false, (v) => setBloco("depoimentos", { mostrar_nome: v }))}
              {linhaChave("Depoimento", b.mostrar_texto !== false, (v) => setBloco("depoimentos", { mostrar_texto: v }))}
            </div>)}
          </>
        );
      case "selos":
        return (
          <>
            {campo("Título", linhaChave("Mostrar o título de cada selo", b.mostrar_titulo !== false, (v) => setBloco("selos", { mostrar_titulo: v })))}
            <p style={{ ...mini, marginTop: 4 }}>Adicione os selos em <strong>Site → Selos</strong>.</p>
          </>
        );
      case "cta": {
        const bid = b.id ?? b.key;
        const qtdCta = design.blocos.filter((x) => x.key === "cta").length;
        return (
          <>
            {campo("Título", <input value={b.cta_titulo ?? ""} onChange={(e) => setBloco(bid, { cta_titulo: e.target.value })} placeholder="Vamos registrar a sua história?" style={inp} />)}
            {campo("Subtítulo", <input value={b.cta_subtitulo ?? ""} onChange={(e) => setBloco(bid, { cta_subtitulo: e.target.value })} placeholder="Entre em contato e solicite seu orçamento." style={inp} />)}
            {campo("Texto do botão", <input value={b.cta_botao ?? ""} onChange={(e) => setBloco(bid, { cta_botao: e.target.value })} placeholder="Solicitar orçamento" style={inp} />)}
            <p style={{ ...mini, marginTop: 4 }}>O botão leva à página de Contato. Você pode ter várias chamadas em pontos diferentes da home.</p>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button onClick={() => duplicarBloco(b)} style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid var(--color-border-secondary)", background: "transparent", fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)", cursor: "pointer" }}>
                + Duplicar chamada
              </button>
              {qtdCta > 1 && (
                <button onClick={() => removerBloco(bid)} style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.35)", background: "transparent", fontSize: 12, fontWeight: 600, color: "#DC2626", cursor: "pointer" }}>
                  Remover esta chamada
                </button>
              )}
            </div>
          </>
        );
      }
    }
  }

  return (
    <div style={{ maxWidth: "var(--site-largura)", margin: "0 auto", padding: "32px 24px" }}>
      <link rel="stylesheet" href={GOOGLE_HREF} />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 4 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--color-text-primary)", margin: 0, letterSpacing: "-0.02em" }}>Aparência</h1>
        <SeloEstado temAlteracoes={estado.temAlteracoes} />
      </div>
      <p style={{ ...mini, margin: "0 0 14px" }}>Personalize o site página a página. Fontes, logo, header e rodapé (aba Início) valem para o site inteiro. A prévia ao lado atualiza ao vivo.</p>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", ...mini }}>Carregando…</div>
      ) : (
        <>
        {/* Seletor de página do HUB */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 18 }}>
          {abas.map((a) => (
            <button key={a.id} onClick={() => setPagina(a.id)}
              style={{ padding: "7px 14px", borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: "pointer", border: pagina === a.id ? "1.5px solid #2563EB" : "1px solid var(--color-border-tertiary)", background: pagina === a.id ? "rgba(37,99,235,0.06)" : "transparent", color: pagina === a.id ? "#2563EB" : "var(--color-text-primary)" }}>
              {a.label}
            </button>
          ))}
        </div>

        <input ref={inputImgPagina} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => enviarImagemPagina(e.target.files)} />

        <div className="aparencia-grid">
          {/* ── COLUNA ESQUERDA: controles ── */}
          <div>
            {pagina === "inicio" && (<>
            {/* Fontes */}
            <Card titulo="Fontes" aberto={!!aberto.fontes} onToggle={() => toggle("fontes")}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 320, overflowY: "auto" }}>
                {CATS.map((cat) => (
                  <div key={cat}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "8px 0 4px" }}>{CATEGORIA_LABEL[cat]}</div>
                    {PARES_FONTE.filter((p) => p.categoria === cat).map((p) => {
                      const sel = design.par === p.id;
                      const ft = `'${FONTE_NOME[p.titulo]}', Georgia, serif`;
                      const fx = `'${FONTE_NOME[p.texto]}', Georgia, serif`;
                      return (
                        <button key={p.id} type="button" onClick={() => setDesign((d) => ({ ...d, par: p.id }))}
                          style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left", cursor: "pointer", padding: "8px 10px", borderRadius: 8, marginBottom: 2, background: sel ? "rgba(37,99,235,0.06)" : "transparent", border: sel ? "1.5px solid #2563EB" : "1px solid var(--color-border-tertiary)" }}>
                          <span style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0, flex: 1 }}>
                            <span style={{ fontFamily: ft, fontSize: 17, lineHeight: 1.1, color: "var(--color-text-primary)" }}>Ensaios que viram histórias</span>
                            <span style={{ fontFamily: fx, fontSize: 12.5, color: "var(--color-text-secondary)" }}>Um pequeno texto de exemplo do site.</span>
                          </span>
                          <span style={{ fontSize: 11, fontWeight: sel ? 700 : 500, color: sel ? "#2563EB" : "var(--color-text-secondary)", flex: "0 0 auto" }}>{p.nome}</span>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </Card>

            {/* Logo */}
            <Card titulo="Logo do site" aberto={!!aberto.logo} onToggle={() => toggle("logo")}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                <div style={{ width: 118, height: 56, borderRadius: 8, border: "1px dashed var(--color-border-secondary)", display: "flex", alignItems: "center", justifyContent: "center", background: "repeating-conic-gradient(#0000000d 0% 25%, transparent 0% 50%) 50% / 14px 14px" }}>
                  {logoProprio ? <img src={design.logo_url!} alt="" style={{ maxHeight: 44, maxWidth: 106, objectFit: "contain" }} /> : <span style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>{logo ? "logo da conta" : "sem logo"}</span>}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <button onClick={() => inputLogo.current?.click()} disabled={enviandoLogo} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--color-border-secondary)", background: "transparent", fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)", cursor: "pointer" }}>
                    {enviandoLogo ? "Enviando…" : logoProprio ? "Trocar logo" : "Enviar logo (PNG)"}
                  </button>
                  {logoProprio && <button onClick={() => setDesign((d) => ({ ...d, logo_url: null }))} style={{ padding: 0, border: "none", background: "transparent", fontSize: 11, color: "#DC2626", cursor: "pointer", textAlign: "left" }}>Remover</button>}
                </div>
                <input ref={inputLogo} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => enviarLogo(e.target.files)} />
              </div>
              <div style={{ marginTop: 14 }}>
                <Range label="Tamanho da logo" value={design.logo_altura} min={24} max={120} unidade="px" onChange={(v) => setDesign((d) => ({ ...d, logo_altura: v }))} />
              </div>
            </Card>

            {/* Header */}
            <Card titulo="Header (barra do topo)" aberto={!!aberto.header} onToggle={() => toggle("header")}>
              {campo("Orientação da barra", <Seg value={design.header.orientacao} options={[{ v: "topo", l: "No topo" }, { v: "lateral_esquerda", l: "Lateral esquerda" }] as const} onChange={(v) => setHeader({ orientacao: v })} />)}
              {design.header.orientacao === "topo" && campo("Posição da logo", <Seg value={design.header.logo_pos} options={[{ v: "esquerda", l: "Esquerda" }, { v: "centro", l: "Centro" }, { v: "direita", l: "Direita" }] as const} onChange={(v) => setHeader({ logo_pos: v })} />)}
              {campo("Cor de fundo", <PaletaCor valor={design.header.cor} onChange={(c) => setHeader({ cor: c })} corTema={tema.cores.fundo} />)}
              {campo("Cor do texto do menu", <PaletaCor valor={design.header.cor_texto} onChange={(c) => setHeader({ cor_texto: c })} corTema={tema.cores.titulo} />)}
              {campo("Transparência", <Range label="Transparência" value={100 - design.header.opacidade} min={0} max={60} unidade="%" onChange={(v) => setHeader({ opacidade: 100 - v })} />)}
              {design.header.orientacao === "topo"
                ? campo("Altura", <Range label="Altura" value={design.header.altura} min={8} max={48} unidade="px" onChange={(v) => setHeader({ altura: v })} />)
                : campo("Largura", <Range label="Largura" value={design.header.largura} min={140} max={320} unidade="px" onChange={(v) => setHeader({ largura: v })} />)}
            </Card>

            {/* Blocos reordenáveis */}
            <div style={{ ...lbl, margin: "18px 0 8px", color: "var(--color-text-tertiary)" }}>Blocos da página (arraste para reordenar)</div>
            {design.blocos.map((b, idx) => {
              const bid = b.id ?? b.key;
              const rotulo = b.key === "cta" && b.cta_titulo?.trim() ? `Chamada — ${b.cta_titulo.trim().slice(0, 28)}` : BLOCO_LABEL[b.key];
              return (
              <Card key={bid} titulo={rotulo} aberto={!!aberto[bid]} onToggle={() => toggle(bid)} destaque={sobreIdx === idx}
                alca={<span onClick={(e) => e.stopPropagation()} title="Arraste para reordenar" style={{ cursor: "grab", color: "var(--color-text-secondary)", fontSize: 15, lineHeight: 1 }}>⠿</span>}
                chave={<Chave on={b.on} onChange={(v) => setBloco(bid, { on: v })} titulo={b.on ? "Ocultar bloco" : "Mostrar bloco"} />}
                rootProps={{
                  draggable: !aberto[bid],
                  onDragStart: () => { dragIdx.current = idx; },
                  onDragOver: (e) => { e.preventDefault(); if (sobreIdx !== idx) setSobreIdx(idx); },
                  onDragLeave: () => { if (sobreIdx === idx) setSobreIdx(null); },
                  onDrop: (e) => { e.preventDefault(); soltar(idx); setSobreIdx(null); },
                  onDragEnd: () => { dragIdx.current = null; setSobreIdx(null); },
                  style: { cursor: aberto[bid] ? "default" : "grab", opacity: b.on ? 1 : 0.55 },
                }}>
                {camposBloco(b)}
              </Card>
              );
            })}

            {/* Rodapé */}
            <Card titulo="Rodapé" aberto={!!aberto.rodape} onToggle={() => toggle("rodape")}>
              {campo("Cor", <PaletaCor valor={design.rodape.cor} onChange={(c) => setRodape({ cor: c })} corTema={tema.cores.superficie} />)}
              {campo("Transparência", <Range label="Transparência" value={100 - design.rodape.opacidade} min={0} max={60} unidade="%" onChange={(v) => setRodape({ opacidade: 100 - v })} />)}
              {campo("Altura", <Range label="Altura" value={design.rodape.altura} min={16} max={96} unidade="px" onChange={(v) => setRodape({ altura: v })} />)}
            </Card>

            {/* Espaçamento — vale para o site inteiro (header, rodapé, listagens e blocos) */}
            <Card titulo="Espaçamento" aberto={!!aberto.espacamento} onToggle={() => toggle("espacamento")}>
              {campo("Largura do conteúdo", <Range label="Largura" value={design.largura_maxima} min={900} max={1440} unidade="px" onChange={(v) => setDesign((d) => ({ ...d, largura_maxima: v }))} />)}
              <p style={{ ...mini, marginTop: 4 }}>
                Define a <strong>margem em relação às laterais</strong>. Vale para o site todo — header, rodapé,
                galerias e blocos alinham juntos. Menor = mais respiro nas bordas.
              </p>
            </Card>

            {/* Botão flutuante de WhatsApp — vale para o site inteiro (usa o WhatsApp do cadastro) */}
            <Card titulo="Botão de WhatsApp" aberto onToggle={() => {}}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Chave on={design.whatsapp_flutuante} onChange={(v) => setDesign((d) => ({ ...d, whatsapp_flutuante: v }))} titulo="Mostrar botão flutuante de WhatsApp" />
                <span style={{ fontSize: 12.5, color: "var(--color-text-primary)", fontWeight: 500 }}>Botão flutuante de WhatsApp no site</span>
              </div>
              <p style={{ ...mini, marginTop: 6 }}>Fica no canto inferior direito de todas as páginas e usa o número de WhatsApp do seu cadastro.</p>
            </Card>
            </>)}

            {/* ── Exibição das grades (Portfólio /colecoes, Trabalhos /portfolio e Vídeos /videos) ── */}
            {(pagina === "grade:portfolio" || pagina === "grade:trabalhos" || pagina === "grade:videos") && (() => {
              const k = pagina === "grade:portfolio" ? "portfolio" as const : pagina === "grade:trabalhos" ? "trabalhos" as const : "videos" as const;
              const g = design.grades[k];
              const titulos = { portfolio: "Exibição da grade do Portfólio", trabalhos: "Exibição da grade de Trabalhos", videos: "Exibição da grade de Vídeos" };
              return (
                <Card titulo={titulos[k]} aberto onToggle={() => {}}>
                  {campo("Colunas do grid", <Range label="Colunas" value={g.colunas} min={1} max={6} onChange={(v) => setGrade(k, { colunas: v })} />)}
                  {campo("Espaçamento entre as capas", <Range label="Espaçamento" value={g.gap} min={0} max={60} unidade="px" onChange={(v) => setGrade(k, { gap: v })} />)}
                  {campo("Proporção da capa", <Seg value={g.proporcao} options={PROP_OPTS} onChange={(v) => setGrade(k, { proporcao: v })} />)}
                  {campo("Achatar a imagem", <>
                    <Range label="Achatamento" value={g.achatamento} min={0} max={100} unidade="%" onChange={(v) => setGrade(k, { achatamento: v })} />
                    <p style={{ ...mini, marginTop: 4 }}>Afina o recorte a partir da proporção escolhida. A foto é <strong>cortada</strong>, nunca esticada — o alinhamento do recorte é o da capa de cada item.</p>
                  </>)}
                  {campo("Posição do título", <Seg value={g.titulo_pos} options={POS_OPTS} onChange={(v) => setGrade(k, { titulo_pos: v })} />)}
                  {(k === "trabalhos" || k === "videos") && campo("Texto do card", <Seg value={g.texto_card} options={[{ v: "titulo_subtitulo", l: k === "videos" ? "Título + descrição" : "Título + subtítulo" }, { v: "so_titulo", l: "Só título" }] as const} onChange={(v) => setGrade(k, { texto_card: v })} />)}
                  <p style={{ ...mini, marginTop: 4 }}>
                    {k === "portfolio"
                      ? <>As coleções exibidas são as de <strong>Site → Galerias → Portfólio</strong>.</>
                      : k === "trabalhos"
                      ? <>Os trabalhos exibidos são os de <strong>Site → Galerias → Trabalhos</strong>.</>
                      : <>Os vídeos exibidos são os de <strong>Site → Vídeos</strong> (a proporção 16:9 combina com o YouTube).</>}
                  </p>
                </Card>
              );
            })()}

            {/* ── SOBRE — modelo fixo + campos (padrão da home; prévia atualiza ao vivo) ── */}
            {pagina === "pg:sobre" && cfgSobre && (
              <>
                <Card titulo="Modelo da página" aberto onToggle={() => {}}>
                  {campo("Escolha o modelo", <Seg value={cfgSobre.layout} options={LAYOUTS_SOBRE} onChange={(v) => setCfgSobre((c) => c ? { ...c, layout: v } : c)} />)}
                  <p style={{ ...mini, marginTop: 4 }}>A prévia ao lado mostra a página como ela fica no site.</p>
                </Card>
                {cfgSobre.layout !== "foto_fundo" && (
                  <Card titulo={cfgSobre.layout === "minimalista" ? "Foto (opcional)" : "Foto"} aberto onToggle={() => {}}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                      {cfgSobre.foto && <img src={cfgSobre.foto} alt="" style={{ width: 96, height: 72, objectFit: "cover", borderRadius: 8 }} />}
                      <button onClick={() => pedirImagemPagina("sobre", "foto")} disabled={enviandoImgPagina} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--color-border-secondary)", background: "transparent", fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)", cursor: "pointer" }}>
                        {enviandoImgPagina ? "Enviando…" : cfgSobre.foto ? "Trocar foto" : "+ Enviar foto"}
                      </button>
                      <BotaoEscolherDoSite pasta="paginas/sobre" onEscolher={(u) => aplicarImagemPagina("sobre", "foto", u)} />
                      {cfgSobre.foto && <button onClick={() => setCfgSobre((c) => c ? { ...c, foto: null } : c)} style={{ border: "none", background: "transparent", fontSize: 11, color: "#DC2626", cursor: "pointer" }}>Remover</button>}
                    </div>
                    {cfgSobre.foto && cfgSobre.layout === "foto_bio" && (
                      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
                        <Range label="Tamanho da foto" value={cfgSobre.foto_largura} min={160} max={720} unidade="px" onChange={(v) => setCfgSobre((c) => c ? { ...c, foto_largura: v } : c)} />
                        {campo("Alinhamento do recorte", <Seg value={cfgSobre.ancora} options={ANC_OPTS} onChange={(v) => setCfgSobre((c) => c ? { ...c, ancora: v } : c)} />)}
                      </div>
                    )}
                    {cfgSobre.foto && cfgSobre.layout === "minimalista" && (
                      <div style={{ marginTop: 12 }}>
                        <Range label="Tamanho da foto" value={cfgSobre.foto_largura} min={160} max={720} unidade="px" onChange={(v) => setCfgSobre((c) => c ? { ...c, foto_largura: v } : c)} />
                      </div>
                    )}
                  </Card>
                )}
                {cfgSobre.layout === "foto_fundo" && (
                  <Card titulo="Imagem de fundo" aberto onToggle={() => {}}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                      {cfgSobre.fundo && <img src={cfgSobre.fundo} alt="" style={{ width: 96, height: 72, objectFit: "cover", borderRadius: 8 }} />}
                      <button onClick={() => pedirImagemPagina("sobre", "fundo")} disabled={enviandoImgPagina} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--color-border-secondary)", background: "transparent", fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)", cursor: "pointer" }}>
                        {enviandoImgPagina ? "Enviando…" : cfgSobre.fundo ? "Trocar imagem" : "+ Enviar imagem"}
                      </button>
                      <BotaoEscolherDoSite pasta="paginas/sobre" onEscolher={(u) => aplicarImagemPagina("sobre", "fundo", u)} />
                      {cfgSobre.fundo && <button onClick={() => setCfgSobre((c) => c ? { ...c, fundo: null } : c)} style={{ border: "none", background: "transparent", fontSize: 11, color: "#DC2626", cursor: "pointer" }}>Remover</button>}
                    </div>
                    {cfgSobre.fundo && <div style={{ marginTop: 12 }}>{campo("Alinhamento do recorte", <Seg value={cfgSobre.ancora} options={ANC_OPTS} onChange={(v) => setCfgSobre((c) => c ? { ...c, ancora: v } : c)} />)}</div>}
                  </Card>
                )}
                <Card titulo="Texto de apresentação" aberto onToggle={() => {}}>
                  <SiteRichEditor value={cfgSobre.html ?? ""} onChange={(html) => setCfgSobre((c) => c ? { ...c, html } : c)} minHeight={160} pasta="paginas/sobre" />
                </Card>
                <Card titulo="Botão de contato" aberto onToggle={() => {}}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: cfgSobre.cta_ativo ? 12 : 0 }}>
                    <Chave on={cfgSobre.cta_ativo} onChange={(v) => setCfgSobre((c) => c ? { ...c, cta_ativo: v } : c)} titulo="Mostrar botão no fim da página" />
                    <span style={{ fontSize: 12.5, color: "var(--color-text-primary)", fontWeight: 500 }}>Mostrar botão no fim da página</span>
                  </div>
                  {cfgSobre.cta_ativo && campo("Texto do botão",
                    <input value={cfgSobre.cta_botao} onChange={(e) => setCfgSobre((c) => c ? { ...c, cta_botao: e.target.value } : c)}
                      placeholder="Entre em contato" style={inp} />)}
                  {cfgSobre.cta_ativo && <p style={{ ...mini, marginTop: 4 }}>Leva o visitante para a sua página de <strong>Contato</strong>.</p>}
                </Card>
              </>
            )}

            {/* ── CONTATO — modelo fixo + campos (padrão da home; prévia atualiza ao vivo) ── */}
            {pagina === "pg:contato" && cfgContato && (
              <>
                <Card titulo="Modelo da página" aberto onToggle={() => {}}>
                  {campo("Escolha o modelo", <Seg value={cfgContato.layout} options={LAYOUTS_CONTATO} onChange={(v) => setCfgContato((c) => c ? { ...c, layout: v } : c)} />)}
                  <p style={{ ...mini, marginTop: 4 }}>O título e os canais (WhatsApp/e-mail do seu cadastro) aparecem em todos os modelos.</p>
                </Card>
                {cfgContato.layout !== "minimalista" && (
                  <Card titulo={cfgContato.layout === "banner_fundo" ? "Imagem de fundo" : "Banner do topo (opcional)"} aberto onToggle={() => {}}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                      {cfgContato.banner && <img src={cfgContato.banner} alt="" style={{ width: 96, height: 72, objectFit: "cover", borderRadius: 8 }} />}
                      <button onClick={() => pedirImagemPagina("contato", "banner")} disabled={enviandoImgPagina} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--color-border-secondary)", background: "transparent", fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)", cursor: "pointer" }}>
                        {enviandoImgPagina ? "Enviando…" : cfgContato.banner ? "Trocar imagem" : "+ Enviar imagem"}
                      </button>
                      <BotaoEscolherDoSite pasta="paginas/contato" onEscolher={(u) => aplicarImagemPagina("contato", "banner", u)} />
                      {cfgContato.banner && <button onClick={() => setCfgContato((c) => c ? { ...c, banner: null } : c)} style={{ border: "none", background: "transparent", fontSize: 11, color: "#DC2626", cursor: "pointer" }}>Remover</button>}
                    </div>
                    {cfgContato.banner && <div style={{ marginTop: 12 }}>{campo("Alinhamento do recorte", <Seg value={cfgContato.ancora} options={ANC_OPTS} onChange={(v) => setCfgContato((c) => c ? { ...c, ancora: v } : c)} />)}</div>}
                  </Card>
                )}
                {cfgContato.layout === "duas_colunas" && (
                  <Card titulo="Foto (coluna do texto)" aberto onToggle={() => {}}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                      {cfgContato.foto && <img src={cfgContato.foto} alt="" style={{ width: 96, height: 72, objectFit: "cover", borderRadius: 8 }} />}
                      <button onClick={() => pedirImagemPagina("contato", "foto")} disabled={enviandoImgPagina} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--color-border-secondary)", background: "transparent", fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)", cursor: "pointer" }}>
                        {enviandoImgPagina ? "Enviando…" : cfgContato.foto ? "Trocar foto" : "+ Enviar foto"}
                      </button>
                      <BotaoEscolherDoSite pasta="paginas/contato" onEscolher={(u) => aplicarImagemPagina("contato", "foto", u)} />
                      {cfgContato.foto && <button onClick={() => setCfgContato((c) => c ? { ...c, foto: null } : c)} style={{ border: "none", background: "transparent", fontSize: 11, color: "#DC2626", cursor: "pointer" }}>Remover</button>}
                    </div>
                    {cfgContato.foto && <div style={{ marginTop: 12 }}>{campo("Alinhamento do recorte", <Seg value={cfgContato.ancora} options={ANC_OPTS} onChange={(v) => setCfgContato((c) => c ? { ...c, ancora: v } : c)} />)}</div>}
                  </Card>
                )}
                <Card titulo={cfgContato.layout === "minimalista" ? "Texto (opcional)" : "Texto / biografia"} aberto onToggle={() => {}}>
                  <SiteRichEditor value={cfgContato.html ?? ""} onChange={(html) => setCfgContato((c) => c ? { ...c, html } : c)} minHeight={140} pasta="paginas/contato" />
                </Card>
                <Card titulo="Formulário de orçamento" aberto={!!aberto.formContato} onToggle={() => toggle("formContato")}>
                  <FormularioConfigEditor value={normalizarConfig(cfgContato.formulario)} onChange={(f) => setCfgContato((c) => c ? { ...c, formulario: f } : c)} />
                  <p style={{ ...mini, marginTop: 8 }}>Os envios aparecem em <strong>Site → Inbox</strong>.</p>
                </Card>
              </>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, alignItems: "center", marginTop: 12 }}>
              {msg && <span style={{ fontSize: 12, fontWeight: 600, color: msg.startsWith("Erro") ? "#DC2626" : "#059669" }}>{msg}</span>}
              <BotaoSalvarEstado temAlteracoes={estado.temAlteracoes} salvando={salvando} onClick={() => salvar()} />
            </div>
          </div>

          {/* ── COLUNA DIREITA: preview ao vivo ── */}
          <div className="aparencia-preview-wrap">
            <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 10 }}>
              {([["pc", "🖥 Computador"], ["tablet", "▭ Tablet"], ["celular", "▢ Celular"]] as const).map(([k, l]) => (
                <button key={k} onClick={() => setDisp(k)} style={{ padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", border: disp === k ? "1.5px solid #2563EB" : "1px solid var(--color-border-tertiary)", background: disp === k ? "rgba(37,99,235,0.06)" : "transparent", color: disp === k ? "#2563EB" : "var(--color-text-primary)" }}>{l}</button>
              ))}
            </div>
            <Preview design={design} menu={menu} nome={nome} logoUrl={logo} disp={disp} tema={tema}>
              {pagina === "inicio" && <HomeBlocos blocos={design.blocos} dados={dadosPreview} base="#" />}
              {pagina === "grade:portfolio" && (
                <div style={{ maxWidth: "var(--site-largura)", margin: "0 auto", padding: "48px 24px" }}>
                  <h1 className="site-secao-titulo" style={{ fontSize: 30, textAlign: "center", margin: "0 0 44px" }}>Portfólio</h1>
                  <GradeCards config={design.grades.portfolio} itens={portfoliosPrev} />
                </div>
              )}
              {pagina === "grade:trabalhos" && (
                <div style={{ maxWidth: "var(--site-largura)", margin: "0 auto", padding: "48px 24px" }}>
                  <h1 className="site-secao-titulo" style={{ fontSize: 30, textAlign: "center", margin: "0 0 44px" }}>Trabalhos</h1>
                  <GradeCards config={design.grades.trabalhos} itens={trabalhosPrev} />
                </div>
              )}
              {pagina === "grade:videos" && (
                <div style={{ maxWidth: "var(--site-largura)", margin: "0 auto", padding: "48px 24px" }}>
                  <h1 className="site-secao-titulo" style={{ fontSize: 30, textAlign: "center", margin: "0 0 44px" }}>Vídeos</h1>
                  <VideosGrade config={design.grades.videos} videos={videosPrev} />
                </div>
              )}
              {pagina === "pg:sobre" && cfgSobre && (
                <PaginaSobre cfg={cfgSobre} titulo={pgSobre?.titulo ?? "Sobre"} base="#" />
              )}
              {pagina === "pg:contato" && cfgContato && (
                <PaginaContato cfg={cfgContato} titulo={pgContato?.titulo ?? "Solicite seu orçamento"} canais={canaisPreview} fid={fotografo?.id ?? ""} categorias={[]} />
              )}
            </Preview>
            <div style={{ ...mini, marginTop: 8, textAlign: "center" }}>Prévia ao vivo — o site real segue estas escolhas.</div>
          </div>
        </div>
        </>
      )}

      <ModalNaoSalvo
        aberto={estado.modalAberto}
        salvando={salvando}
        onSalvarESair={async () => { if (await salvar()) estado.sairAgora(); }}
        onSairSemSalvar={estado.sairAgora}
        onContinuar={estado.fecharModal}
      />
    </div>
  );
}
