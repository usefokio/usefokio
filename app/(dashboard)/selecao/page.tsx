"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import type { GaleriaSelecao, Cliente } from "@/lib/supabase/types";
import { ModalEnviarAcesso } from "./[id]/_components/ModalEnviarAcesso";

type GaleriaComCliente = GaleriaSelecao & { cliente?: Pick<Cliente, "nome" | "email" | "senha_acesso" | "telefone" | "whatsapp"> | null };
type Filtro = "todas" | GaleriaSelecao["status"];

const STATUS_LABEL: Record<GaleriaSelecao["status"], string> = {
  rascunho:           "Rascunho",
  ativa:              "Ativa",
  encerrada:          "Encerrada",
  aguardando_revisao: "Ag. revisão",
};

const STATUS_BADGE: Record<GaleriaSelecao["status"], { bg: string; color: string }> = {
  rascunho:           { bg: "rgba(100,116,139,0.12)", color: "#64748B" },
  ativa:              { bg: "rgba(16,185,129,0.12)",  color: "#059669" },
  encerrada:          { bg: "rgba(239,68,68,0.10)",   color: "#EF4444" },
  aguardando_revisao: { bg: "rgba(245,158,11,0.12)",  color: "#B45309" },
};

// ─── Ícones ───────────────────────────────────────────────────────────────────
const IcoEdit = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const IcoCopy = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
);
const IcoTrash = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);

const IcoSend = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);


