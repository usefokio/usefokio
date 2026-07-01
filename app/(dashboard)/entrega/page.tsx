"use client";

import { useEffect, useState } from "react";
import { usePersistedState } from "@/lib/hooks/usePersistedState";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import type { GaleriaEntrega } from "@/lib/supabase/types";
import { ModalEnviarAcesso } from "./_components/ModalEnviarAcesso";
import { normalizar } from "@/lib/utils/normalizar";
import { ModalEmailCliente } from "./_components/ModalEmailCliente";
import { fetchAllRows } from "@/lib/supabase/fetchAll";
import { deleteFilesClient } from "@/lib/storage/deleteClient";
import { useWindowWidth, TABLET } from "@/lib/hooks/useWindowWidth";

// ─── Helpers de status ────────────────────────────────────────────────────────
type StatusEntrega = "ativo" | "expirando" | "expirado" | "sem_prazo" | "suspensa" | "rascunho";
type Filtro = "todas" | StatusEntrega | "tem_arquivos";
type Ordenacao = "evento" | "criado";

function diasRestantes(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  return Math.round((new Date(expiresAt).getTime() - Date.now()) / 86_400_000);
}

function calcularStatus(dias: number | null): StatusEntrega {
  if (dias === null) return "sem_prazo";
  if (dias < 0)     return "expirado";
  if (dias <= 7)    return "expirando";
  return "ativo";
}

function formatarExpiracao(dias: number | null): string {
  if (dias === null) return "Sem prazo";
  if (dias === 0)    return "Expira hoje";
  if (dias === 1)    return "Expira amanhã";
  if (dias < 0)     return `Expirou há ${Math.abs(dias)} dia${Math.abs(dias) > 1 ? "s" : ""}`;
  return `Expira em ${dias} dias`;
}

function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR");
}

function anoEvento(g: GaleriaEntrega): number | null {
  if (!g.data_evento) return null;
  return new Date(g.data_evento + "T12:00:00").getFullYear();
}

const STATUS_LABEL: Record<StatusEntrega, string> = {
  ativo:      "Ativo",
  expirando:  "Expirando",
  expirado:   "Expirado",
  sem_prazo:  "Sem prazo",
  suspensa:   "Suspensa",
  rascunho:   "Rascunho",
};

const STATUS_COLOR: Record<StatusEntrega, string> = {
  ativo:      "rgba(16,185,129,0.12)",
  expirando:  "rgba(245,158,11,0.12)",
  expirado:   "rgba(239,68,68,0.10)",
  sem_prazo:  "rgba(107,114,128,0.10)",
  suspensa:   "rgba(245,158,11,0.12)",
  rascunho:   "rgba(124,58,237,0.10)",
};

const STATUS_TEXT: Record<StatusEntrega, string> = {
  ativo:      "#059669",
  expirando:  "#B45309",
  expirado:   "#EF4444",
  sem_prazo:  "#6B7280",
  suspensa:   "#B45309",
  rascunho:   "#7C3AED",
};

// ─── Ícones inline ────────────────────────────────────────────────────────────
const IcoSend = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);
const IcoMail = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,12 2,6"/>
  </svg>
);
const IcoClock = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);
const IcoEdit = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const IcoDrive = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
  </svg>
);
const IcoTrash = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6M14 11v6"/>
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);

