"use client";

// GESTÃO DE CATEGORIAS do portfólio (por fotógrafo). As categorias nascem sozinhas ao
// criar um trabalho (conta nova começa vazia). Aqui o fotógrafo RENOMEIA (nome de exibição),
// REORDENA (arrastar — a ordem vale na barra do site), OCULTA do menu (sem apagar) e
// EXCLUI as vazias. O SLUG entra na URL do site, então é PERMANENTE (SEO) — não editável.
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fetchAllRows } from "@/lib/supabase/fetchAll";
import { useFotografo } from "@/lib/context/FotografoContext";
import type { SiteCategoria } from "@/lib/supabase/types";

const inputStyle: React.CSSProperties = {
  padding: "8px 11px", borderRadius: 8, boxSizing: "border-box",
  border: "1px solid var(--color-border-secondary)", fontSize: 13,
  background: "var(--color-background-primary)", color: "var(--color-text-primary)",
};
const btnPri: React.CSSProperties = { padding: "8px 16px", borderRadius: 9, border: "none", background: "var(--color-text-primary)", color: "var(--color-background-primary)", fontSize: 13, fontWeight: 700, cursor: "pointer" };
const btnSec: React.CSSProperties = { padding: "8px 14px", borderRadius: 8, border: "1px solid var(--color-border-secondary)", background: "transparent", fontSize: 12.5, fontWeight: 600, color: "var(--color-text-primary)", cursor: "pointer" };