function SelecaoConteudo() {
  const router        = useRouter();
  const searchParams  = useSearchParams();
  const { fotografo } = useFotografo();

  const [galerias,       setGalerias]       = useState<GaleriaComCliente[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [copiando,       setCopiando]       = useState<string | null>(null);
  const [excluindo,      setExcluindo]      = useState<GaleriaComCliente | null>(null);
  const [deletando,      setDeletando]      = useState(false);
  const [enviarAcessoId, setEnviarAcessoId] = useState<string | null>(null);

  const filtroInicial = (searchParams.get("filtro") as Filtro) ?? "todas";
  const [filtro, setFiltro] = useState<Filtro>(filtroInicial);

  const appUrl = typeof window !== "undefined"
    ? window.location.origin
    : (process.env.NEXT_PUBLIC_APP_URL ?? "https://usefokio.com.br");

  useEffect(() => {
    if (!fotografo) return;
    const supabase = createClient();
    supabase
      .from("galerias_selecao")
      .select("*, cliente:clientes(nome, email, senha_acesso, telefone, whatsapp)")
      .eq("fotografo_id", fotografo.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setGalerias((data as GaleriaComCliente[]) ?? []);
        setLoading(false);
      });
  }, [fotografo]);

  async function excluirGaleria() {
    if (!excluindo || !fotografo) return;
    setDeletando(true);
    const supabase = createClient();
    // Limpar arquivos do storage antes de deletar
    const { data: fotos } = await supabase
      .from("galerias_selecao_fotos")
      .select("storage_path, thumbnail_path")
      .eq("galeria_id", excluindo.id);
    if (fotos && fotos.length > 0) {
      const paths = fotos.flatMap((f: { storage_path: string; thumbnail_path: string | null }) =>
        [f.storage_path, f.thumbnail_path].filter(Boolean) as string[]
      );
      for (let i = 0; i < paths.length; i += 100) {
        await supabase.storage.from("galerias").remove(paths.slice(i, i + 100));
      }
    }
    await supabase.from("galerias_selecao").delete().eq("id", excluindo.id).eq("fotografo_id", fotografo.id);
    setGalerias((prev) => prev.filter((g) => g.id !== excluindo.id));
    setExcluindo(null);
    setDeletando(false);
  }

  async function copiarLink(galeriaId: string) {
    await navigator.clipboard.writeText(`${appUrl}/galeria/${galeriaId}`);
    setCopiando(galeriaId);
    setTimeout(() => setCopiando(null), 2000);
  }

  function enviarWhatsapp(g: GaleriaComCliente) {
    const tel  = g.cliente?.whatsapp ?? g.cliente?.telefone ?? "";
    const nome = g.cliente?.nome ?? "";
    const link = `${appUrl}/galeria/${g.id}`;
    const msg  = encodeURIComponent(
      `Olá${nome ? " " + nome : ""}! Sua galeria de seleção "${g.titulo}" está disponível.\n\nAcesse o link abaixo para selecionar suas fotos favoritas:\n${link}`
    );
    const numero = tel.replace(/\D/g, "");
    window.open(`https://wa.me/${numero ? numero : ""}?text=${msg}`, "_blank");
  }

  const aguardando = galerias.filter((g) => g.status === "aguardando_revisao");

  const contadores: Record<Filtro, number> = {
    todas:              galerias.length,
    rascunho:           galerias.filter((g) => g.status === "rascunho").length,
    ativa:              galerias.filter((g) => g.status === "ativa").length,
    encerrada:          galerias.filter((g) => g.status === "encerrada").length,
    aguardando_revisao: aguardando.length,
  };

  const filtradas = filtro === "todas" ? galerias : galerias.filter((g) => g.status === filtro);

  const iconBtn = (color?: string, border?: string, bg?: string): React.CSSProperties => ({
    display: "flex", alignItems: "center", justifyContent: "center",
    width: 30, height: 30, borderRadius: 7,
    border: border ?? "0.5px solid var(--color-border-secondary)",
    background: bg ?? "transparent",
    color: color ?? "var(--color-text-secondary)",
    cursor: "pointer",
  });

  return (
    <div style={{ padding: "26px 30px", maxWidth: 960 }}>

      {/* Modal enviar acesso */}
      {enviarAcessoId && (() => {
        const g = galerias.find((g) => g.id === enviarAcessoId);
        return g ? <ModalEnviarAcesso galeria={g} cliente={g.cliente as any} onClose={() => setEnviarAcessoId(null)} /> : null;
      })()}

      {/* Modal confirmar exclusão */}
      {excluindo && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60 }} onClick={() => !deletando && setExcluindo(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 14, padding: "28px 30px", width: 380, boxShadow: "0 8px 40px rgba(0,0,0,0.18)" }}>
            <h3 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 700, color: "#EF4444" }}>Excluir galeria</h3>
            <p style={{ margin: "0 0 22px", fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
              Tem certeza que deseja excluir <strong style={{ color: "var(--color-text-primary)" }}>{excluindo.titulo}</strong>?<br />Esta ação não pode ser desfeita.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setExcluindo(null)} disabled={deletando} style={{ flex: 1, padding: "9px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "transparent", fontSize: 13, color: "var(--color-text-secondary)", cursor: "pointer" }}>Cancelar</button>
              <button onClick={excluirGaleria} disabled={deletando} style={{ flex: 1, padding: "9px", borderRadius: 8, border: "none", background: "#EF4444", color: "#fff", fontSize: 13, fontWeight: 600, cursor: deletando ? "default" : "pointer" }}>
                {deletando ? "Excluindo…" : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: 19, fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 3px", letterSpacing: "-0.02em" }}>
            Galerias de Seleção
          </h1>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
            {loading ? "Carregando…" : `${galerias.length} galeria${galerias.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Link
          href="/selecao/nova"
          style={{ padding: "9px 18px", borderRadius: 8, background: "var(--color-text-primary)", color: "var(--color-background-primary)", fontSize: 13, fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}
        >
          + Nova galeria
        </Link>
      </div>

      {/* Banner revisão pendente */}
      {!loading && aguardando.length > 0 && filtro !== "aguardando_revisao" && (
        <div
          onClick={() => setFiltro("aguardando_revisao")}
          style={{ background: "rgba(245,158,11,0.08)", border: "0.5px solid rgba(245,158,11,0.4)", borderRadius: 10, padding: "12px 16px", marginBottom: 18, display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(245,158,11,0.13)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(245,158,11,0.08)")}
        >
          <span style={{ fontSize: 20 }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#92400E" }}>
              {aguardando.length} galeria{aguardando.length !== 1 ? "s" : ""} aguardando revisão
            </div>
            <div style={{ fontSize: 11, color: "#B45309" }}>
              {aguardando.map((g) => g.titulo).join(", ")}
            </div>
          </div>
          <span style={{ fontSize: 12, color: "#B45309", fontWeight: 600 }}>Ver →</span>
        </div>
      )}

      {/* Filtros */}
      <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap" }}>
        {([
          { key: "todas",              label: "Todas" },
          { key: "ativa",              label: "Ativa" },
          { key: "aguardando_revisao", label: "Ag. revisão" },
          { key: "encerrada",          label: "Encerrada" },
          { key: "rascunho",           label: "Rascunho" },
        ] as { key: Filtro; label: string }[]).map(({ key, label }) => {
          const ativo     = filtro === key;
          const isAtencao = key === "aguardando_revisao" && aguardando.length > 0;
          return (
            <button
              key={key}
              onClick={() => setFiltro(key)}
              style={{
                padding: "5px 14px", borderRadius: 20, border: "0.5px solid", cursor: "pointer", transition: "all 0.15s", fontSize: 12,
                borderColor: ativo ? (isAtencao ? "#B45309" : "var(--color-text-primary)") : (isAtencao ? "rgba(245,158,11,0.5)" : "var(--color-border-tertiary)"),
                background:  ativo ? (isAtencao ? "#B45309" : "var(--color-text-primary)") : (isAtencao ? "rgba(245,158,11,0.08)" : "transparent"),
                color:       ativo ? "#fff" : (isAtencao ? "#92400E" : "var(--color-text-secondary)"),
                fontWeight:  ativo || isAtencao ? 600 : 400,
              }}
            >
              {label} ({contadores[key]})
            </button>
          );
        })}
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{ padding: "40px 0", textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>
      ) : filtradas.length === 0 ? (
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "52px 24px", textAlign: "center" }}>
          {galerias.length === 0 ? (
            <>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🖼</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 6 }}>Nenhuma galeria ainda</div>
              <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 22 }}>Crie sua primeira galeria de seleção e compartilhe com o cliente.</div>
              <Link href="/selecao/nova" style={{ padding: "10px 22px", borderRadius: 8, background: "var(--color-text-primary)", color: "var(--color-background-primary)", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                + Criar galeria
              </Link>
            </>
          ) : (
            <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
              Nenhuma galeria com status "{STATUS_LABEL[filtro as GaleriaSelecao["status"]]}"
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtradas.map((g) => {
            const st        = STATUS_BADGE[g.status];
            const aguardando = g.status === "aguardando_revisao";
            const encerrada  = g.status === "encerrada";

            return (
              <div
                key={g.id}
                style={{
                  background: aguardando ? "rgba(245,158,11,0.04)" : "var(--color-background-primary)",
                  border: `0.5px solid ${aguardando ? "rgba(245,158,11,0.35)" : "var(--color-border-tertiary)"}`,
                  borderRadius: 10, padding: "14px 18px",
                  display: "flex", alignItems: "center", gap: 14,
                  opacity: encerrada ? 0.65 : 1,
                  transition: "border-color 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = aguardando ? "#F59E0B" : "#2563EB")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = aguardando ? "rgba(245,158,11,0.35)" : "var(--color-border-tertiary)")}
              >
                {/* Ícone */}
                <div style={{ width: 42, height: 42, borderRadius: 9, background: aguardando ? "rgba(245,158,11,0.15)" : "rgba(37,99,235,0.08)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                  🖼
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => router.push(`/selecao/${g.id}`)}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {g.titulo}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>
                    {g.cliente?.nome ?? "Sem cliente"}
                    {g.total_fotos != null && <span> · {g.total_fotos} foto{g.total_fotos !== 1 ? "s" : ""}</span>}
                    {!g.selecao_livre && g.limite_minimo ? <span> · mín. {g.limite_minimo}</span> : null}
                    <span> · {new Date(g.created_at).toLocaleDateString("pt-BR")}</span>
                  </div>
                </div>

                {/* Badge de status */}
                <div style={{ flexShrink: 0 }}>
                  <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: st.bg, color: st.color }}>
                    {STATUS_LABEL[g.status]}
                  </span>
                </div>

                {/* Ações */}
                <div style={{ flexShrink: 0, display: "flex", gap: 4 }} onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setEnviarAcessoId(g.id)}
                    title="Enviar acesso ao cliente"
                    style={{ ...iconBtn("#2563EB", "0.5px solid rgba(37,99,235,0.4)", "rgba(37,99,235,0.05)") }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(37,99,235,0.12)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(37,99,235,0.05)")}
                  ><IcoSend /></button>

                  <button
                    onClick={() => copiarLink(g.id)}
                    title="Copiar link"
                    style={{ ...iconBtn(), background: copiando === g.id ? "rgba(16,185,129,0.08)" : "transparent", color: copiando === g.id ? "#059669" : "var(--color-text-secondary)" }}
                  ><IcoCopy /></button>

                  <button
                    onClick={() => router.push(`/selecao/${g.id}?tab=configuracoes`)}
                    title="Editar configurações"
                    style={iconBtn()}
                  ><IcoEdit /></button>

                  <button
                    onClick={() => setExcluindo(g)}
                    title="Excluir galeria"
                    style={{ ...iconBtn("#EF4444", "0.5px solid rgba(239,68,68,0.25)", "rgba(239,68,68,0.04)") }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.10)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.04)")}
                  ><IcoTrash /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function SelecaoPage() {
  return (
    <Suspense>
      <SelecaoConteudo />
    </Suspense>
  );
}
