"use client";

// Landing Pages: lista com status e ações (editar, duplicar, excluir).
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fetchAllRows } from "@/lib/supabase/fetchAll";
import { useFotografo } from "@/lib/context/FotografoContext";
import type { SiteLandingPage, SiteLandingAcesso } from "@/lib/supabase/types";

const btnAcao: React.CSSProperties = {
  padding: "6px 10px", borderRadius: 8, border: "1px solid var(--color-border-secondary)",
  background: "var(--color-background-primary)", fontSize: 12, cursor: "pointer",
  color: "var(--color-text-primary)",
};

export default function LandingPagesLista() {
  const router = useRouter();
  const { fotografo } = useFotografo();
  const [paginas, setPaginas] = useState<SiteLandingPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [excluir, setExcluir] = useState<SiteLandingPage | null>(null);
  const [contagens, setContagens] = useState<Record<string, number>>({}); // landing_id → nº de acessos
  const [verAcessos, setVerAcessos] = useState<SiteLandingPage | null>(null);
  const [acessos, setAcessos] = useState<SiteLandingAcesso[] | null>(null);

  const carregar = useCallback(async () => {
    if (!fotografo) return;
    const supabase = createClient();
    const { data } = await supabase.from("site_landing_pages").select("*")
      .eq("fotografo_id", fotografo.id).order("created_at");
    const lista = (data as SiteLandingPage[]) ?? [];
    setPaginas(lista);
    setLoading(false);

    // Contagem de "quem acessou" só das landings com identificação ligada.
    const ids = lista.filter((p) => p.identificacao_obrigatoria).map((p) => p.id);
    if (ids.length) {
      const rows = await fetchAllRows<{ landing_id: string }>(
        (c, from, to) => c.from("site_landing_acessos").select("landing_id").in("landing_id", ids).range(from, to),
        supabase,
      );
      const cont: Record<string, number> = {};
      for (const r of rows) cont[r.landing_id] = (cont[r.landing_id] ?? 0) + 1;
      setContagens(cont);
    } else {
      setContagens({});
    }
  }, [fotografo]);

  async function abrirAcessos(p: SiteLandingPage) {
    setVerAcessos(p);
    setAcessos(null);
    const rows = await fetchAllRows<SiteLandingAcesso>(
      (c, from, to) => c.from("site_landing_acessos").select("*").eq("landing_id", p.id).order("acessado_em", { ascending: false }).range(from, to),
      createClient(),
    );
    setAcessos(rows);
  }

  function copiar(texto: string) {
    navigator.clipboard.writeText(texto).then(() => { setMsg("Copiado!"); setTimeout(() => setMsg(null), 1500); }).catch(() => {});
  }

  useEffect(() => { carregar(); }, [carregar]);

  // Slug livre: {slug}-copia, -copia-2, -copia-3… (o slug é único por fotógrafo)
  function slugDeCopia(base: string, usados: Set<string>): string {
    let s = `${base}-copia`;
    for (let i = 2; usados.has(s); i++) s = `${base}-copia-${i}`;
    return s;
  }

  async function duplicar(p: SiteLandingPage) {
    if (!fotografo || ocupado) return;
    setOcupado(true); setMsg(null);
    const usados = new Set(paginas.map((x) => x.slug));
    const { data, error } = await createClient().from("site_landing_pages").insert({
      fotografo_id: fotografo.id,
      titulo: `${p.titulo} (cópia)`,
      slug: slugDeCopia(p.slug, usados),
      publicado: false,           // cópia NUNCA entra no ar sozinha (regra-mãe de SEO)
      identificacao_obrigatoria: p.identificacao_obrigatoria,
      identificacao_modo: p.identificacao_modo,
      dados: p.dados,
      seo_title: p.seo_title, seo_description: p.seo_description, seo_keywords: p.seo_keywords,
      seo_noindex: p.seo_noindex, og_title: p.og_title, og_description: p.og_description,
      og_image_url: p.og_image_url,
    }).select("id").single();
    setOcupado(false);
    if (error || !data) { setMsg("Erro ao duplicar: " + (error?.message ?? "")); return; }
    router.push(`/site/landing-pages/${(data as { id: string }).id}`);
  }

  async function confirmarExcluir() {
    if (!excluir || ocupado) return;
    setOcupado(true);
    const { error } = await createClient().from("site_landing_pages").delete().eq("id", excluir.id);
    setOcupado(false);
    if (error) { setMsg("Erro ao excluir: " + error.message); return; }
    setExcluir(null);
    carregar();
  }

  // NÃO cria registro aqui: abrir o editor em branco (/nova) e só gravar no primeiro Salvar.
  // Antes o clique já inseria "Nova landing page" no banco, e sair sem salvar deixava rascunho solto.
  function criar() {
    router.push("/site/landing-pages/nova");
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--color-text-primary)", margin: 0, letterSpacing: "-0.02em" }}>Landing Pages</h1>
        <button onClick={criar}
          style={{ padding: "9px 18px", borderRadius: 9, border: "none", background: "var(--color-text-primary)", color: "var(--color-background-primary)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          + Nova landing page
        </button>
      </div>
      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 16px" }}>
        Páginas de orçamento/venda com URL própria (ex.: /orcamento-casamento), montadas por blocos com prévia ao vivo.
      </p>
      {msg && (
        <div style={{ fontSize: 12, color: "#DC2626", marginBottom: 14, cursor: "pointer" }} onClick={() => setMsg(null)}>{msg} ✕</div>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {paginas.map((p) => (
            <div key={p.id} onClick={() => router.push(`/site/landing-pages/${p.id}`)}
              style={{ border: "1px solid var(--color-border-tertiary)", borderRadius: 10, padding: "13px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-background-secondary)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)" }}>{p.titulo}</div>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)", fontFamily: "monospace" }}>/{p.slug}</div>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, flexShrink: 0, background: p.publicado ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.15)", color: p.publicado ? "#059669" : "#B45309" }}>
                {p.publicado ? "Publicada" : "Rascunho"}
              </span>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                {p.identificacao_obrigatoria && (
                  <button title="Quem acessou" style={{ ...btnAcao, fontWeight: 700 }} onClick={() => abrirAcessos(p)}>
                    👥 {contagens[p.id] ?? 0}
                  </button>
                )}
                <button title="Editar" style={btnAcao} onClick={() => router.push(`/site/landing-pages/${p.id}`)}>✏️</button>
                <button title="Duplicar" style={btnAcao} disabled={ocupado} onClick={() => duplicar(p)}>⧉</button>
                <button title="Excluir" style={{ ...btnAcao, color: "#DC2626" }} onClick={() => setExcluir(p)}>🗑</button>
              </div>
            </div>
          ))}
          {paginas.length === 0 && (
            <div style={{ padding: "40px 20px", borderRadius: 12, border: "1px dashed var(--color-border-secondary)", textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)", background: "var(--color-background-secondary)" }}>
              Nenhuma landing page ainda.
            </div>
          )}
        </div>
      )}

      {/* Quem acessou — lista de identificações capturadas nesta landing */}
      {verAcessos && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}
          onClick={() => setVerAcessos(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--color-background-primary)", borderRadius: 14, padding: 24, maxWidth: 560, width: "100%", maxHeight: "82vh", display: "flex", flexDirection: "column", boxShadow: "0 10px 40px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 4 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: "var(--color-text-primary)" }}>👥 Quem acessou</div>
                <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{verAcessos.titulo}</div>
              </div>
              <button onClick={() => setVerAcessos(null)} style={{ ...btnAcao, flexShrink: 0 }}>Fechar</button>
            </div>

            {acessos === null ? (
              <div style={{ padding: "30px 0", textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>
            ) : acessos.length === 0 ? (
              <div style={{ padding: "30px 0", textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Ninguém acessou esta proposta ainda.</div>
            ) : (
              <>
                <div style={{ display: "flex", gap: 8, margin: "12px 0", flexWrap: "wrap" }}>
                  <button style={btnAcao} onClick={() => copiar(acessos.filter((a) => a.telefone).map((a) => a.telefone).join("\n"))}>Copiar WhatsApps</button>
                  <button style={btnAcao} onClick={() => copiar(acessos.filter((a) => a.email).map((a) => a.email).join("\n"))}>Copiar e-mails</button>
                </div>
                <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
                  {acessos.map((a) => {
                    const digitos = (a.telefone ?? "").replace(/\D/g, "");
                    return (
                      <div key={a.id} style={{ border: "1px solid var(--color-border-tertiary)", borderRadius: 9, padding: "10px 12px", display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--color-text-primary)" }}>{a.nome || "(sem nome)"}</div>
                          <div style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "flex", gap: 10, flexWrap: "wrap", marginTop: 2 }}>
                            {a.telefone && (
                              <a href={`https://wa.me/${digitos}`} target="_blank" rel="noopener noreferrer" style={{ color: "#059669", fontWeight: 600, textDecoration: "none" }}>💬 {a.telefone}</a>
                            )}
                            {a.email && <span>✉ {a.email}</span>}
                          </div>
                        </div>
                        <div style={{ fontSize: 11, color: "var(--color-text-secondary)", flexShrink: 0, textAlign: "right" }}>
                          {new Date(a.acessado_em).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" })}<br />
                          {new Date(a.acessado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Excluir — modal do sistema (nunca o confirm() do navegador) */}
      {excluir && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}
          onClick={() => setExcluir(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--color-background-primary)", borderRadius: 14, padding: 24, maxWidth: 420, width: "100%", boxShadow: "0 10px 40px rgba(0,0,0,0.2)" }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#DC2626", marginBottom: 8 }}>🗑 Excluir landing page</div>
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 20px", lineHeight: 1.6 }}>
              Excluir <strong style={{ color: "var(--color-text-primary)" }}>{excluir.titulo}</strong>?
              {excluir.publicado && <><br />Ela está <strong>publicada</strong> — o endereço <code>/{excluir.slug}</code> deixará de existir.</>}
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setExcluir(null)} style={{ ...btnAcao, flex: 1, padding: "10px" }}>Cancelar</button>
              <button onClick={confirmarExcluir} disabled={ocupado}
                style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: "#DC2626", color: "#fff", fontSize: 13, fontWeight: 700, cursor: ocupado ? "default" : "pointer" }}>
                {ocupado ? "Excluindo…" : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
