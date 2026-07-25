"use client";

// BANCO DE PROPOSTAS — catálogo do que o fotógrafo oferece, agrupado por categoria.
// Cada proposta tem 3 saídas: copiar texto (WhatsApp), PDF (/crm-proposta/{id}) e
// link público (/proposta/{slug}). Padrões de listagem do CRM: busca/filtros
// persistentes, fetchAllRows, exclusão com modal.
import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fetchAllRows } from "@/lib/supabase/fetchAll";
import { useFotografo } from "@/lib/context/FotografoContext";
import { usePersistState } from "@/lib/hooks/usePersistState";
import { urlPublicaSite, type ConfigUrl } from "@/lib/site/urlPublica";
import { faixaDeValor } from "@/lib/crm/proposta";
import { ModalCopiarTexto } from "./_components/ModalCopiarTexto";
import type { CrmProposta, CrmPropostaCategoria, CrmPropostaOpcao } from "@/lib/supabase/types";

const SEM_CATEGORIA = "(sem categoria)";

const btn: React.CSSProperties = {
  padding: "7px 14px", borderRadius: 8, border: "0.5px solid var(--color-border-tertiary)",
  background: "var(--color-background-primary)", fontSize: 12, cursor: "pointer",
  color: "var(--color-text-primary)",
};
const btnIcone: React.CSSProperties = { ...btn, padding: "6px 10px" };