export default function CategoriasPage() {
  const router = useRouter();
  const { fotografo } = useFotografo();
  const [cats, setCats] = useState<SiteCategoria[]>([]);
  const [contagem, setContagem] = useState<Record<string, number>>({});
  const [contagemPort, setContagemPort] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState<string | null>(null);
  const [edNome, setEdNome] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const dragIdx = useRef<number | null>(null);
  const [sobreIdx, setSobreIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!fotografo) return;
    const sb = createClient();
    async function carregar() {
      const [{ data: categorias }, trabalhos, colecoes] = await Promise.all([
        sb.from("site_categorias").select("*").eq("fotografo_id", fotografo!.id).order("ordem"),
        fetchAllRows<{ categoria: string }>(
          (s, from, to) => s.from("site_trabalhos").select("categoria").eq("fotografo_id", fotografo!.id).range(from, to),
          sb,
        ),
        fetchAllRows<{ categoria: string }>(
          (s, from, to) => s.from("site_portfolios").select("categoria").eq("fotografo_id", fotografo!.id).range(from, to),
          sb,
        ),
      ]);
      const cont: Record<string, number> = {};
      for (const t of trabalhos ?? []) cont[t.categoria] = (cont[t.categoria] ?? 0) + 1;
      const contPort: Record<string, number> = {};
      for (const p of colecoes ?? []) if (p.categoria) contPort[p.categoria] = (contPort[p.categoria] ?? 0) + 1;
      setCats((categorias as SiteCategoria[]) ?? []);
      setContagem(cont);
      setContagemPort(contPort);
      setLoading(false);
    }
    carregar();
  }, [fotografo]);

  const totalTrabalhos = useMemo(() => Object.values(contagem).reduce((a, b) => a + b, 0), [contagem]);

  function iniciarEdicao(c: SiteCategoria) { setEditando(c.id); setEdNome(c.nome); setMsg(null); }
  async function salvarNome(c: SiteCategoria) {
    const nome = edNome.trim() || c.nome;
    setCats((prev) => prev.map((x) => x.id === c.id ? { ...x, nome } : x));
    setEditando(null);
    await createClient().from("site_categorias").update({ nome }).eq("id", c.id);
  }

  async function alternarAtivo(c: SiteCategoria) {
    const ativo = !c.ativo;
    setCats((prev) => prev.map((x) => x.id === c.id ? { ...x, ativo } : x));
    await createClient().from("site_categorias").update({ ativo }).eq("id", c.id);
  }

  async function excluir(c: SiteCategoria) {
    const n = contagem[c.slug] ?? 0;
    const nPort = contagemPort[c.slug] ?? 0;
    if (n > 0 || nPort > 0) {
      const usos = [n > 0 ? `${n} trabalho(s)` : "", nPort > 0 ? `${nPort} coleção(ões)` : ""].filter(Boolean).join(" e ");
      setMsg(`"${c.nome}" tem ${usos}. Mova ou exclua antes de apagar a categoria.`);
      return;
    }
    if (!confirm(`Excluir a categoria "${c.nome}"? (ela não tem trabalhos)`)) return;
    setCats((prev) => prev.filter((x) => x.id !== c.id));
    await createClient().from("site_categorias").delete().eq("id", c.id);
  }

  async function soltar(destino: number) {
    const origem = dragIdx.current; dragIdx.current = null; setSobreIdx(null);
    if (origem === null || origem === destino || !fotografo) return;
    const novas = [...cats];
    const [mv] = novas.splice(origem, 1); novas.splice(destino, 0, mv);
    const reord = novas.map((c, i) => ({ ...c, ordem: i }));
    setCats(reord);
    await createClient().from("site_categorias")
      .upsert(reord.map((c) => ({ id: c.id, fotografo_id: fotografo.id, slug: c.slug, nome: c.nome, ordem: c.ordem, ativo: c.ativo })), { onConflict: "id" });
  }

  const acao: React.CSSProperties = { border: "none", background: "transparent", cursor: "pointer", flex: "0 0 auto", width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, borderRadius: 7 };

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "40px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--color-text-primary)", margin: 0, letterSpacing: "-0.02em" }}>Categorias</h1>
        <button onClick={() => router.push("/site/galerias")} style={btnSec}>← Voltar para Galerias</button>
      </div>
      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 20px", lineHeight: 1.6 }}>
        As categorias nascem sozinhas quando você cria um trabalho. Aqui você <strong>renomeia</strong>, <strong>reordena</strong> (arraste — a ordem vale na barra do portfólio), <strong>oculta</strong> do menu do site ou <strong>exclui</strong> as vazias. O endereço (slug) da categoria é fixo para não perder o Google.
      </p>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>
      ) : cats.length === 0 ? (
        <div style={{ padding: "40px 20px", borderRadius: 12, border: "1px dashed var(--color-border-secondary)", textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)", background: "var(--color-background-secondary)" }}>
          Nenhuma categoria ainda. Ao criar seu primeiro trabalho, a categoria que você digitar aparece aqui.
          <div style={{ marginTop: 14 }}>
            <button onClick={() => router.push("/site/galerias/trabalho/novo")} style={btnPri}>+ Novo trabalho</button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {cats.map((c, idx) => {
            const emEdicao = editando === c.id;
            const n = contagem[c.slug] ?? 0;
            const nPort = contagemPort[c.slug] ?? 0;
            const emUso = n > 0 || nPort > 0;
            return (
              <div key={c.id} draggable={!emEdicao}
                onDragStart={() => { if (!emEdicao) dragIdx.current = idx; }}
                onDragOver={(e) => { e.preventDefault(); if (sobreIdx !== idx) setSobreIdx(idx); }}
                onDragLeave={() => { if (sobreIdx === idx) setSobreIdx(null); }}
                onDrop={(e) => { e.preventDefault(); soltar(idx); }}
                onDragEnd={() => { dragIdx.current = null; setSobreIdx(null); }}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px 8px 12px", borderRadius: 10, cursor: emEdicao ? "default" : "grab",
                  border: sobreIdx === idx ? "2px solid #2563EB" : "1px solid var(--color-border-tertiary)",
                  background: "var(--color-background-primary)", opacity: c.ativo || emEdicao ? 1 : 0.55 }}>
                {emEdicao ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
                    <input autoFocus value={edNome} onChange={(e) => setEdNome(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") salvarNome(c); if (e.key === "Escape") setEditando(null); }}
                      placeholder="Nome da categoria (aparece no site)" style={{ ...inputStyle, flex: 1, fontWeight: 600 }} />
                    <button onClick={() => setEditando(null)} style={btnSec}>Cancelar</button>
                    <button onClick={() => salvarNome(c)} style={btnPri}>Salvar</button>
                  </div>
                ) : (
                  <>
                    <span style={{ color: "var(--color-text-tertiary)", fontSize: 14, flex: "0 0 auto", width: 14 }}>⠿</span>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.nome}</span>
                    <span style={{ fontSize: 12, color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>
                      {n} {n === 1 ? "trabalho" : "trabalhos"}{nPort > 0 ? ` · ${nPort} ${nPort === 1 ? "coleção" : "coleções"}` : ""}
                    </span>
                    <span style={{ fontSize: 11.5, color: "var(--color-text-tertiary)", fontFamily: "monospace", flex: "0 1 auto", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>/{c.slug}</span>
                    <button onClick={() => alternarAtivo(c)} title={c.ativo ? "Ocultar da barra do portfólio" : "Mostrar na barra do portfólio"} style={acao}>{c.ativo ? "👁" : "🚫"}</button>
                    <button onClick={() => iniciarEdicao(c)} title="Renomear" style={acao}>✏️</button>
                    <button onClick={() => excluir(c)} title={emUso ? "Só é possível excluir categorias sem trabalhos nem coleções" : "Excluir"} style={{ ...acao, fontSize: 13, color: emUso ? "var(--color-text-tertiary)" : "#DC2626", cursor: emUso ? "not-allowed" : "pointer" }}>🗑</button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {msg && <div style={{ marginTop: 14, fontSize: 12.5, fontWeight: 600, color: "#B45309", background: "rgba(245,158,11,0.12)", padding: "10px 12px", borderRadius: 9 }}>{msg}</div>}

      {!loading && cats.length > 0 && (
        <p style={{ fontSize: 11.5, color: "var(--color-text-tertiary)", marginTop: 18 }}>
          {cats.length} categoria(s) · {totalTrabalhos} trabalho(s) no total.
        </p>
      )}
    </div>
  );
}
