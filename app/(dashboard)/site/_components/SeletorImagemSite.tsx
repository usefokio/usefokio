"use client";

// "Escolher do site": reaproveita uma imagem já existente no site (banner ou capa de trabalho/coleção/post)
// como capa/imagem em OUTRA área (blog, páginas, editor de texto). Faz CÓPIA independente da imagem para a
// pasta do destino — excluir a origem não quebra o reuso. Não entra no fluxo de fotos de trabalho/portfólio.
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchAllRows } from "@/lib/supabase/fetchAll";
import { useFotografo } from "@/lib/context/FotografoContext";
import { copyFileClient } from "@/lib/storage/copyClient";

type Fonte = "banners" | "trabalhos" | "colecoes" | "blog";
type Item = { id: string; url: string; titulo: string };

const ABAS: { id: Fonte; nome: string }[] = [
  { id: "banners", nome: "Banners" },
  { id: "trabalhos", nome: "Trabalhos" },
  { id: "colecoes", nome: "Coleções" },
  { id: "blog", nome: "Blog" },
];

// ── Modal: grade de imagens do site, agrupadas por fonte ────────────────────────
function SeletorImagemSite({ onFechar, onSelecionar, ocupado, erro }: {
  onFechar: () => void;
  onSelecionar: (url: string, titulo: string) => void;
  ocupado: boolean;
  erro: string;
}) {
  const { fotografo } = useFotografo();
  const [aba, setAba] = useState<Fonte>("banners");
  const [carregando, setCarregando] = useState(true);
  const [fontes, setFontes] = useState<Record<Fonte, Item[]>>({ banners: [], trabalhos: [], colecoes: [], blog: [] });

  useEffect(() => {
    if (!fotografo) return;
    const sb = createClient();
    const fid = fotografo.id;
    async function carregar() {
      const [banners, trabalhos, colecoes, blog] = await Promise.all([
        fetchAllRows<{ id: string; imagem_url: string; titulo: string | null }>(
          (c, from, to) => c.from("site_banners").select("id, imagem_url, titulo").eq("fotografo_id", fid).order("ordem").range(from, to), sb),
        fetchAllRows<{ id: string; titulo: string; capa_url: string | null }>(
          (c, from, to) => c.from("site_trabalhos").select("id, titulo, capa_url").eq("fotografo_id", fid).not("capa_url", "is", null).order("titulo").range(from, to), sb),
        fetchAllRows<{ id: string; titulo: string; capa_url: string | null }>(
          (c, from, to) => c.from("site_portfolios").select("id, titulo, capa_url").eq("fotografo_id", fid).not("capa_url", "is", null).order("titulo").range(from, to), sb),
        fetchAllRows<{ id: string; titulo: string; capa_url: string | null }>(
          (c, from, to) => c.from("site_posts").select("id, titulo, capa_url").eq("fotografo_id", fid).not("capa_url", "is", null).order("titulo").range(from, to), sb),
      ]);
      setFontes({
        banners: banners.map((b) => ({ id: b.id, url: b.imagem_url, titulo: b.titulo || "Banner" })),
        trabalhos: trabalhos.map((t) => ({ id: t.id, url: t.capa_url as string, titulo: t.titulo })),
        colecoes: colecoes.map((p) => ({ id: p.id, url: p.capa_url as string, titulo: p.titulo })),
        blog: blog.map((p) => ({ id: p.id, url: p.capa_url as string, titulo: p.titulo })),
      });
      setCarregando(false);
    }
    carregar();
  }, [fotografo]);

  const lista = fontes[aba];

  return (
    <div onClick={() => !ocupado && onFechar()} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ position: "relative", background: "var(--color-background-primary)", borderRadius: 14, width: "100%", maxWidth: 880, maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.3)", overflow: "hidden" }}>
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--color-border-tertiary)" }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: "var(--color-text-primary)" }}>Escolher uma imagem do site</div>
          <button onClick={onFechar} style={{ border: "none", background: "transparent", fontSize: 20, color: "var(--color-text-secondary)", cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>

        {/* abas */}
        <div style={{ display: "flex", gap: 4, padding: "10px 16px", borderBottom: "1px solid var(--color-border-tertiary)", flexWrap: "wrap" }}>
          {ABAS.map((a) => (
            <button key={a.id} onClick={() => setAba(a.id)}
              style={{ padding: "7px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13,
                fontWeight: aba === a.id ? 700 : 500,
                background: aba === a.id ? "var(--color-background-tertiary)" : "transparent",
                color: aba === a.id ? "var(--color-text-primary)" : "var(--color-text-secondary)" }}>
              {a.nome} {fontes[a.id].length > 0 && <span style={{ opacity: 0.6 }}>({fontes[a.id].length})</span>}
            </button>
          ))}
        </div>

        {/* grade */}
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 16 }}>
          {carregando ? (
            <div style={{ padding: 40, textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>
          ) : lista.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Nada aqui ainda.</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
              {lista.map((it) => (
                <button key={it.id} onClick={() => !ocupado && onSelecionar(it.url, it.titulo)} title={it.titulo}
                  style={{ display: "block", padding: 0, border: "1px solid var(--color-border-tertiary)", borderRadius: 10, overflow: "hidden", background: "var(--color-background-secondary)", cursor: ocupado ? "default" : "pointer", textAlign: "left" }}>
                  <img src={it.url} alt="" loading="lazy" style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", display: "block" }} />
                  <div style={{ padding: "6px 8px", fontSize: 11, color: "var(--color-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.titulo}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 20px", borderTop: "1px solid var(--color-border-tertiary)" }}>
          <span style={{ fontSize: 12, color: erro ? "#DC2626" : "var(--color-text-secondary)" }}>
            {erro || "A imagem escolhida é copiada para o destino (fica independente da origem)."}
          </span>
          <button onClick={onFechar} disabled={ocupado}
            style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--color-border-secondary)", background: "transparent", fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", cursor: "pointer" }}>
            Fechar
          </button>
        </div>

        {/* overlay durante a cópia */}
        {ocupado && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#fff" }}>Copiando imagem…</div>
        )}
      </div>
    </div>
  );
}

