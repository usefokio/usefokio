"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { fetchAllRows } from "@/lib/supabase/fetchAll";
import { useFotografo } from "@/lib/context/FotografoContext";
import type { GaleriaEntrega, GaleriaEntregaFoto, ContatoCategoria } from "@/lib/supabase/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Modal: salvar emails dos acessos em uma lista/categoria ──────────────────
function ModalSalvarLista({ fotografoId, galeriaTitulo, acessos, onFechar }: {
  fotografoId: string;
  galeriaTitulo: string;
  acessos: { nome: string; email: string }[];
  onFechar: () => void;
}) {
  const [categorias,    setCategorias]    = useState<ContatoCategoria[]>([]);
  const [categoriaId,   setCategoriaId]   = useState<string>("");
  const [novaCategoria, setNovaCategoria] = useState("");
  const [criandoNova,   setCriandoNova]   = useState(false);
  const [salvando,      setSalvando]      = useState(false);
  const [resultado,     setResultado]     = useState<string | null>(null);
  const [erro,          setErro]          = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.from("contato_categorias")
      .select("*")
      .eq("fotografo_id", fotografoId)
      .order("nome")
      .then(({ data }) => {
        setCategorias((data as ContatoCategoria[]) ?? []);
        if (!data?.length) setCriandoNova(true);
      });
  }, [fotografoId]);

  async function salvar() {
    setErro("");
    setSalvando(true);
    const supabase = createClient();

    // 1. Resolve a categoria (existente ou nova)
    let catId = categoriaId;
    if (criandoNova) {
      const nome = novaCategoria.trim();
      if (!nome) { setErro("Informe o nome da categoria."); setSalvando(false); return; }
      const { data: cat, error: catErr } = await supabase
        .from("contato_categorias")
        .upsert({ fotografo_id: fotografoId, nome }, { onConflict: "fotografo_id,nome" })
        .select("id")
        .single();
      if (catErr || !cat) { setErro("Erro ao criar categoria: " + (catErr?.message ?? "")); setSalvando(false); return; }
      catId = cat.id;
    }
    if (!catId) { setErro("Selecione ou crie uma categoria."); setSalvando(false); return; }

    // 2. Valida e deduplica os emails (lowercase/trim)
    const vistos = new Set<string>();
    const validos: { nome: string; email: string }[] = [];
    let invalidos = 0;
    for (const a of acessos) {
      const email = a.email.trim().toLowerCase();
      if (!EMAIL_RE.test(email)) { invalidos++; continue; }
      if (vistos.has(email)) continue;
      vistos.add(email);
      validos.push({ nome: a.nome.trim(), email });
    }
    if (validos.length === 0) { setErro("Nenhum email válido para salvar."); setSalvando(false); return; }

    // 3. Dedup contra os já existentes na categoria
    const { data: existentes } = await supabase
      .from("contatos").select("email").eq("categoria_id", catId);
    const jaTem = new Set((existentes ?? []).map((c: { email: string }) => c.email.toLowerCase()));
    const novos = validos.filter((v) => !jaTem.has(v.email));
    const duplicados = validos.length - novos.length;

    if (novos.length > 0) {
      const { error: insErr } = await supabase.from("contatos").insert(
        novos.map((v) => ({
          categoria_id: catId,
          fotografo_id: fotografoId,
          nome: v.nome || null,
          email: v.email,
          origem: `Galeria: ${galeriaTitulo}`,
        }))
      );
      if (insErr) { setErro("Erro ao salvar contatos: " + insErr.message); setSalvando(false); return; }
    }

    const partes = [`${novos.length} adicionado${novos.length !== 1 ? "s" : ""}`];
    if (duplicados > 0) partes.push(`${duplicados} já existia${duplicados !== 1 ? "m" : ""}`);
    if (invalidos > 0) partes.push(`${invalidos} inválido${invalidos !== 1 ? "s" : ""}`);
    setResultado(partes.join(" · "));
    setSalvando(false);
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60 }} onClick={onFechar}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 14, padding: "26px 28px", width: 420, boxShadow: "0 8px 40px rgba(0,0,0,0.18)" }}>
        <h3 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700, color: "var(--color-text-primary)" }}>Salvar emails em lista</h3>
        <p style={{ margin: "0 0 18px", fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
          Os emails de quem acessou esta galeria serão validados, deduplicados e salvos na categoria escolhida.
        </p>

        {resultado ? (
          <>
            <div style={{ background: "rgba(16,185,129,0.08)", border: "0.5px solid rgba(16,185,129,0.3)", borderRadius: 8, padding: "12px 16px", fontSize: 13, color: "#059669", fontWeight: 600, marginBottom: 18 }}>
              ✓ {resultado}
            </div>
            <button onClick={onFechar} style={{ width: "100%", padding: "10px", borderRadius: 8, border: "none", background: "var(--color-text-primary)", color: "var(--color-background-primary)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Fechar
            </button>
          </>
        ) : (
          <>
            {categorias.length > 0 && !criandoNova && (
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", display: "block", marginBottom: 6 }}>Categoria</label>
                <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", fontSize: 13, background: "var(--color-background-primary)", color: "var(--color-text-primary)" }}>
                  <option value="">Selecione…</option>
                  {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
                <button onClick={() => setCriandoNova(true)} style={{ marginTop: 8, background: "none", border: "none", padding: 0, fontSize: 12, color: "#2563EB", cursor: "pointer", fontWeight: 600 }}>
                  + Criar nova categoria
                </button>
              </div>
            )}

            {criandoNova && (
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", display: "block", marginBottom: 6 }}>Nova categoria</label>
                <input
                  value={novaCategoria}
                  onChange={(e) => setNovaCategoria(e.target.value)}
                  placeholder="Ex: Acesso de projetos culturais"
                  autoFocus
                  style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", fontSize: 13, background: "var(--color-background-primary)", color: "var(--color-text-primary)" }}
                />
                {categorias.length > 0 && (
                  <button onClick={() => { setCriandoNova(false); setNovaCategoria(""); }} style={{ marginTop: 8, background: "none", border: "none", padding: 0, fontSize: 12, color: "var(--color-text-secondary)", cursor: "pointer" }}>
                    ← Usar categoria existente
                  </button>
                )}
              </div>
            )}

            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 16 }}>
              {acessos.length} acesso{acessos.length !== 1 ? "s" : ""} na galeria para processar.
            </div>

            {erro && <div style={{ fontSize: 12, color: "#EF4444", marginBottom: 12 }}>{erro}</div>}

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={onFechar} style={{ flex: 1, padding: "9px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "transparent", fontSize: 13, color: "var(--color-text-secondary)", cursor: "pointer" }}>Cancelar</button>
              <button onClick={salvar} disabled={salvando} style={{ flex: 1, padding: "9px", borderRadius: 8, border: "none", background: "#2563EB", color: "#fff", fontSize: 13, fontWeight: 600, cursor: salvando ? "default" : "pointer" }}>
                {salvando ? "Salvando…" : "Salvar lista"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function diasRestantes(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  return Math.round((new Date(expiresAt).getTime() - Date.now()) / 86_400_000);
}

function formatarData(s: string) {
  return new Date(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

function StatusBadge({ galeria }: { galeria: GaleriaEntrega }) {
  if (galeria.suspensa) return <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: "rgba(245,158,11,0.12)", color: "#B45309" }}>Suspensa</span>;
  const dias = diasRestantes(galeria.expires_at);
  if (dias === null) return <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: "rgba(107,114,128,0.10)", color: "#6B7280" }}>Sem prazo</span>;
  if (dias < 0)  return <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: "rgba(239,68,68,0.10)", color: "#EF4444" }}>Expirado</span>;
  if (dias <= 7) return <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: "rgba(245,158,11,0.12)", color: "#B45309" }}>Expirando</span>;
  return <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: "rgba(16,185,129,0.10)", color: "#059669" }}>Ativo</span>;
}