export default function PropostasPage() {
  const router = useRouter();
  const { fotografo } = useFotografo();
  const [loading, setLoading] = useState(true);
  const [propostas, setPropostas] = useState<CrmProposta[]>([]);
  const [opcoes, setOpcoes] = useState<CrmPropostaOpcao[]>([]);
  const [categorias, setCategorias] = useState<CrmPropostaCategoria[]>([]);
  const [cfgSite, setCfgSite] = useState<ConfigUrl | null>(null);
  const [busca, setBusca] = usePersistState("propostas:busca", "");
  const [modalCopiar, setModalCopiar] = useState<CrmProposta | null>(null);
  const [modalCategorias, setModalCategorias] = useState(false);
  const [novaCat, setNovaCat] = useState("");
  const [excluir, setExcluir] = useState<CrmProposta | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!fotografo) return;
    setLoading(true);
    const sb = createClient();
    const fid = fotografo.id;
    const [props, cats, { data: cfg }] = await Promise.all([
      fetchAllRows<CrmProposta>((s, from, to) =>
        s.from("crm_propostas").select("*").eq("fotografo_id", fid).eq("ativo", true)
          .order("ordem").order("titulo").range(from, to), sb),
      fetchAllRows<CrmPropostaCategoria>((s, from, to) =>
        s.from("crm_proposta_categorias").select("*").eq("fotografo_id", fid)
          .order("ordem").order("nome").range(from, to), sb),
      sb.from("site_config").select("subdominio, dominio_customizado, publicado").eq("fotografo_id", fid).maybeSingle(),
    ]);
    setPropostas(props);
    setCategorias(cats);
    setCfgSite((cfg as ConfigUrl) ?? null);
    const ids = props.map((p) => p.id);
    if (ids.length) {
      const ops = await fetchAllRows<CrmPropostaOpcao>((s, from, to) =>
        s.from("crm_proposta_opcoes").select("*").in("proposta_id", ids).order("ordem").range(from, to), sb);
      setOpcoes(ops);
    } else setOpcoes([]);
    setLoading(false);
  }, [fotografo]);

  useEffect(() => { carregar(); }, [carregar]);

  const opcoesDe = useCallback((pid: string) => opcoes.filter((o) => o.proposta_id === pid), [opcoes]);

  // Agrupamento por categoria (categorias ativas na ordem + "(sem categoria)" no fim)
  const grupos = useMemo(() => {
    const filtradas = propostas.filter((p) =>
      !busca.trim() || p.titulo.toLowerCase().includes(busca.trim().toLowerCase()));
    const porCat = new Map<string, CrmProposta[]>();
    for (const p of filtradas) {
      const nome = categorias.find((c) => c.id === p.categoria_id)?.nome ?? SEM_CATEGORIA;
      if (!porCat.has(nome)) porCat.set(nome, []);
      porCat.get(nome)!.push(p);
    }
    const ordem = [...categorias.filter((c) => c.ativo).map((c) => c.nome), SEM_CATEGORIA];
    return ordem.filter((n) => porCat.has(n)).map((n) => ({ nome: n, itens: porCat.get(n)! }));
  }, [propostas, categorias, busca]);

  // NÃO cria registro aqui: abre o editor em branco (/nova) e só grava no primeiro Salvar,
  // senão sair sem salvar deixava uma "Nova proposta" solta na lista.
  function novaProposta() {
    router.push("/crm/propostas/nova");
  }

  async function criarCategoria() {
    if (!fotografo || !novaCat.trim()) return;
    const { error } = await createClient().from("crm_proposta_categorias")
      .insert({ fotografo_id: fotografo.id, nome: novaCat.trim(), ordem: categorias.length });
    if (error) { setMsg("Erro: " + error.message); return; }
    setNovaCat("");
    carregar();
  }

  async function alternarCategoria(cat: CrmPropostaCategoria) {
    await createClient().from("crm_proposta_categorias").update({ ativo: !cat.ativo }).eq("id", cat.id);
    carregar();
  }

  async function confirmarExcluir() {
    if (!excluir || ocupado) return;
    setOcupado(true);
    // exclusão lógica: preserva histórico e o link antigo simplesmente sai do ar (publicado some da lista)
    const { error } = await createClient().from("crm_propostas")
      .update({ ativo: false, publicado: false }).eq("id", excluir.id);
    setOcupado(false);
    if (error) { setMsg("Erro ao excluir: " + error.message); return; }
    setExcluir(null);
    carregar();
  }

  function copiarLink(p: CrmProposta) {
    if (!fotografo || !p.slug) return;
    const url = urlPublicaSite(cfgSite, fotografo.id, `/proposta/${p.slug}`);
    const abs = url.startsWith("http") ? url : `${window.location.origin}${url}`;
    navigator.clipboard.writeText(abs).then(() => setMsg("Link copiado: " + abs));
  }

  if (!fotografo) return null;

  return (
    <div style={{ padding: "28px 24px", maxWidth: 1100, fontFamily: "var(--font-sans)" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18, gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--color-text-primary)", margin: "0 0 4px" }}>Propostas</h1>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
            {loading ? "Carregando…" : `Banco das propostas que você oferece — copie o texto, gere o PDF ou envie o link.`}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button onClick={() => setModalCategorias(true)} style={btn}>🗂 Categorias</button>
          <button onClick={novaProposta} disabled={ocupado}
            style={{ padding: "9px 18px", borderRadius: 8, background: "#111", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            + Nova proposta
          </button>
        </div>
      </div>

      {/* Busca */}
      <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar proposta…"
        style={{ width: "100%", maxWidth: 340, boxSizing: "border-box", padding: "9px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", fontSize: 13, color: "var(--color-text-primary)", marginBottom: 20 }} />

      {msg && (
        <div style={{ fontSize: 12, color: "#2563EB", marginBottom: 14, cursor: "pointer" }} onClick={() => setMsg(null)}>{msg} ✕</div>
      )}

      {loading ? (
        <div style={{ padding: "48px 0", textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>
      ) : grupos.length === 0 ? (
        <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "52px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🧾</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 6 }}>
            {propostas.length === 0 ? "Nenhuma proposta ainda" : "Nenhum resultado"}
          </div>
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
            {propostas.length === 0 ? "Crie a primeira proposta e organize por categoria (ex.: Casamento Civil)." : "Ajuste a busca."}
          </div>
        </div>
      ) : (
        grupos.map((g) => (
          <div key={g.nome} style={{ marginBottom: 26 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
              {g.nome} <span style={{ opacity: 0.6 }}>({g.itens.length})</span>
            </div>
            <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflow: "hidden" }}>
              {g.itens.map((p, i) => {
                const ops = opcoesDe(p.id);
                const pacotes = ops.filter((o) => o.tipo === "pacote").length;
                const adicionais = ops.filter((o) => o.tipo === "adicional").length;
                return (
                  <div key={p.id}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 18px", borderTop: i > 0 ? "0.5px solid var(--color-border-tertiary)" : "none", cursor: "pointer" }}
                    onClick={() => router.push(`/crm/propostas/${p.id}`)}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {p.titulo}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>
                        {pacotes} opção(ões){adicionais > 0 ? ` · ${adicionais} adicional(is)` : ""} · {faixaDeValor(ops)}
                      </div>
                    </div>
                    {p.publicado && p.slug && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#059669", background: "rgba(16,185,129,0.1)", padding: "3px 9px", borderRadius: 999, whiteSpace: "nowrap" }}>
                        página no ar
                      </span>
                    )}
                    <div style={{ display: "flex", gap: 6 }} onClick={(e) => e.stopPropagation()}>
                      <button title="Copiar texto / WhatsApp" style={btnIcone} onClick={() => setModalCopiar(p)}>📋</button>
                      <button title="Abrir PDF" style={btnIcone} onClick={() => window.open(`/crm-proposta/${p.id}`, "_blank")}>📄</button>
                      <button title={p.publicado && p.slug ? "Copiar link da página" : "Publique a página no editor para ter o link"}
                        style={{ ...btnIcone, opacity: p.publicado && p.slug ? 1 : 0.4 }}
                        onClick={() => copiarLink(p)} disabled={!p.publicado || !p.slug}>🔗</button>
                      <button title="Excluir" style={{ ...btnIcone, color: "#EF4444" }} onClick={() => setExcluir(p)}>🗑</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      {/* Modal copiar texto / WhatsApp */}
      {modalCopiar && fotografo && (
        <ModalCopiarTexto
          proposta={modalCopiar}
          opcoes={opcoesDe(modalCopiar.id)}
          nomeEmpresa={fotografo.nome_empresa ?? ""}
          link={modalCopiar.publicado && modalCopiar.slug
            ? urlPublicaSite(cfgSite, fotografo.id, `/proposta/${modalCopiar.slug}`)
            : null}
          onFechar={() => setModalCopiar(null)}
        />
      )}

      {/* Modal categorias */}
      {modalCategorias && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}
          onClick={() => setModalCategorias(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--color-background-primary)", borderRadius: 14, padding: 24, maxWidth: 440, width: "100%", boxShadow: "0 10px 40px rgba(0,0,0,0.2)" }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "var(--color-text-primary)", marginBottom: 14 }}>Categorias de proposta</div>
            {categorias.length === 0 && (
              <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 12 }}>Nenhuma categoria ainda.</div>
            )}
            {categorias.map((c) => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                <span style={{ flex: 1, fontSize: 13, color: c.ativo ? "var(--color-text-primary)" : "var(--color-text-secondary)", textDecoration: c.ativo ? "none" : "line-through" }}>{c.nome}</span>
                <button onClick={() => alternarCategoria(c)} style={{ ...btnIcone, fontSize: 11 }}>
                  {c.ativo ? "Desativar" : "Reativar"}
                </button>
              </div>
            ))}
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <input value={novaCat} onChange={(e) => setNovaCat(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") criarCategoria(); }}
                placeholder="Nova categoria (ex.: Casamento Civil)"
                style={{ flex: 1, boxSizing: "border-box", padding: "9px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", fontSize: 13, color: "var(--color-text-primary)" }} />
              <button onClick={criarCategoria} style={{ ...btn, fontWeight: 700 }}>Adicionar</button>
            </div>
            <button onClick={() => setModalCategorias(false)} style={{ ...btn, width: "100%", marginTop: 16 }}>Fechar</button>
          </div>
        </div>
      )}

      {/* Modal excluir */}
      {excluir && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}
          onClick={() => setExcluir(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--color-background-primary)", borderRadius: 14, padding: 24, maxWidth: 400, width: "100%", boxShadow: "0 10px 40px rgba(0,0,0,0.2)" }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#EF4444", marginBottom: 8 }}>Excluir proposta</div>
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 18px", lineHeight: 1.6 }}>
              Excluir <strong style={{ color: "var(--color-text-primary)" }}>{excluir.titulo}</strong>?
              A página pública sai do ar e a proposta some da lista.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setExcluir(null)} style={{ ...btn, flex: 1 }}>Cancelar</button>
              <button onClick={confirmarExcluir} disabled={ocupado}
                style={{ flex: 1, padding: "9px", borderRadius: 8, border: "none", background: "#EF4444", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                {ocupado ? "Excluindo…" : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