// ── Botão gatilho: abre o seletor e copia a escolhida para a pasta do destino ───
export function BotaoEscolherDoSite({ pasta, onEscolher, rotulo = "Escolher do site", estilo }: {
  pasta: string;
  onEscolher: (url: string, meta: { titulo: string }) => void;
  rotulo?: string;
  estilo?: React.CSSProperties;
}) {
  const { fotografo } = useFotografo();
  const [aberto, setAberto] = useState(false);
  const [copiando, setCopiando] = useState(false);
  const [erro, setErro] = useState("");

  async function escolher(url: string, titulo: string) {
    if (!fotografo || copiando) return;
    setCopiando(true); setErro("");
    try {
      const base = titulo.normalize("NFD").replace(/[^\x20-\x7E]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "reuso";
      const path = `site/${fotografo.id}/${pasta}/${base}-${crypto.randomUUID().slice(0, 6)}.jpg`;
      const { url_publica } = await copyFileClient(url, path);
      onEscolher(url_publica, { titulo });
      setAberto(false);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao copiar a imagem.");
    } finally {
      setCopiando(false);
    }
  }

  return (
    <>
      <button type="button" disabled={copiando} onClick={() => { setErro(""); setAberto(true); }}
        style={estilo ?? { display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "1px solid var(--color-border-secondary)", background: "transparent", fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)", cursor: "pointer" }}>
        {copiando ? "Copiando…" : `🖼️ ${rotulo}`}
      </button>
      {aberto && (
        <SeletorImagemSite onFechar={() => setAberto(false)} onSelecionar={escolher} ocupado={copiando} erro={erro} />
      )}
    </>
  );
}