export default function EntregaDetailPage() {
  const { id }      = useParams<{ id: string }>();
  const router      = useRouter();
  const { fotografo } = useFotografo();

  const [galeria,  setGaleria]  = useState<any>(null);
  const [fotos,    setFotos]    = useState<GaleriaEntregaFoto[]>([]);
  const [acessos,  setAcessos]  = useState<{ id: string; nome: string; email: string; acessado_em: string }[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [copiado,  setCopiado]  = useState(false);
  const [modalLista, setModalLista] = useState(false);

  const [modoSelecao,  setModoSelecao]  = useState(false);
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [excluindoFotos, setExcluindoFotos] = useState(false);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);

  const appUrl = typeof window !== "undefined" ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL ?? "https://usefokio.com.br");
  const linkPublico = `${appUrl}/acesso/entrega/${id}`;

  useEffect(() => {
    if (!fotografo) return;
    const supabase = createClient();
    Promise.all([
      supabase.from("galerias_entrega")
        .select("*, clientes(nome, email, whatsapp, telefone)")
        .eq("id", id)
        .eq("fotografo_id", fotografo.id)
        .maybeSingle(),
      fetchAllRows<GaleriaEntregaFoto>((sb, from, to) => sb.from("galerias_entrega_fotos").select("*").eq("galeria_id", id).order("ordem").order("created_at").range(from, to), supabase),
      supabase.from("galeria_acessos")
        .select("id, nome, email, acessado_em")
        .eq("galeria_id", id)
        .order("acessado_em", { ascending: false }),
    ]).then(([{ data: g }, f, { data: a }]) => {
      if (!g) { router.replace("/entrega"); return; }
      setGaleria(g);
      setFotos(f ?? []);
      setAcessos((a as any[]) ?? []);
      setLoading(false);
    });
  }, [fotografo, id]);

  function toggleFotoSelecionada(fotoId: string) {
    setSelecionadas((prev) => {
      const next = new Set(prev);
      if (next.has(fotoId)) next.delete(fotoId); else next.add(fotoId);
      return next;
    });
  }

  function selecionarTodas() {
    setSelecionadas(new Set(fotos.map((f) => f.id)));
  }

  function desmarcarTodas() {
    setSelecionadas(new Set());
  }

  async function excluirFotosSelecionadas() {
    if (selecionadas.size === 0) return;
    setExcluindoFotos(true);
    setConfirmarExclusao(false);
    const supabase = createClient();
    const alvo = fotos.filter((f) => selecionadas.has(f.id));
    const paths = alvo.map((f) => f.storage_path);
    const ids   = alvo.map((f) => f.id);

    for (let i = 0; i < paths.length; i += 100) {
      await supabase.storage.from("galerias").remove(paths.slice(i, i + 100));
    }
    for (let i = 0; i < ids.length; i += 100) {
      await supabase.from("galerias_entrega_fotos").delete().in("id", ids.slice(i, i + 100));
    }

    setFotos((prev) => prev.filter((f) => !selecionadas.has(f.id)));
    setSelecionadas(new Set());
    setModoSelecao(false);
    setExcluindoFotos(false);
  }

  async function copiarLink() {
    await navigator.clipboard.writeText(linkPublico);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  }

  if (loading) return (
    <div style={{ padding: "40px 30px", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>
  );

  // Dedup por email (acessos já vêm ordenados do mais recente): mantém o último acesso + contagem
  const acessosUnicos = acessos.reduce<(typeof acessos[number] & { vezes: number })[]>((acc, a) => {
    const chave = (a.email ?? "").trim().toLowerCase();
    const existente = acc.find((x) => (x.email ?? "").trim().toLowerCase() === chave);
    if (existente) existente.vezes += 1;
    else acc.push({ ...a, vezes: 1 });
    return acc;
  }, []);

  const g: GaleriaEntrega = galeria;
  const dias = diasRestantes(g.expires_at);

  return (
    <div style={{ padding: "26px 30px", maxWidth: 780 }}>

      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 22 }}>
        <button onClick={() => router.push("/entrega")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 13, padding: 0 }}>
          ← Entregas
        </button>
        <span style={{ color: "var(--color-border-secondary)" }}>/</span>
        <span style={{ fontSize: 13, color: "var(--color-text-primary)", fontWeight: 500 }}>{g.titulo}</span>
      </div>

      {/* Header card */}
      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "20px 22px", marginBottom: 14, display: "flex", alignItems: "flex-start", gap: 16 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--color-text-primary)", margin: 0, letterSpacing: "-0.01em" }}>{g.titulo}</h1>
            <StatusBadge galeria={g} />
          </div>
          {g.clientes && <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Cliente: <strong style={{ color: "var(--color-text-primary)" }}>{g.clientes.nome}</strong></div>}
          {g.data_evento && <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>Evento: {formatarData(g.data_evento)}</div>}
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
          <Link href={`/entrega/${id}/editar`} style={{ padding: "7px 16px", borderRadius: 8, background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-secondary)", fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)", textDecoration: "none" }}>
            ✏️ Editar
          </Link>
          <a href={linkPublico} target="_blank" rel="noopener noreferrer" style={{ padding: "7px 16px", borderRadius: 8, background: "rgba(37,99,235,0.06)", border: "0.5px solid rgba(37,99,235,0.2)", fontSize: 12, fontWeight: 600, color: "#2563EB", textDecoration: "none" }}>
            🔗 Ver galeria
          </a>
        </div>
      </div>

      {/* Destaque do encerramento do acesso */}
      {(() => {
        const cor = g.suspensa ? { bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.3)", txt: "#B45309" }
          : dias === null ? { bg: "rgba(107,114,128,0.06)", border: "var(--color-border-secondary)", txt: "#6B7280" }
          : dias < 0 ? { bg: "rgba(239,68,68,0.07)", border: "rgba(239,68,68,0.3)", txt: "#DC2626" }
          : dias <= 7 ? { bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.3)", txt: "#B45309" }
          : { bg: "rgba(16,185,129,0.07)", border: "rgba(16,185,129,0.3)", txt: "#059669" };
        const texto = g.suspensa
          ? "Acesso suspenso pelo fotógrafo"
          : dias === null
            ? "Galeria sem prazo de expiração"
            : dias < 0
              ? `Acesso encerrado em ${formatarData(g.expires_at!)}`
              : `Acesso encerra em ${formatarData(g.expires_at!)} (${dias === 0 ? "hoje" : `${dias} dia${dias !== 1 ? "s" : ""}`})`;
        return (
          <div style={{ background: cor.bg, border: `0.5px solid ${cor.border}`, borderRadius: 10, padding: "12px 18px", marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 16 }}>⏳</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: cor.txt }}>{texto}</span>
          </div>
        );
      })()}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

        {/* Informações */}
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "9px 20px", borderBottom: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Informações</span>
          </div>
          <div>
            {[
              { label: "Fotos",      value: `${fotos.length} foto${fotos.length !== 1 ? "s" : ""}` },
              { label: "Acessos",    value: `${acessos.length} acesso${acessos.length !== 1 ? "s" : ""} (${new Set(acessos.map((a: any) => a.email).filter(Boolean)).size} pessoa${new Set(acessos.map((a: any) => a.email).filter(Boolean)).size !== 1 ? "s" : ""} única${new Set(acessos.map((a: any) => a.email).filter(Boolean)).size !== 1 ? "s" : ""})` },
              { label: "Downloads",  value: `${g.downloads}` },
              { label: "Prazo",      value: g.expires_at ? `${formatarData(g.expires_at)}${dias !== null && dias >= 0 ? ` (${dias} dia${dias !== 1 ? "s" : ""} restantes)` : dias !== null && dias < 0 ? " (expirado)" : ""}` : "Sem prazo" },
              { label: "Renovação",  value: g.renewal_fee && g.renewal_fee > 0 ? `R$ ${g.renewal_fee.toFixed(2).replace(".", ",")}` : null },
              { label: "Drive",      value: g.drive_link ? "Configurado" : null },
              { label: "Criado em",  value: formatarData(g.created_at) },
            ].filter((r) => r.value !== null).map((row, i, arr) => (
              <div key={row.label} style={{ display: "flex", padding: "11px 20px", borderBottom: i < arr.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none" }}>
                <span style={{ fontSize: 13, color: "var(--color-text-secondary)", width: 130, flexShrink: 0 }}>{row.label}</span>
                <span style={{ fontSize: 13, color: "var(--color-text-primary)", fontWeight: 500 }}>
                  {row.label === "Drive" && g.drive_link
                    ? <a href={g.drive_link} target="_blank" rel="noopener noreferrer" style={{ color: "#2563EB", textDecoration: "none" }}>Abrir link do Drive ↗</a>
                    : row.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Configurações de acesso */}
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "9px 20px", borderBottom: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Configurações de acesso</span>
          </div>
          <div>
            {[
              { label: "Exigir identificação",     value: g.identificacao_obrigatoria },
              { label: "Drive após identificação", value: g.drive_apenas_identificado },
              { label: "Somente visualização",     value: g.apenas_zip },
              { label: "Acesso suspenso",          value: g.suspensa },
            ].map((row, i, arr) => (
              <div key={row.label} style={{ display: "flex", alignItems: "center", padding: "11px 20px", borderBottom: i < arr.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none" }}>
                <span style={{ fontSize: 13, color: "var(--color-text-secondary)", flex: 1 }}>{row.label}</span>
                <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 10px", borderRadius: 20, background: row.value ? "rgba(16,185,129,0.10)" : "rgba(107,114,128,0.08)", color: row.value ? "#059669" : "#6B7280" }}>
                  {row.value ? "Sim" : "Não"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Link público */}
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "9px 20px", borderBottom: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Link de acesso do cliente</span>
          </div>
          <div style={{ padding: "14px 20px", display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ flex: 1, fontFamily: "monospace", fontSize: 12, color: "var(--color-text-secondary)", background: "var(--color-background-secondary)", padding: "9px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {linkPublico}
            </div>
            <button onClick={copiarLink} style={{ padding: "9px 16px", borderRadius: 8, border: `0.5px solid ${copiado ? "rgba(16,185,129,0.3)" : "var(--color-border-secondary)"}`, background: copiado ? "rgba(16,185,129,0.10)" : "var(--color-background-secondary)", color: copiado ? "#059669" : "var(--color-text-primary)", fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>
              {copiado ? "✓ Copiado" : "Copiar"}
            </button>
          </div>
        </div>

        {/* Mensagem */}
        {g.mensagem && (
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "9px 20px", borderBottom: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Mensagem ao cliente</span>
            </div>
            <div style={{ padding: "14px 20px", fontSize: 13, color: "var(--color-text-primary)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{g.mensagem}</div>
          </div>
        )}

        {/* Acessos */}
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "9px 20px", borderBottom: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Quem acessou ({acessosUnicos.length})
            </span>
            {acessosUnicos.length > 0 && (
              <button onClick={() => setModalLista(true)} style={{ fontSize: 11, fontWeight: 600, color: "#2563EB", background: "rgba(37,99,235,0.06)", border: "0.5px solid rgba(37,99,235,0.2)", borderRadius: 7, padding: "4px 12px", cursor: "pointer" }}>
                💾 Salvar emails em lista
              </button>
            )}
          </div>
          {acessosUnicos.length === 0 ? (
            <div style={{ padding: "16px 20px", fontSize: 13, color: "var(--color-text-secondary)" }}>
              Nenhum acesso registrado ainda.
            </div>
          ) : (
            <div style={{ maxHeight: 200, overflowY: "auto" }}>
              {acessosUnicos.map((a, i) => (
                <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 20px", borderBottom: i < acessosUnicos.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", flex: "0 0 160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.nome}</span>
                  <span style={{ fontSize: 12, color: "var(--color-text-secondary)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.email}</span>
                  {a.vezes > 1 && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#6B7280", background: "rgba(107,114,128,0.10)", borderRadius: 10, padding: "1px 7px", flexShrink: 0 }}>{a.vezes}x</span>
                  )}
                  <span style={{ fontSize: 11, color: "var(--color-text-secondary)", whiteSpace: "nowrap", flexShrink: 0 }}>
                    {new Date(a.acessado_em).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Fotos */}
        {fotos.length > 0 && (
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflow: "hidden" }}>
            {/* Header */}
            <div style={{ padding: "9px 14px 9px 20px", borderBottom: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Fotos ({fotos.length})
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                {!modoSelecao ? (
                  <>
                    <select
                      value={g.ordenacao_fotos ?? "nome"}
                      onChange={async (e) => {
                        const novaOrdem = e.target.value as "envio" | "nome" | "nome_desc" | "data";
                        const supabase = createClient();
                        await supabase.from("galerias_entrega").update({ ordenacao_fotos: novaOrdem }).eq("id", id);
                        setGaleria({ ...galeria, ordenacao_fotos: novaOrdem });
                        setFotos((prev) => {
                          const lista = [...prev];
                          if (novaOrdem === "nome") lista.sort((a, b) => (a.nome_arquivo ?? "").localeCompare(b.nome_arquivo ?? "", "pt-BR", { numeric: true }));
                          else if (novaOrdem === "nome_desc") lista.sort((a, b) => (b.nome_arquivo ?? "").localeCompare(a.nome_arquivo ?? "", "pt-BR", { numeric: true }));
                          else if (novaOrdem === "data") lista.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                          else lista.sort((a, b) => (a.ordem - b.ordem) || (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
                          return lista;
                        });
                      }}
                      style={{ fontSize: 11, padding: "4px 8px", borderRadius: 6, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", cursor: "pointer" }}
                    >
                      <option value="nome">Nome A–Z</option>
                      <option value="nome_desc">Nome Z–A</option>
                      <option value="envio">Ordem de envio</option>
                      <option value="data">Mais recente primeiro</option>
                    </select>
                    <button
                      onClick={() => { setModoSelecao(true); setSelecionadas(new Set()); }}
                      style={{ fontSize: 11, fontWeight: 600, padding: "4px 12px", borderRadius: 6, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", cursor: "pointer" }}
                    >
                      Selecionar
                    </button>
                    <Link href={`/entrega/${id}/editar`} style={{ fontSize: 11, color: "#2563EB", textDecoration: "none", fontWeight: 600 }}>Gerenciar →</Link>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>
                      {selecionadas.size} selecionada{selecionadas.size !== 1 ? "s" : ""}
                    </span>
                    <button
                      onClick={selecionadas.size === fotos.length ? desmarcarTodas : selecionarTodas}
                      style={{ fontSize: 11, fontWeight: 600, padding: "4px 12px", borderRadius: 6, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", cursor: "pointer" }}
                    >
                      {selecionadas.size === fotos.length ? "Desmarcar todas" : "Selecionar todas"}
                    </button>
                    {selecionadas.size > 0 && (
                      <button
                        onClick={() => setConfirmarExclusao(true)}
                        style={{ fontSize: 11, fontWeight: 600, padding: "4px 12px", borderRadius: 6, border: "0.5px solid rgba(239,68,68,0.35)", background: "rgba(239,68,68,0.07)", color: "#DC2626", cursor: "pointer" }}
                      >
                        Excluir {selecionadas.size}
                      </button>
                    )}
                    <button
                      onClick={() => { setModoSelecao(false); setSelecionadas(new Set()); }}
                      style={{ fontSize: 11, fontWeight: 600, padding: "4px 12px", borderRadius: 6, border: "0.5px solid var(--color-border-secondary)", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer" }}
                    >
                      Cancelar
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Grid */}
            <div style={{ padding: 12, maxHeight: modoSelecao ? 520 : "none", overflowY: modoSelecao ? "auto" : "visible" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))", gap: 6 }}>
                {(modoSelecao ? fotos : fotos.slice(0, 48)).map((f) => {
                  const sel = selecionadas.has(f.id);
                  return (
                    <div
                      key={f.id}
                      onClick={() => modoSelecao && toggleFotoSelecionada(f.id)}
                      style={{
                        position: "relative", aspectRatio: "1", borderRadius: 6, overflow: "hidden",
                        background: "#ddd", cursor: modoSelecao ? "pointer" : "default",
                        outline: sel ? "2.5px solid #2563EB" : "none",
                        outlineOffset: -2,
                      }}
                    >
                      <img src={f.url_publica} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", opacity: modoSelecao && !sel ? 0.65 : 1, transition: "opacity 0.1s" }} />
                      {modoSelecao && (
                        <div style={{
                          position: "absolute", top: 4, left: 4,
                          width: 18, height: 18, borderRadius: 4,
                          background: sel ? "#2563EB" : "rgba(255,255,255,0.85)",
                          border: sel ? "none" : "1.5px solid rgba(0,0,0,0.25)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                        }}>
                          {sel && <span style={{ color: "#fff", fontSize: 10, fontWeight: 700, lineHeight: 1 }}>✓</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
                {!modoSelecao && fotos.length > 48 && (
                  <div style={{ aspectRatio: "1", borderRadius: 6, background: "var(--color-background-secondary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "var(--color-text-secondary)", fontWeight: 600 }}>
                    +{fotos.length - 48}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal confirmação de exclusão */}
        {confirmarExclusao && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 80 }} onClick={() => setConfirmarExclusao(false)}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--color-background-primary)", borderRadius: 14, padding: "26px 28px", width: 360, boxShadow: "0 8px 40px rgba(0,0,0,0.2)" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 8 }}>Excluir fotos selecionadas?</div>
              <div style={{ fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.5, marginBottom: 20 }}>
                Você está prestes a excluir <strong>{selecionadas.size} foto{selecionadas.size !== 1 ? "s" : ""}</strong> permanentemente. Esta ação não pode ser desfeita.
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setConfirmarExclusao(false)} style={{ flex: 1, padding: "9px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "transparent", fontSize: 13, color: "var(--color-text-secondary)", cursor: "pointer" }}>
                  Cancelar
                </button>
                <button onClick={excluirFotosSelecionadas} disabled={excluindoFotos} style={{ flex: 1, padding: "9px", borderRadius: 8, border: "none", background: "#DC2626", color: "#fff", fontSize: 13, fontWeight: 600, cursor: excluindoFotos ? "default" : "pointer" }}>
                  {excluindoFotos ? "Excluindo…" : `Excluir ${selecionadas.size}`}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {modalLista && fotografo && (
        <ModalSalvarLista
          fotografoId={fotografo.id}
          galeriaTitulo={g.titulo}
          acessos={acessosUnicos}
          onFechar={() => setModalLista(false)}
        />
      )}
    </div>
  );
}
