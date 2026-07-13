"use client";

// PÁGINAS E MENU (unificado): uma lista ordenada que É o menu do topo do site.
// Cada item é uma PÁGINA (conteúdo editável), uma SEÇÃO embutida (Início/Portfólio/Blog,
// conteúdo vem de Galerias/Blog) ou um LINK externo. Arrastar reordena; 👁 mostra/oculta
// no topo sem apagar; "Editar conteúdo" abre o editor da página; "+ Adicionar" cria.
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import type { SiteMenuItem, SiteMenuTipo, SitePagina } from "@/lib/supabase/types";

const SECOES = [
  { href: "/", label: "Início" },
  { href: "/portfolio", label: "Portfólio" },
  { href: "/blog", label: "Blog" },
] as const;

const TAG: Record<SiteMenuTipo, { icone: string; nome: string; cor: string; fundo: string }> = {
  pagina: { icone: "📄", nome: "Página", cor: "#1D4ED8", fundo: "rgba(37,99,235,0.10)" },
  secao:  { icone: "🗂", nome: "Seção",  cor: "#7C3AED", fundo: "rgba(124,58,237,0.10)" },
  link:   { icone: "🔗", nome: "Link",   cor: "#059669", fundo: "rgba(16,185,129,0.10)" },
};

function slugify(v: string) {
  return v.normalize("NFD").replace(/[^\x20-\x7E]/g, "").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

const inputStyle: React.CSSProperties = {
  padding: "8px 11px", borderRadius: 8, boxSizing: "border-box",
  border: "1px solid var(--color-border-secondary)", fontSize: 13,
  background: "var(--color-background-primary)", color: "var(--color-text-primary)",
};
const btnPri: React.CSSProperties = { padding: "9px 16px", borderRadius: 9, border: "none", background: "var(--color-text-primary)", color: "var(--color-background-primary)", fontSize: 13, fontWeight: 700, cursor: "pointer" };
const btnSec: React.CSSProperties = { padding: "8px 14px", borderRadius: 8, border: "1px solid var(--color-border-secondary)", background: "transparent", fontSize: 12.5, fontWeight: 600, color: "var(--color-text-primary)", cursor: "pointer" };

export default function PaginasMenuPage() {
  const { fotografo } = useFotografo();
  const router = useRouter();
  const [itens, setItens] = useState<SiteMenuItem[]>([]);
  const [paginas, setPaginas] = useState<SitePagina[]>([]);
  const [loading, setLoading] = useState(true);
  const [add, setAdd] = useState<null | "pagina" | "link" | "secao">(null);
  const [novoTitulo, setNovoTitulo] = useState("");
  const [novoSlug, setNovoSlug] = useState("");
  const [novoUrl, setNovoUrl] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const dragIdx = useRef<number | null>(null);
  const [sobreIdx, setSobreIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!fotografo) return;
    const sb = createClient();
    Promise.all([
      sb.from("site_menu").select("*").eq("fotografo_id", fotografo.id).order("ordem"),
      sb.from("site_paginas").select("id, titulo, slug, tipo").eq("fotografo_id", fotografo.id),
    ]).then(([m, p]) => {
      setItens((m.data as SiteMenuItem[]) ?? []);
      setPaginas((p.data as SitePagina[]) ?? []);
      setLoading(false);
    });
  }, [fotografo]);

  const paginaDoItem = (it: SiteMenuItem) => paginas.find((p) => `/${p.slug}` === it.href);
  const proxOrdem = () => (itens.length > 0 ? Math.max(...itens.map((i) => i.ordem)) + 1 : 0);
  const secoesDisponiveis = SECOES.filter((s) => !itens.some((i) => i.href === s.href));

  async function salvarCampo(id: string, patch: Partial<SiteMenuItem>) {
    await createClient().from("site_menu").update(patch).eq("id", id);
  }
  async function alternarVisivel(it: SiteMenuItem) {
    const novo = !it.visivel;
    setItens((prev) => prev.map((i) => i.id === it.id ? { ...i, visivel: novo } : i));
    await salvarCampo(it.id, { visivel: novo });
  }

  async function remover(it: SiteMenuItem) {
    const pg = it.tipo === "pagina" ? paginaDoItem(it) : null;
    const conf = pg ? `Excluir a página "${it.label}"? Ela sai do site e o conteúdo é apagado.` : `Remover "${it.label}" do menu?`;
    if (!confirm(conf)) return;
    const sb = createClient();
    await sb.from("site_menu").delete().eq("id", it.id);
    if (pg) await sb.from("site_paginas").delete().eq("id", pg.id);
    setItens((prev) => prev.filter((i) => i.id !== it.id));
    if (pg) setPaginas((prev) => prev.filter((p) => p.id !== pg.id));
  }

  async function soltar(destino: number) {
    const origem = dragIdx.current; dragIdx.current = null; setSobreIdx(null);
    if (origem === null || origem === destino || !fotografo) return;
    const novas = [...itens];
    const [mv] = novas.splice(origem, 1); novas.splice(destino, 0, mv);
    const reord = novas.map((i, idx) => ({ ...i, ordem: idx }));
    setItens(reord);
    await createClient().from("site_menu")
      .upsert(reord.map((i) => ({ id: i.id, fotografo_id: fotografo.id, label: i.label, href: i.href, tipo: i.tipo, ordem: i.ordem, visivel: i.visivel })), { onConflict: "id" });
  }

  async function adicionarSecao(href: string, label: string) {
    if (!fotografo) return;
    const { data } = await createClient().from("site_menu").insert({ fotografo_id: fotografo.id, label, href, tipo: "secao", ordem: proxOrdem(), visivel: true }).select("*").single();
    if (data) setItens((prev) => [...prev, data as SiteMenuItem]);
    setAdd(null);
  }
  async function adicionarLink() {
    if (!fotografo || !novoTitulo.trim() || !novoUrl.trim()) return;
    let url = novoUrl.trim(); if (!/^https?:\/\//.test(url)) url = "https://" + url;
    const { data } = await createClient().from("site_menu").insert({ fotografo_id: fotografo.id, label: novoTitulo.trim(), href: url, tipo: "link", ordem: proxOrdem(), visivel: true }).select("*").single();
    if (data) setItens((prev) => [...prev, data as SiteMenuItem]);
    setAdd(null); setNovoTitulo(""); setNovoUrl("");
  }
  async function adicionarPagina() {
    if (!fotografo || !novoTitulo.trim()) return;
    const titulo = novoTitulo.trim();
    const slug = (novoSlug.trim() || slugify(titulo)) || "pagina";
    setMsg(null);
    const sb = createClient();
    const { data: pg, error } = await sb.from("site_paginas").insert({ fotografo_id: fotografo.id, tipo: "custom", titulo, slug, conteudo: {}, publicado: true }).select("*").single();
    if (error) { setMsg(error.code === "23505" ? `Já existe uma página com o endereço "/${slug}".` : "Erro: " + error.message); return; }
    const { data: it } = await sb.from("site_menu").insert({ fotografo_id: fotografo.id, label: titulo, href: `/${slug}`, tipo: "pagina", ordem: proxOrdem(), visivel: true }).select("*").single();
    if (pg) setPaginas((prev) => [...prev, pg as SitePagina]);
    if (it) setItens((prev) => [...prev, it as SiteMenuItem]);
    setAdd(null); setNovoTitulo(""); setNovoSlug("");
    if (pg) router.push(`/site/paginas?editar=${(pg as SitePagina).id}`);
  }

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "40px 24px" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--color-text-primary)", margin: "0 0 6px", letterSpacing: "-0.02em" }}>Páginas e Menu</h1>
      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 20px", lineHeight: 1.6 }}>
        Organize as páginas do seu site e o menu do topo no mesmo lugar. <strong>Arraste para reordenar</strong> — a ordem aqui é a ordem no topo. Use o 👁 para mostrar/ocultar um item sem apagá-lo.
      </p>

      {/* + Adicionar */}
      <div style={{ marginBottom: 20 }}>
        {add === null ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => { setAdd("pagina"); setNovoTitulo(""); setNovoSlug(""); }} style={btnSec}>📄 Nova página</button>
            <button onClick={() => { setAdd("link"); setNovoTitulo(""); setNovoUrl(""); }} style={btnSec}>🔗 Link externo</button>
            {secoesDisponiveis.length > 0 && <button onClick={() => setAdd("secao")} style={btnSec}>🗂 Adicionar seção</button>}
          </div>
        ) : (
          <div style={{ border: "1px solid var(--color-border-tertiary)", borderRadius: 12, padding: 16, background: "var(--color-background-secondary)" }}>
            {add === "pagina" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--color-text-primary)" }}>📄 Nova página</div>
                <input autoFocus value={novoTitulo} onChange={(e) => { setNovoTitulo(e.target.value); setNovoSlug(slugify(e.target.value)); }} placeholder="Título da página (ex.: Serviços)" style={inputStyle} />
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 12, color: "var(--color-text-secondary)", fontFamily: "monospace" }}>endereço: /</span>
                  <input value={novoSlug} onChange={(e) => setNovoSlug(slugify(e.target.value))} placeholder="servicos" style={{ ...inputStyle, flex: 1, fontFamily: "monospace" }} />
                </div>
                {msg && <span style={{ fontSize: 12, fontWeight: 600, color: "#DC2626" }}>{msg}</span>}
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button onClick={() => { setAdd(null); setMsg(null); }} style={btnSec}>Cancelar</button>
                  <button onClick={adicionarPagina} disabled={!novoTitulo.trim()} style={{ ...btnPri, opacity: novoTitulo.trim() ? 1 : 0.6 }}>Criar e editar</button>
                </div>
              </div>
            )}
            {add === "link" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--color-text-primary)" }}>🔗 Link externo</div>
                <input autoFocus value={novoTitulo} onChange={(e) => setNovoTitulo(e.target.value)} placeholder="Texto do item (ex.: Instagram)" style={inputStyle} />
                <input value={novoUrl} onChange={(e) => setNovoUrl(e.target.value)} placeholder="https://instagram.com/seuperfil" style={{ ...inputStyle, fontFamily: "monospace" }} />
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button onClick={() => setAdd(null)} style={btnSec}>Cancelar</button>
                  <button onClick={adicionarLink} disabled={!novoTitulo.trim() || !novoUrl.trim()} style={{ ...btnPri, opacity: novoTitulo.trim() && novoUrl.trim() ? 1 : 0.6 }}>Adicionar</button>
                </div>
              </div>
            )}
            {add === "secao" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--color-text-primary)" }}>🗂 Adicionar seção</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {secoesDisponiveis.map((s) => (
                    <button key={s.href} onClick={() => adicionarSecao(s.href, s.label)} style={btnSec}>{s.label} <span style={{ color: "var(--color-text-secondary)", fontFamily: "monospace", fontSize: 11 }}>{s.href}</span></button>
                  ))}
                  {secoesDisponiveis.length === 0 && <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Todas as seções já estão no menu.</span>}
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button onClick={() => setAdd(null)} style={btnSec}>Fechar</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{ padding: 40, textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>
      ) : itens.length === 0 ? (
        <div style={{ padding: "40px 20px", borderRadius: 12, border: "1px dashed var(--color-border-secondary)", textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)", background: "var(--color-background-secondary)" }}>
          Nenhuma página ou item de menu ainda. Use “+ Adicionar” acima.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {itens.map((it, idx) => {
            const tag = TAG[it.tipo];
            const pg = it.tipo === "pagina" ? paginaDoItem(it) : null;
            return (
              <div key={it.id} draggable
                onDragStart={() => { dragIdx.current = idx; }}
                onDragOver={(e) => { e.preventDefault(); if (sobreIdx !== idx) setSobreIdx(idx); }}
                onDragLeave={() => { if (sobreIdx === idx) setSobreIdx(null); }}
                onDrop={(e) => { e.preventDefault(); soltar(idx); }}
                onDragEnd={() => { dragIdx.current = null; setSobreIdx(null); }}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, cursor: "grab",
                  border: sobreIdx === idx ? "2px solid #2563EB" : "1px solid var(--color-border-tertiary)",
                  background: "var(--color-background-primary)", opacity: it.visivel ? 1 : 0.55 }}>
                <span style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>⠿</span>
                <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 8, color: tag.cor, background: tag.fundo, flex: "0 0 auto" }}>{tag.icone} {tag.nome}</span>
                <input value={it.label}
                  onChange={(e) => setItens((prev) => prev.map((i) => i.id === it.id ? { ...i, label: e.target.value } : i))}
                  onBlur={(e) => salvarCampo(it.id, { label: e.target.value })}
                  style={{ ...inputStyle, flex: 1, minWidth: 100, fontWeight: 600 }} />
                {it.tipo === "link" ? (
                  <input value={it.href}
                    onChange={(e) => setItens((prev) => prev.map((i) => i.id === it.id ? { ...i, href: e.target.value } : i))}
                    onBlur={(e) => { let u = e.target.value.trim(); if (u && !/^https?:\/\//.test(u)) u = "https://" + u; salvarCampo(it.id, { href: u }); }}
                    style={{ ...inputStyle, flex: 1, minWidth: 120, fontFamily: "monospace", fontSize: 12 }} />
                ) : (
                  <span style={{ fontSize: 12, color: "var(--color-text-secondary)", fontFamily: "monospace", flex: "0 0 auto" }}>{it.href}</span>
                )}
                {it.tipo === "pagina" && pg && (
                  <button onClick={() => router.push(`/site/paginas?editar=${pg.id}`)} style={{ ...btnSec, padding: "6px 11px", fontSize: 12, flex: "0 0 auto" }}>Editar conteúdo →</button>
                )}
                <button onClick={() => alternarVisivel(it)} title={it.visivel ? "Ocultar do menu do topo" : "Mostrar no menu do topo"} style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 14, flex: "0 0 auto" }}>{it.visivel ? "👁" : "🚫"}</button>
                <button onClick={() => remover(it)} title={it.tipo === "pagina" ? "Excluir página" : "Remover do menu"} style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 13, color: "#DC2626", flex: "0 0 auto" }}>🗑</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