// ─── Modal: Confirmar exclusão ────────────────────────────────────────────────
function ModalExcluir({ titulo, onConfirmar, onFechar, deletando }: { titulo: string; onConfirmar: () => void; onFechar: () => void; deletando: boolean }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }} onClick={onFechar}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 14, padding: "28px 30px", width: 380, boxShadow: "0 8px 40px rgba(0,0,0,0.18)" }}>
        <h3 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 700, color: "#EF4444" }}>Excluir galeria</h3>
        <p style={{ margin: "0 0 22px", fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
          Tem certeza que deseja excluir <strong style={{ color: "var(--color-text-primary)" }}>{titulo}</strong>?<br />Esta ação não pode ser desfeita.
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onFechar} style={{ flex: 1, padding: "9px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "transparent", fontSize: 13, color: "var(--color-text-secondary)", cursor: "pointer" }}>Cancelar</button>
          <button onClick={onConfirmar} disabled={deletando} style={{ flex: 1, padding: "9px", borderRadius: 8, border: "none", background: "#EF4444", color: "#fff", fontSize: 13, fontWeight: 600, cursor: deletando ? "default" : "pointer" }}>
            {deletando ? "Excluindo…" : "Excluir"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function EntregaPage() {
  const router = useRouter();
  const { fotografo } = useFotografo();
  const isMobile = useWindowWidth() < TABLET;

  const [galerias,       setGalerias]       = useState<GaleriaEntrega[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [filtro,         setFiltro]         = usePersistedState<Filtro>("entrega:filtro", "todas");
  const [anoFiltro,      setAnoFiltro]      = usePersistedState<number | null>("entrega:ano", null);
  const [ordenacao,      setOrdenacao]      = usePersistedState<Ordenacao>("entrega:ordenacao", "evento");
  const [busca,          setBusca]          = useState("");
  const [enviarAcessoId, setEnviarAcessoId] = useState<string | null>(null);
  const [emailClienteId, setEmailClienteId] = useState<string | null>(null);
  const [recarregarKey,  setRecarregarKey]  = useState(0);
  const [deletarId,      setDeletarId]      = useState<string | null>(null);
  const [deletando,      setDeletando]      = useState(false);
  const [suspenderPendenteId, setSuspenderPendenteId] = useState<string | null>(null);
  const [modalDrive,    setModalDrive]    = useState<{ galeria: GaleriaEntrega } | null>(null);
  const [driveEmail,    setDriveEmail]    = useState(true);
  const [driveAssunto,  setDriveAssunto]  = useState("");
  const [driveCorpo,    setDriveCorpo]    = useState("");
  const [driveSalvando, setDriveSalvando] = useState(false);

  const CORES = ["#7C6E5A","#5A6E7C","#6E5A7C","#5A7C6E","#7C5A6E","#6E7C5A"];

  async function carregar() {
    if (!fotografo) return;
    const supabase = createClient();

    const [data, { data: rcData }] = await Promise.all([
      fetchAllRows<any>(
        (sbc, f, t) => sbc
          .from("galerias_entrega")
          .select("*, clientes(id, nome, email, telefone, whatsapp), galerias_entrega_fotos(count)")
          .eq("fotografo_id", fotografo.id)
          .eq("rascunho", false)
          .range(f, t),
        supabase
      ),
      supabase
        .from("respostas_campanha")
        .select("galeria_id, token, estagio, resposta, respondido_em, email_1_em, email_2_em")
        .eq("fotografo_id", fotografo.id),
    ]);

    // Indexar respostas por galeria_id para merge O(1)
    const rcPorGaleria: Record<string, any> = {};
    for (const rc of (rcData ?? [])) rcPorGaleria[(rc as any).galeria_id] = rc;

    const lista = (data as any[]).map((g) => ({
      ...g,
      respostas_campanha: rcPorGaleria[g.id] ? [rcPorGaleria[g.id]] : [],
    })) as GaleriaEntrega[];

    setGalerias(lista);
    setLoading(false);

    // Fallback de capa: galerias sem foto_capa_url mas com fotos usam a primeira foto
    const semCapa = lista
      .filter(g => !g.foto_capa_url && ((g as any).galerias_entrega_fotos?.[0]?.count ?? 0) > 0)
      .map(g => g.id);
    if (semCapa.length > 0) {
      const { data: fbs } = await supabase
        .from("galerias_entrega_fotos")
        .select("galeria_id, url_publica")
        .in("galeria_id", semCapa)
        .order("galeria_id")
        .order("created_at")
        .limit(500);
      const mapa: Record<string, string> = {};
      for (const f of (fbs ?? []) as { galeria_id: string; url_publica: string }[]) {
        if (!mapa[f.galeria_id]) mapa[f.galeria_id] = f.url_publica;
      }
      setGalerias(lista.map(g =>
        g.foto_capa_url ? g : { ...g, foto_capa_url: mapa[g.id] ?? g.foto_capa_url }
      ));
    }

    // Auto-enroll suspended or expired galleries that aren't in the funnel yet
    const semFunil = lista.filter((g) => {
      if ((g.respostas_campanha as any[]).length > 0) return false;
      const ehSuspensa = g.suspensa;
      const ehExpirada = !g.suspensa && g.expires_at && new Date(g.expires_at) < new Date();
      return ehSuspensa || ehExpirada;
    });
    semFunil.forEach((g) => fetch(`/api/campanha/galeria/${g.id}`).catch(() => {}));
  }

  useEffect(() => { carregar(); }, [fotografo, recarregarKey]);

  async function toggleSuspender(id: string, suspensa: boolean, renovacao_dias: number) {
    if (suspensa) {
      // Reativar: faz direto, sem modal
      const supabase = createClient();
      const novaExpiracao = new Date(Date.now() + renovacao_dias * 86_400_000).toISOString();
      await supabase.from("galerias_entrega").update({ suspensa: false, expires_at: novaExpiracao }).eq("id", id);
      setGalerias((prev) => prev.map((g) => g.id === id ? { ...g, suspensa: false, expires_at: novaExpiracao } : g));
    } else {
      // Suspender: abre modal de confirmação
      setSuspenderPendenteId(id);
    }
  }

  async function confirmarSuspender(id: string, adicionarAoFunil: boolean, jaNoFunil: boolean) {
    setSuspenderPendenteId(null);
    const supabase = createClient();
    await supabase.from("galerias_entrega").update({ suspensa: true, expires_at: null }).eq("id", id);
    setGalerias((prev) => prev.map((g) => g.id === id ? { ...g, suspensa: true, expires_at: null } : g));
    if (adicionarAoFunil) {
      if (jaNoFunil) {
        // Já tem registro — reativar reseta para nao_contatado do início
        await fetch(`/api/campanha/galeria/${id}/reativar`, { method: "POST" }).catch(() => {});
      } else {
        await fetch(`/api/campanha/galeria/${id}`).catch(() => {});
      }
      setGalerias((prev) => prev.map((g) =>
        g.id === id
          ? { ...g, respostas_campanha: [{ token: "", estagio: "nao_contatado", resposta: null, respondido_em: null }] }
          : g
      ));
    }
  }

  function abrirModalDrive(g: GaleriaEntrega) {
    const nomeCliente = (g.clientes as any)?.nome ?? "cliente";
    setDriveAssunto(`Sobre os arquivos do seu evento — ${g.titulo}`);
    setDriveCorpo(`Olá, ${nomeCliente}!\n\nPassamos para avisar que os arquivos originais (em alta resolução) do seu evento já foram processados e excluídos do nosso drive de edição.\n\nAs suas fotos editadas continuam disponíveis na sua galeria normalmente.\n\nMantemos, por prazo indeterminado, cópias de segurança dos arquivos em formato JPEG em baixa resolução. Caso esses arquivos de backup sejam excluídos em algum momento, entraremos em contato novamente com antecedência.\n\nSe você precisar recuperar esses arquivos de backup, isso é possível mediante uma taxa pelo serviço de armazenamento.\n\nQualquer dúvida, estamos à disposição!`);
    setDriveEmail(!!(g.clientes as any)?.email);
    setModalDrive({ galeria: g });
  }

  async function confirmarDrive() {
    if (!modalDrive) return;
    setDriveSalvando(true);
    const sb = createClient();
    const agora = new Date().toISOString();
    await sb.from("galerias_entrega").update({ drive_processado: true, drive_processado_em: agora }).eq("id", modalDrive.galeria.id);
    if (driveEmail && (modalDrive.galeria.clientes as any)?.email) {
      await fetch("/api/email/enviar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: (modalDrive.galeria.clientes as any).email, subject: driveAssunto, body: driveCorpo }),
      }).catch(() => {});
    }
    setGalerias((prev) => prev.map((g) => g.id === modalDrive.galeria.id ? { ...g, drive_processado: true, drive_processado_em: agora } as any : g));
    setDriveSalvando(false);
    setModalDrive(null);
  }

  async function deletar(id: string) {
    setDeletando(true);
    const supabase = createClient();

    const [{ data: fotos }, { data: galeria }] = await Promise.all([
      supabase.from("galerias_entrega_fotos").select("storage_path, url_publica").eq("galeria_id", id),
      supabase.from("galerias_entrega").select("foto_capa_url").eq("id", id).maybeSingle(),
    ]);

    const items: { storage_path: string; url_publica: string | null }[] = [];
    if (fotos) items.push(...fotos.map((f) => ({ storage_path: f.storage_path, url_publica: f.url_publica })));
    if (galeria?.foto_capa_url && fotografo)
      items.push({ storage_path: `entrega/${fotografo.id}/${id}/capa.jpg`, url_publica: galeria.foto_capa_url });

    for (let i = 0; i < items.length; i += 100)
      await deleteFilesClient(items.slice(i, i + 100));

    await supabase.from("galerias_entrega").delete().eq("id", id);
    setGalerias((prev) => prev.filter((g) => g.id !== id));
    setDeletarId(null);
    setDeletando(false);
  }

  // ─── Derivações ──────────────────────────────────────────────────────────────

  // Status enriquecido
  const comStatus = galerias.map((g) => ({
    ...g,
    _status: g.rascunho ? "rascunho" as StatusEntrega : g.suspensa ? "suspensa" as StatusEntrega : calcularStatus(diasRestantes(g.expires_at)),
  }));

  // Anos disponíveis (descrescente), apenas galerias com data_evento
  const anos = [...new Set(
    comStatus.filter((g) => g.data_evento).map((g) => anoEvento(g)!)
  )].sort((a, b) => b - a);

  // Subconjunto pelo filtro de ano
  const porAno = anoFiltro === null
    ? comStatus
    : comStatus.filter((g) => anoEvento(g) === anoFiltro);

  // Banner de expirando sempre global (ignora filtro de ano)
  const expirando = comStatus.filter((g) => g._status === "expirando");

  // Contadores de status dentro do ano selecionado
  const contadores: Record<Filtro, number> = {
    todas:        porAno.length,
    ativo:        porAno.filter((g) => g._status === "ativo").length,
    expirando:    porAno.filter((g) => g._status === "expirando").length,
    expirado:     porAno.filter((g) => g._status === "expirado").length,
    sem_prazo:    porAno.filter((g) => g._status === "sem_prazo").length,
    suspensa:     porAno.filter((g) => g._status === "suspensa").length,
    rascunho:     porAno.filter((g) => g._status === "rascunho").length,
    tem_arquivos: porAno.filter((g) => (g.respostas_campanha as any[])?.[0]?.resposta === "tem_arquivos").length,
  };

  // Aplicar filtro de status
  const porAnoEStatus = filtro === "todas"
    ? porAno
    : filtro === "tem_arquivos"
      ? porAno.filter((g) => (g.respostas_campanha as any[])?.[0]?.resposta === "tem_arquivos")
      : porAno.filter((g) => g._status === filtro);

  // Aplicar busca por nome
  const porBusca = busca.trim()
    ? porAnoEStatus.filter((g) => {
        const termo = normalizar(busca.trim());
        const nomeCliente = normalizar((g.clientes as any)?.nome ?? "");
        return normalizar(g.titulo).includes(termo) || nomeCliente.includes(termo);
      })
    : porAnoEStatus;

  // Ordenação
  const filtradas = [...porBusca].sort((a, b) => {
    if (ordenacao === "evento") {
      if (!a.data_evento && !b.data_evento) return 0;
      if (!a.data_evento) return 1;
      if (!b.data_evento) return -1;
      return b.data_evento.localeCompare(a.data_evento);
    }
    return b.created_at.localeCompare(a.created_at);
  });

  return (
    <div style={{ padding: isMobile ? "16px" : "26px 30px", maxWidth: 960 }}>

      {/* Header */}
      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: isMobile ? "stretch" : "flex-start", marginBottom: 22, gap: isMobile ? 12 : 0 }}>
        <div>
          <h1 style={{ fontSize: 19, fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 3px", letterSpacing: "-0.02em" }}>Galerias de Entrega</h1>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
            {loading ? "Carregando…" : `${galerias.length} galeria${galerias.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {/* Busca */}
          <div style={{ position: "relative", flex: isMobile ? 1 : "none" }}>
            <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "var(--color-text-secondary)", pointerEvents: "none" }}>🔍</span>
            <input
              type="text"
              placeholder="Buscar galeria…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              style={{
                fontSize: 12, padding: "5px 10px 5px 28px", borderRadius: 7, width: isMobile ? "100%" : 180,
                border: "0.5px solid var(--color-border-secondary)",
                background: "var(--color-background-secondary)",
                color: "var(--color-text-primary)", outline: "none", boxSizing: "border-box",
              }}
            />
            {busca && (
              <button onClick={() => setBusca("")} style={{ position: "absolute", right: 7, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "var(--color-text-secondary)", padding: 0, lineHeight: 1 }}>✕</button>
            )}
          </div>
          {/* Ordenação */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {!isMobile && <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Ordenar:</span>}
            <select
              value={ordenacao}
              onChange={(e) => setOrdenacao(e.target.value as Ordenacao)}
              style={{
                fontSize: 12, padding: "5px 8px", borderRadius: 7,
                border: "0.5px solid var(--color-border-secondary)",
                background: "var(--color-background-secondary)",
                color: "var(--color-text-primary)", cursor: "pointer",
              }}
            >
              <option value="evento">Data do evento</option>
              <option value="criado">Data de criação</option>
            </select>
          </div>
          <Link href="/entrega/nova" style={{ padding: "9px 18px", borderRadius: 8, background: "var(--color-text-primary)", color: "var(--color-background-primary)", fontSize: 13, fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
            + Nova entrega
          </Link>
        </div>
      </div>

      {/* Banner: expirando */}
      {!loading && expirando.length > 0 && filtro !== "expirando" && (
        <div
          onClick={() => setFiltro("expirando")}
          style={{ background: "rgba(245,158,11,0.08)", border: "0.5px solid rgba(245,158,11,0.4)", borderRadius: 10, padding: "12px 16px", marginBottom: 18, display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(245,158,11,0.13)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(245,158,11,0.08)")}
        >
          <span style={{ fontSize: 20 }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#92400E" }}>
              {expirando.length} galeria{expirando.length !== 1 ? "s" : ""} expirando em breve
            </div>
            <div style={{ fontSize: 11, color: "#B45309" }}>
              {expirando.map((g) => g.titulo).join(", ")}
            </div>
          </div>
          <span style={{ fontSize: 12, color: "#B45309", fontWeight: 600 }}>Ver →</span>
        </div>
      )}

      {/* Filtro por ano */}
      {!loading && anos.length > 0 && (
        <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "var(--color-text-secondary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginRight: 2 }}>Ano</span>
          <button
            onClick={() => setAnoFiltro(null)}
            style={{
              padding: "4px 12px", borderRadius: 20, border: "0.5px solid", cursor: "pointer", fontSize: 12, transition: "all 0.15s",
              borderColor: anoFiltro === null ? "var(--color-text-primary)" : "var(--color-border-tertiary)",
              background: anoFiltro === null ? "var(--color-text-primary)" : "transparent",
              color: anoFiltro === null ? "var(--color-background-primary)" : "var(--color-text-secondary)",
              fontWeight: anoFiltro === null ? 600 : 400,
            }}
          >
            Todos
          </button>
          {anos.map((ano) => {
            const ativo = anoFiltro === ano;
            const count = comStatus.filter((g) => anoEvento(g) === ano).length;
            return (
              <button
                key={ano}
                onClick={() => setAnoFiltro(ativo ? null : ano)}
                style={{
                  padding: "4px 12px", borderRadius: 20, border: "0.5px solid", cursor: "pointer", fontSize: 12, transition: "all 0.15s",
                  borderColor: ativo ? "var(--color-text-primary)" : "var(--color-border-tertiary)",
                  background: ativo ? "var(--color-text-primary)" : "transparent",
                  color: ativo ? "var(--color-background-primary)" : "var(--color-text-secondary)",
                  fontWeight: ativo ? 600 : 400,
                }}
              >
                {ano} <span style={{ opacity: 0.65 }}>({count})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Filtros de status */}
      <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 11, color: "var(--color-text-secondary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginRight: 2 }}>Status</span>
        {(["todas", "expirando", "ativo", "expirado", "sem_prazo", "suspensa", "rascunho"] as Filtro[]).map((s) => {
          const isAtencao = s === "expirando";
          const ativo     = filtro === s;
          const cnt       = contadores[s];
          return (
            <button
              key={s}
              onClick={() => setFiltro(s)}
              style={{
                padding: "4px 12px", borderRadius: 20, border: "0.5px solid", cursor: "pointer", transition: "all 0.15s", fontSize: 12,
                borderColor: ativo ? (isAtencao ? "#B45309" : "var(--color-text-primary)") : (isAtencao && contadores.expirando > 0 ? "rgba(245,158,11,0.5)" : "var(--color-border-tertiary)"),
                background: ativo ? (isAtencao ? "#B45309" : "var(--color-text-primary)") : (isAtencao && contadores.expirando > 0 ? "rgba(245,158,11,0.08)" : "transparent"),
                color: ativo ? "white" : (isAtencao && contadores.expirando > 0 ? "#92400E" : "var(--color-text-secondary)"),
                fontWeight: ativo || (isAtencao && contadores.expirando > 0) ? 600 : 400,
              }}
            >
              {s === "todas" ? "Todas" : STATUS_LABEL[s as StatusEntrega]} ({cnt})
            </button>
          );
        })}
        {contadores.tem_arquivos > 0 && (
          <button
            onClick={() => setFiltro(filtro === "tem_arquivos" ? "todas" : "tem_arquivos")}
            style={{
              padding: "4px 12px", borderRadius: 20, border: "0.5px solid", cursor: "pointer",
              fontSize: 12, transition: "all 0.15s",
              borderColor: filtro === "tem_arquivos" ? "#16a34a" : "rgba(34,197,94,0.4)",
              background: filtro === "tem_arquivos" ? "#16a34a" : "rgba(34,197,94,0.08)",
              color: filtro === "tem_arquivos" ? "white" : "#16a34a",
              fontWeight: filtro === "tem_arquivos" ? 600 : 500,
            }}
          >
            ✅ Já tem arquivos ({contadores.tem_arquivos})
          </button>
        )}
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{ padding: "40px 0", textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>
      ) : filtradas.length === 0 ? (
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "52px 24px", textAlign: "center" }}>
          {galerias.length === 0 ? (
            <>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 6 }}>Nenhuma galeria de entrega ainda</div>
              <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 22 }}>Crie sua primeira galeria de entrega para compartilhar fotos com o cliente.</div>
              <Link href="/entrega/nova" style={{ padding: "10px 22px", borderRadius: 8, background: "var(--color-text-primary)", color: "var(--color-background-primary)", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                + Nova entrega
              </Link>
            </>
          ) : (
            <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
              Nenhuma galeria encontrada{anoFiltro ? ` em ${anoFiltro}` : ""}{filtro !== "todas" ? ` com status "${filtro === "tem_arquivos" ? "Já tem arquivos" : STATUS_LABEL[filtro as StatusEntrega]}"` : ""}
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {filtradas.map((g, i) => {
            const dias   = diasRestantes(g.expires_at);
            const status = g._status;
            const isAtencao = status === "expirando";
            const isExpirado = status === "expirado";
            const cor = g.cover_color ?? CORES[i % CORES.length];

            return (
              <div
                key={g.id}
                style={{
                  background: isAtencao ? "rgba(245,158,11,0.04)" : "var(--color-background-primary)",
                  border: `0.5px solid ${isAtencao ? "rgba(245,158,11,0.35)" : "var(--color-border-tertiary)"}`,
                  borderRadius: 8, padding: "9px 14px",
                  display: "flex", alignItems: "center", gap: 10,
                  opacity: isExpirado ? 0.65 : 1,
                  transition: "border-color 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = isAtencao ? "#F59E0B" : "#2563EB")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = isAtencao ? "rgba(245,158,11,0.35)" : "var(--color-border-tertiary)")}
              >
                {/* Capa */}
                {g.foto_capa_url ? (
                  <img src={g.foto_capa_url} alt="" style={{ width: 34, height: 34, borderRadius: 7, objectFit: "cover", flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 34, height: 34, borderRadius: 7, background: cor, flexShrink: 0 }} />
                )}

                {/* Info principal */}
                <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => router.push(`/entrega/${g.id}`)}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.titulo}</span>
                    {(() => {
                      const rc = g.respostas_campanha?.[0] as any;
                      const elegivel = g.suspensa || (!g.suspensa && g.expires_at && new Date(g.expires_at) < new Date());
                      if (!rc && !elegivel) return null;
                      if (!rc) return (
                        <span title="Na campanha de reativação — sem contato ainda" style={{ flexShrink: 0, fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 20, background: "rgba(245,158,11,0.10)", color: "#B45309" }}>
                          📢 campanha
                        </span>
                      );
                      const diasDesde = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);

                      if (rc.resposta === "tem_arquivos") return (
                        <span title="Cliente confirmou: já tem os arquivos" style={{ flexShrink: 0, fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 20, background: "rgba(16,185,129,0.12)", color: "#059669" }}>
                          ✓ já tem os arquivos
                        </span>
                      );
                      if (rc.resposta === "renovar") {
                        const acessoAtivo = !g.suspensa && (!g.expires_at || new Date(g.expires_at) > new Date());
                        return acessoAtivo ? (
                          <span title="Pagamento confirmado — acesso reativado" style={{ flexShrink: 0, fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 20, background: "rgba(37,99,235,0.10)", color: "#2563EB" }}>
                            ✓ acesso reativado
                          </span>
                        ) : (
                          <span title="Cliente sinalizou que quer renovar — aguardando pagamento" style={{ flexShrink: 0, fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 20, background: "rgba(245,158,11,0.12)", color: "#B45309" }}>
                            ⏳ quer renovar
                          </span>
                        );
                      }
                      if (rc.estagio === "encerrado") return (
                        <span title="Encerrado sem resposta" style={{ flexShrink: 0, fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 20, background: "rgba(107,114,128,0.10)", color: "#6B7280" }}>
                          encerrado
                        </span>
                      );
                      if (rc.estagio === "whatsapp") return (
                        <span title="WhatsApp enviado — aguardando resposta" style={{ flexShrink: 0, fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 20, background: "rgba(34,197,94,0.10)", color: "#15803D" }}>
                          📱 whatsapp
                        </span>
                      );
                      if (rc.estagio === "email_2") {
                        const atrasado = rc.email_2_em && diasDesde(rc.email_2_em) >= 4;
                        return (
                          <span title={atrasado ? `2º email enviado há ${diasDesde(rc.email_2_em)} dias — envie o WhatsApp!` : "2 emails enviados — aguardando resposta"} style={{ flexShrink: 0, fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 20, background: atrasado ? "rgba(245,158,11,0.15)" : "rgba(124,58,237,0.08)", color: atrasado ? "#B45309" : "#7C3AED" }}>
                            {atrasado ? "⚠️ WhatsApp" : "📧×2"}
                          </span>
                        );
                      }
                      if (rc.estagio === "email_1") {
                        const atrasado = rc.email_1_em && diasDesde(rc.email_1_em) >= 10;
                        return (
                          <span title={atrasado ? `1º email enviado há ${diasDesde(rc.email_1_em)} dias — envie o 2º email!` : "1 email enviado — aguardando resposta"} style={{ flexShrink: 0, fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 20, background: atrasado ? "rgba(245,158,11,0.15)" : "rgba(124,58,237,0.08)", color: atrasado ? "#B45309" : "#7C3AED" }}>
                            {atrasado ? "⚠️ 2º email" : "📧×1"}
                          </span>
                        );
                      }
                      // nao_contatado: galeria está na campanha mas ainda sem contato feito
                      return (
                        <span title="Na campanha de reativação — sem contato ainda" style={{ flexShrink: 0, fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 20, background: "rgba(245,158,11,0.10)", color: "#B45309" }}>
                          📢 campanha
                        </span>
                      );
                    })()}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 1 }}>
                    {g.clientes ? <Link href={`/clientes/${g.clientes.id}`} style={{ color: "inherit", textDecoration: "none" }} onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")} onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}>{g.clientes.nome}</Link> : "Sem cliente"}
                    {((g.galerias_entrega_fotos?.[0]?.count ?? 0) > 0) && <span> · {g.galerias_entrega_fotos![0].count} foto{g.galerias_entrega_fotos![0].count !== 1 ? "s" : ""}</span>}
                    {g.total_acessos > 0 && <span> · {g.total_acessos} acesso{g.total_acessos !== 1 ? "s" : ""}</span>}
                    {g.downloads > 0 && <span> · {g.downloads} download{g.downloads !== 1 ? "s" : ""}</span>}
                    {g.data_evento && <span> · {new Date(g.data_evento + "T12:00:00").toLocaleDateString("pt-BR")}</span>}
                  </div>
                </div>

                {/* Status + prazo */}
                <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 600, background: STATUS_COLOR[status], color: STATUS_TEXT[status] }}>
                      {STATUS_LABEL[status]}
                    </span>
                    {status !== "suspensa" && (
                      <div style={{ fontSize: 10, color: isAtencao ? "#B45309" : isExpirado ? "#EF4444" : "var(--color-text-secondary)", marginTop: 2 }}>
                        {formatarExpiracao(dias)}
                        {g.expires_at && <span style={{ fontWeight: 600 }}> · {new Date(g.expires_at).toLocaleDateString("pt-BR")}</span>}
                      </div>
                    )}
                  </div>
                </div>

                {/* Ações */}
                <div style={{ flexShrink: 0, display: "flex", gap: 3 }} onClick={(e) => e.stopPropagation()}>

                  <button
                    onClick={() => setEmailClienteId(g.id)}
                    title="Enviar email ao cliente"
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: 6, border: "0.5px solid rgba(124,58,237,0.35)", color: "#7C3AED", background: "rgba(124,58,237,0.05)", cursor: "pointer" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(124,58,237,0.12)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(124,58,237,0.05)")}
                  ><IcoMail /></button>

                  <button
                    onClick={() => toggleSuspender(g.id, g.suspensa, g.renovacao_dias)}
                    title={g.suspensa ? "Reativar acesso" : "Suspender acesso"}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center",
                      width: 26, height: 26, borderRadius: 6, cursor: "pointer",
                      border: g.suspensa ? "0.5px solid rgba(245,158,11,0.45)" : "0.5px solid rgba(16,185,129,0.45)",
                      color: g.suspensa ? "#D97706" : "#059669",
                      background: g.suspensa ? "rgba(245,158,11,0.08)" : "rgba(16,185,129,0.08)",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = g.suspensa ? "rgba(245,158,11,0.16)" : "rgba(16,185,129,0.16)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = g.suspensa ? "rgba(245,158,11,0.08)" : "rgba(16,185,129,0.08)")}
                  ><IcoClock /></button>

                  {(g as any).drive_processado ? (
                    <span
                      title={`Drive processado em ${formatarData((g as any).drive_processado_em ?? g.created_at)}`}
                      style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 600, padding: "0 7px", height: 26, borderRadius: 6, background: "rgba(5,150,105,0.10)", color: "#059669", border: "0.5px solid rgba(5,150,105,0.3)", whiteSpace: "nowrap" }}
                    >✓ Drive</span>
                  ) : (
                    <button
                      onClick={() => abrirModalDrive(g)}
                      title="Marcar drive como processado"
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: 6, border: "0.5px solid var(--color-border-secondary)", color: "var(--color-text-secondary)", background: "transparent", cursor: "pointer", opacity: 0.5 }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.5")}
                    ><IcoDrive /></button>
                  )}

                  <button
                    onClick={() => router.push(`/entrega/${g.id}/editar`)}
                    title="Editar"
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: 6, border: "0.5px solid var(--color-border-secondary)", color: "var(--color-text-secondary)", background: "transparent", cursor: "pointer" }}
                  ><IcoEdit /></button>

                  <button
                    onClick={() => setDeletarId(g.id)}
                    title="Excluir"
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: 6, border: "0.5px solid rgba(239,68,68,0.3)", color: "#EF4444", background: "transparent", cursor: "pointer", opacity: 0.6 }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.6")}
                  ><IcoTrash /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modais */}
      {enviarAcessoId && (() => {
        const g = galerias.find((g) => g.id === enviarAcessoId);
        return g ? <ModalEnviarAcesso galeria={g} onFechar={() => setEnviarAcessoId(null)} /> : null;
      })()}

      {emailClienteId && (() => {
        const g = galerias.find((g) => g.id === emailClienteId);
        if (!g) return null;
        return (
          <ModalEmailCliente
            galeria={g}
            onFechar={() => { setEmailClienteId(null); setRecarregarKey((k) => k + 1); }}
            onEstagioAvancado={(patch) => {
              setGalerias((prev) => prev.map((gl) =>
                gl.id === emailClienteId
                  ? { ...gl, respostas_campanha: [{ ...gl.respostas_campanha?.[0], ...patch } as any] }
                  : gl
              ));
            }}
          />
        );
      })()}

      {deletarId && (() => {
        const g = galerias.find((g) => g.id === deletarId);
        return g ? <ModalExcluir titulo={g.titulo} onConfirmar={() => deletar(g.id)} onFechar={() => setDeletarId(null)} deletando={deletando} /> : null;
      })()}

      {modalDrive && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }} onClick={() => setModalDrive(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 14, padding: "26px 28px", width: 480, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 8px 40px rgba(0,0,0,0.18)" }}>
            <h3 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700, color: "var(--color-text-primary)" }}>Marcar drive como processado</h3>
            <p style={{ margin: "0 0 14px", fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
              Indica que os arquivos originais de <strong style={{ color: "var(--color-text-primary)" }}>{modalDrive.galeria.titulo}</strong> foram excluídos do drive.
            </p>
            <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(245,158,11,0.08)", border: "0.5px solid rgba(245,158,11,0.3)", fontSize: 12, color: "#B45309", marginBottom: 18, lineHeight: 1.5 }}>
              ⚠️ Esta ação é irreversível — serve apenas como registro interno.
            </div>

            {/* Toggle email */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: driveEmail ? 14 : 22 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>Avisar o cliente por email</div>
                {!(modalDrive.galeria.clientes as any)?.email && (
                  <div style={{ fontSize: 11, color: "#EF4444", marginTop: 2 }}>Cliente sem email cadastrado</div>
                )}
              </div>
              <button
                onClick={() => setDriveEmail((v) => !v)}
                disabled={!(modalDrive.galeria.clientes as any)?.email}
                style={{ width: 44, height: 24, borderRadius: 12, border: "none", cursor: (modalDrive.galeria.clientes as any)?.email ? "pointer" : "not-allowed", position: "relative", background: driveEmail ? "#6366f1" : "var(--color-border-secondary)", opacity: (modalDrive.galeria.clientes as any)?.email ? 1 : 0.4 }}
              >
                <span style={{ position: "absolute", top: 3, left: driveEmail ? 22 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.15s", display: "block" }} />
              </button>
            </div>

            {driveEmail && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 5 }}>Assunto</div>
                  <input value={driveAssunto} onChange={(e) => setDriveAssunto(e.target.value)} style={{ width: "100%", boxSizing: "border-box", padding: "8px 11px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", fontSize: 13, color: "var(--color-text-primary)", outline: "none" }} />
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 5 }}>Mensagem</div>
                  <textarea value={driveCorpo} onChange={(e) => setDriveCorpo(e.target.value)} rows={9} style={{ width: "100%", boxSizing: "border-box", padding: "8px 11px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", fontSize: 13, color: "var(--color-text-primary)", outline: "none", resize: "vertical", lineHeight: 1.6, fontFamily: "inherit" }} />
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setModalDrive(null)} style={{ flex: 1, padding: "9px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "transparent", fontSize: 13, color: "var(--color-text-secondary)", cursor: "pointer" }}>Cancelar</button>
              <button onClick={confirmarDrive} disabled={driveSalvando} style={{ flex: 1, padding: "9px", borderRadius: 8, border: "none", background: "#111", color: "#fff", fontSize: 13, fontWeight: 600, cursor: driveSalvando ? "default" : "pointer" }}>
                {driveSalvando ? "Salvando…" : driveEmail ? "Confirmar e enviar email" : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {suspenderPendenteId && (() => {
        const g = galerias.find((g) => g.id === suspenderPendenteId);
        if (!g) return null;
        const jaNoFunil = !!(g.respostas_campanha as any[])?.length;
        return (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }} onClick={() => setSuspenderPendenteId(null)}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 14, padding: "26px 28px", width: 400, boxShadow: "0 8px 40px rgba(0,0,0,0.18)" }}>
              <h3 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700, color: "var(--color-text-primary)" }}>
                Suspender galeria
              </h3>
              <p style={{ margin: "0 0 20px", fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
                O acesso de <strong style={{ color: "var(--color-text-primary)" }}>{g.titulo}</strong> será suspenso imediatamente.
                {" "}{jaNoFunil ? "Deseja reiniciar esta galeria no início do funil de campanha?" : "Deseja também adicionar esta galeria ao funil de campanha para acompanhar o contato com o cliente?"}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button
                  onClick={() => confirmarSuspender(g.id, true, jaNoFunil)}
                  style={{ width: "100%", padding: "10px", borderRadius: 8, border: "none", background: "var(--color-text-primary)", color: "var(--color-background-primary)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                >
                  {jaNoFunil ? "📢 Suspender e reiniciar no funil" : "📢 Suspender e adicionar ao funil"}
                </button>
                <button
                  onClick={() => confirmarSuspender(g.id, false, jaNoFunil)}
                  style={{ width: "100%", padding: "10px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "transparent", fontSize: 13, fontWeight: 400, color: "var(--color-text-primary)", cursor: "pointer" }}
                >
                  Apenas suspender
                </button>
                <button
                  onClick={() => setSuspenderPendenteId(null)}
                  style={{ width: "100%", padding: "9px", borderRadius: 8, border: "none", background: "transparent", fontSize: 12, color: "var(--color-text-secondary)", cursor: "pointer" }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
