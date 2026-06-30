"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import { IcoEdit, IcoTrash, IcoOpen } from "@/app/(dashboard)/crm/_components/Icons";
import { Paginacao } from "@/app/(dashboard)/crm/_components/Paginacao";
import { usePersistState } from "@/lib/hooks/usePersistState";
import type { CrmProduct, CrmProductCategory } from "@/lib/supabase/types";
import { fetchAllRows } from "@/lib/supabase/fetchAll";

const btnIcon = (extra?: React.CSSProperties): React.CSSProperties => ({
  display: "flex", alignItems: "center", justifyContent: "center",
  width: 26, height: 26, borderRadius: 6,
  border: "0.5px solid var(--color-border-secondary)",
  background: "transparent", cursor: "pointer",
  color: "var(--color-text-secondary)",
  ...extra,
});

export default function ProdutosPage() {
  const router                              = useRouter();
  const { fotografo }                       = useFotografo();
  const [produtos,   setProdutos]   = useState<CrmProduct[]>([]);
  const [categorias, setCategorias] = useState<CrmProductCategory[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [page,     setPage]     = useState(1);
  const [pageSize, setPageSize] = usePersistState<25|50|100>("produtos:pageSize", 50);
  const [busca,         setBusca]         = usePersistState("produtos:busca",         "");
  const [categFiltro,   setCategFiltro]   = usePersistState("produtos:categFiltro",   "");
  const [somenteAtivos, setSomenteAtivos] = usePersistState("produtos:somenteAtivos", true);
  const [sortCol, setSortCol] = usePersistState("produtos:sortCol", "nome");
  const [sortDir, setSortDir] = usePersistState<"asc" | "desc">("produtos:sortDir", "asc");
  const toggleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };

  const fid = fotografo?.id ?? null;

  const carregar = useCallback(async () => {
    if (!fid) return;
    setLoading(true);
    const sb = createClient();
    const [data, { data: cats }] = await Promise.all([
      fetchAllRows<CrmProduct>((sbc, f, t) => {
        let q = sbc.from("crm_products").select("*").eq("fotografo_id", fid).order("nome");
        if (somenteAtivos) q = q.eq("ativo", true);
        return q.range(f, t);
      }, sb),
      sb.from("crm_product_categories").select("*").eq("fotografo_id", fid).eq("ativo", true).order("ordem"),
    ]);
    setProdutos(data ?? []);
    setCategorias((cats ?? []) as CrmProductCategory[]);
    setLoading(false);
  }, [fid, somenteAtivos]);

  useEffect(() => { carregar(); }, [carregar]);
  useEffect(() => { setPage(1); }, [busca, categFiltro, somenteAtivos, sortCol, sortDir]);

  const filtrados = produtos.filter((p: CrmProduct) => {
    const ok = busca === "" || p.nome.toLowerCase().includes(busca.toLowerCase()) || (p.codigo ?? "").toLowerCase().includes(busca.toLowerCase());
    const okCat = categFiltro === "" || p.categoria === categFiltro;
    return ok && okCat;
  });

  const ordenados = [...filtrados].sort((a, b) => {
    let va: string | number | null | undefined;
    let vb: string | number | null | undefined;
    if      (sortCol === "codigo")    { va = a.codigo;    vb = b.codigo; }
    else if (sortCol === "nome")      { va = a.nome;      vb = b.nome; }
    else if (sortCol === "categoria") { va = a.categoria; vb = b.categoria; }
    else if (sortCol === "preco")     { va = a.preco;     vb = b.preco; }
    else if (sortCol === "pacote")    { va = a.pacote ? 1 : 0; vb = b.pacote ? 1 : 0; }
    else if (sortCol === "ativo")     { va = a.ativo ? 1 : 0;  vb = b.ativo ? 1 : 0; }
    else                              { va = a.nome;      vb = b.nome; }
    if (va == null) return 1;
    if (vb == null) return -1;
    const cmp = typeof va === "number" ? va - (vb as number) : String(va).localeCompare(String(vb), "pt-BR");
    return sortDir === "asc" ? cmp : -cmp;
  });

  const paginados = ordenados.slice((page - 1) * pageSize, page * pageSize);

  const thSort = (): React.CSSProperties => ({
    padding: "9px 14px", textAlign: "left", fontSize: 11, fontWeight: 600,
    color: "var(--color-text-secondary)", letterSpacing: "0.04em",
    whiteSpace: "nowrap", cursor: "pointer", userSelect: "none",
  });

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const toggleAtivo = async (p: CrmProduct) => {
    await createClient().from("crm_products").update({ ativo: !p.ativo }).eq("id", p.id);
    carregar();
  };

  const excluir = async (id: string) => {
    if (!confirm("Excluir produto?")) return;
    await createClient().from("crm_products").delete().eq("id", id);
    carregar();
  };

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1100, fontFamily: "var(--font-sans)" }}>

      {/* Cabeçalho */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--color-text-primary)", margin: 0 }}>Produtos</h1>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "4px 0 0" }}>Serviços e produtos do seu catálogo</p>
        </div>
        <button
          onClick={() => router.push("/crm/produtos/novo")}
          style={{ padding: "9px 18px", borderRadius: 8, background: "#111", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          + Novo produto
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome ou código…"
          style={{ flex: 1, minWidth: 200, padding: "8px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", fontSize: 13, color: "var(--color-text-primary)", outline: "none" }}
        />
        <select
          value={categFiltro}
          onChange={(e) => setCategFiltro(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", fontSize: 13, color: "var(--color-text-primary)", cursor: "pointer", outline: "none" }}
        >
          <option value="">Todas as categorias</option>
          {categorias.map((c) => <option key={c.id} value={c.nome}>{c.nome}</option>)}
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: "var(--color-text-secondary)", cursor: "pointer", userSelect: "none" }}>
          <input type="checkbox" checked={somenteAtivos} onChange={(e) => setSomenteAtivos(e.target.checked)} />
          Somente ativos
        </label>
      </div>

      {/* Tabela */}
      {loading ? (
        <div style={{ color: "var(--color-text-secondary)", fontSize: 13, padding: 24, textAlign: "center" }}>Carregando…</div>
      ) : filtrados.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: "var(--color-text-secondary)", fontSize: 13 }}>
          {produtos.length === 0 ? "Nenhum produto cadastrado ainda." : "Nenhum produto corresponde ao filtro."}
        </div>
      ) : (
        <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--color-background-secondary)", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                {([
                  { label: "Código", col: "codigo" }, { label: "Nome", col: "nome" },
                  { label: "Categoria", col: "categoria" }, { label: "Preço", col: "preco" },
                  { label: "Pacote", col: "pacote" }, { label: "Status", col: "ativo" },
                  { label: "", col: "" },
                ] as const).map(({ label, col }) => (
                  <th key={label || "acoes"} onClick={() => col && toggleSort(col)} style={col ? thSort() : { ...thSort(), cursor: "default" }}>
                    {label}
                    {col && sortCol === col && <span style={{ fontSize: 9, opacity: 0.7, marginLeft: 3 }}>{sortDir === "asc" ? "↑" : "↓"}</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginados.map((p, i) => (
                <tr
                  key={p.id}
                  style={{ borderBottom: i < paginados.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none", background: "var(--color-background-primary)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-background-secondary)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "var(--color-background-primary)")}
                >
                  <td style={{ padding: "10px 14px", color: "var(--color-text-secondary)", fontFamily: "var(--font-mono)", fontSize: 12 }}>{p.codigo ?? "—"}</td>
                  <td style={{ padding: "10px 14px", fontWeight: 500, color: "var(--color-text-primary)" }}>
                    {p.nome}
                    {!p.conta_vendas_id && (
                      <span title="Conta de vendas não configurada" style={{ marginLeft: 6, fontSize: 10, padding: "2px 6px", borderRadius: 10, background: "rgba(234,179,8,0.12)", color: "#CA8A04", fontWeight: 700, border: "0.5px solid rgba(234,179,8,0.3)" }}>!</span>
                    )}
                    {p.pacote && <span style={{ marginLeft: 6, fontSize: 10, padding: "2px 6px", borderRadius: 10, background: "rgba(37,99,235,0.1)", color: "#2563EB", fontWeight: 600 }}>pacote</span>}
                    {p.tags?.length > 0 && <span style={{ marginLeft: 6, fontSize: 10, color: "var(--color-text-secondary)" }}>{p.tags.join(", ")}</span>}
                  </td>
                  <td style={{ padding: "10px 14px", color: "var(--color-text-secondary)" }}>{p.categoria ?? "—"}</td>
                  <td style={{ padding: "10px 14px", fontWeight: 600, color: "var(--color-text-primary)", whiteSpace: "nowrap" }}>{fmt(p.preco)}</td>
                  <td style={{ padding: "10px 14px" }}>
                    {p.pacote ? <span style={{ fontSize: 11, color: "#2563EB" }}>Sim</span> : <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>Não</span>}
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <span
                      onClick={() => toggleAtivo(p)}
                      style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 10, cursor: "pointer",
                        background: p.ativo ? "rgba(34,197,94,0.1)" : "rgba(156,163,175,0.15)",
                        color: p.ativo ? "#16a34a" : "var(--color-text-secondary)" }}
                    >
                      {p.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 5 }}>
                      <button onClick={() => router.push(`/crm/produtos/${p.id}`)} title="Abrir"
                        style={btnIcon({ color: "#2563EB", border: "0.5px solid var(--color-border-secondary)" })}>
                        <IcoOpen />
                      </button>
                      <button onClick={() => router.push(`/crm/produtos/${p.id}`)} title="Editar"
                        style={btnIcon()}>
                        <IcoEdit />
                      </button>
                      <button onClick={() => excluir(p.id)} title="Excluir"
                        style={btnIcon({ color: "#EF4444", border: "0.5px solid rgba(239,68,68,0.3)", opacity: 0.6 })}
                        onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                        onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.6")}>
                        <IcoTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Paginacao pagina={page} total={ordenados.length} pageSize={pageSize} onPagina={setPage} onPageSize={setPageSize} />
        </div>
      )}
    </div>
  );
}
