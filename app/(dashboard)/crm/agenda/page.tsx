"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import type { CrmSchedule, CrmAgendamentoCategoria, Cliente } from "@/lib/supabase/types";

// ─── Tipos internos ────────────────────────────────────────────────────────────

type TipoEvento = "agendamento" | "tarefa" | "evento_opp" | "evento_pedido" | "a_receber" | "a_pagar" | "aniversario" | "feriado";

interface EventoCalendario {
  id: string;
  dia: string; // YYYY-MM-DD
  titulo: string;
  tipo: TipoEvento;
  cor: string;
  bg: string;
  navegarPara?: string;
  dados?: CrmSchedule;
}

// ─── Configuração visual por tipo ──────────────────────────────────────────────

const TIPO_CONFIG: Record<TipoEvento, { label: string; cor: string; bg: string }> = {
  agendamento:   { label: "Agendamentos", cor: "#7C3AED", bg: "rgba(124,58,237,0.12)" },
  tarefa:        { label: "Tarefas",      cor: "#D97706", bg: "rgba(217,119,6,0.12)"  },
  evento_opp:    { label: "Eventos",      cor: "#2563EB", bg: "rgba(37,99,235,0.12)"  },
  evento_pedido: { label: "Eventos",      cor: "#2563EB", bg: "rgba(37,99,235,0.12)"  },
  a_receber:     { label: "A receber",    cor: "#059669", bg: "rgba(5,150,105,0.12)"  },
  a_pagar:       { label: "A pagar",      cor: "#EF4444", bg: "rgba(239,68,68,0.12)"  },
  aniversario:   { label: "Aniversários", cor: "#F59E0B", bg: "rgba(245,158,11,0.12)" },
  feriado:       { label: "Feriados",     cor: "#6B7280", bg: "rgba(107,114,128,0.12)"},
};

// ─── Filtros disponíveis ───────────────────────────────────────────────────────

type FiltroKey = "agendamento" | "tarefa" | "eventos" | "a_receber" | "a_pagar" | "aniversario" | "feriado";

const FILTROS: { key: FiltroKey; label: string; cor: string }[] = [
  { key: "eventos",     label: "Eventos",      cor: "#2563EB" },
  { key: "agendamento", label: "Agendamentos", cor: "#7C3AED" },
  { key: "tarefa",      label: "Tarefas",      cor: "#D97706" },
  { key: "a_receber",   label: "A receber",    cor: "#059669" },
  { key: "a_pagar",     label: "A pagar",      cor: "#EF4444" },
  { key: "aniversario", label: "Aniversários", cor: "#F59E0B" },
  { key: "feriado",     label: "Feriados",     cor: "#6B7280" },
];

const STORAGE_KEY = "crm_agenda_filtros";

function carregarFiltros(): Record<FiltroKey, boolean> {
  if (typeof window === "undefined") return {} as Record<FiltroKey, boolean>;
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) return JSON.parse(s);
  } catch { /* ignore */ }
  return { eventos: true, agendamento: true, tarefa: true, a_receber: true, a_pagar: true, aniversario: true, feriado: true };
}

// ─── Feriados nacionais BR ─────────────────────────────────────────────────────

function feriadosBR(ano: number): { data: string; nome: string }[] {
  const f: { data: string; nome: string }[] = [
    { data: `${ano}-01-01`, nome: "Ano Novo" },
    { data: `${ano}-04-21`, nome: "Tiradentes" },
    { data: `${ano}-05-01`, nome: "Dia do Trabalho" },
    { data: `${ano}-09-07`, nome: "Independência" },
    { data: `${ano}-10-12`, nome: "Nossa Sra. Aparecida" },
    { data: `${ano}-11-02`, nome: "Finados" },
    { data: `${ano}-11-15`, nome: "Proclamação da República" },
    { data: `${ano}-11-20`, nome: "Consciência Negra" },
    { data: `${ano}-12-25`, nome: "Natal" },
  ];
  // Páscoa (algoritmo Gauss)
  const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100;
  const d = Math.floor(b / 4), e = b % 4, g = Math.floor((8 * b + 13) / 25);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 19 * l) / 433);
  const n = Math.floor((h + l - 7 * m + 90) / 25);
  const p = (h + l - 7 * m + 33 * n + 19) % 32;
  const pascoa = new Date(ano, n - 1, p);
  const addDias = (base: Date, dias: number) => {
    const d2 = new Date(base); d2.setDate(d2.getDate() + dias);
    return d2.toISOString().slice(0, 10);
  };
  f.push({ data: addDias(pascoa, -47), nome: "Carnaval" });
  f.push({ data: addDias(pascoa, -2),  nome: "Sexta-feira Santa" });
  f.push({ data: addDias(pascoa, 0),   nome: "Páscoa" });
  f.push({ data: addDias(pascoa, 60),  nome: "Corpus Christi" });
  return f;
}

// ─── Helpers de data ───────────────────────────────────────────────────────────

function isoDate(d: Date) { return d.toISOString().slice(0, 10); }
function diasNoMes(ano: number, mes: number) { return new Date(ano, mes + 1, 0).getDate(); }
function primeiroDiaSemana(ano: number, mes: number) { return new Date(ano, mes, 1).getDay(); }
function nomeMes(ano: number, mes: number) {
  return new Date(ano, mes, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

// ─── Modal de evento ───────────────────────────────────────────────────────────

type ModalState =
  | { modo: "fechado" }
  | { modo: "novo"; diaInicial: string }
  | { modo: "editar"; evento: EventoCalendario };

// ─── Componente principal ──────────────────────────────────────────────────────

export default function AgendaPage() {
  const router       = useRouter();
  const params       = useSearchParams();
  const { fotografo } = useFotografo();

  const hoje = new Date();
  const [ano,  setAno]  = useState(hoje.getFullYear());
  const [mes,  setMes]  = useState(hoje.getMonth());
  const [filtros, setFiltros] = useState<Record<FiltroKey, boolean>>(carregarFiltros);
  const [eventos, setEventos] = useState<EventoCalendario[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState<ModalState>({ modo: "fechado" });
  const [tooltipId, setTooltipId] = useState<string | null>(null);

  // Abre modal de novo evento se ?novo=1 na URL
  useEffect(() => {
    if (params.get("novo") === "1") {
      setModal({ modo: "novo", diaInicial: isoDate(hoje) });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const salvarFiltros = (f: Record<FiltroKey, boolean>) => {
    setFiltros(f);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(f));
  };

  const toggleFiltro = (key: FiltroKey) => salvarFiltros({ ...filtros, [key]: !filtros[key] });

  // ─── Carregar todos os dados do mês ─────────────────────────────────────────

  const carregar = useCallback(async () => {
    if (!fotografo) return;
    setLoading(true);

    const fid = fotografo.id;
    const sb  = createClient();
    const anoAtual = ano;
    const mesAtual = mes;

    const inicio = `${anoAtual}-${String(mesAtual + 1).padStart(2, "0")}-01`;
    const fim    = `${anoAtual}-${String(mesAtual + 1).padStart(2, "0")}-${String(diasNoMes(anoAtual, mesAtual)).padStart(2, "0")}`;

    const [
      { data: schedules },
      { data: orders },
      { data: finEntries },
      { data: clientes },
    ] = await Promise.all([
      sb.from("crm_schedules")
        .select("*")
        .eq("fotografo_id", fid)
        .gte("inicio", inicio)
        .lte("inicio", fim + "T23:59:59"),

      sb.from("crm_orders")
        .select("id, nome, numero, data_evento, clientes(nome)")
        .eq("fotografo_id", fid)
        .not("data_evento", "is", null)
        .gte("data_evento", inicio)
        .lte("data_evento", fim),

      sb.from("crm_financial_entries")
        .select("id, descricao, tipo, status, vencimento")
        .eq("fotografo_id", fid)
        .eq("status", "pendente")
        .gte("vencimento", inicio)
        .lte("vencimento", fim),

      sb.from("clientes")
        .select("id, nome, data_nascimento")
        .eq("fotografo_id", fid)
        .eq("crm_ativo", true)
        .not("data_nascimento", "is", null),
    ]);

    const lista: EventoCalendario[] = [];

    // Agendamentos e tarefas
    for (const s of (schedules ?? []) as CrmSchedule[]) {
      const tipo: TipoEvento = s.tipo === "tarefa" ? "tarefa" : "agendamento";
      const cfg = TIPO_CONFIG[tipo];
      lista.push({ id: s.id, dia: s.inicio.slice(0, 10), titulo: s.titulo, tipo, cor: cfg.cor, bg: cfg.bg, dados: s });
    }

    // Eventos de pedidos
    for (const p of (orders ?? []) as { id: string; nome: string | null; numero: string | null; data_evento: string | null; clientes: { nome: string }[] | null }[]) {
      if (!p.data_evento) continue;
      const nome = p.nome ?? p.numero ?? "Pedido";
      const clienteNome = Array.isArray(p.clientes) ? p.clientes[0]?.nome : (p.clientes as { nome: string } | null)?.nome;
      const cliente = clienteNome ? ` — ${clienteNome}` : "";
      lista.push({ id: `ped-${p.id}`, dia: p.data_evento, titulo: nome + cliente, tipo: "evento_pedido", cor: TIPO_CONFIG.evento_pedido.cor, bg: TIPO_CONFIG.evento_pedido.bg, navegarPara: `/crm/pedidos/${p.id}` });
    }

    // Financeiro
    for (const f of (finEntries ?? []) as { id: string; descricao: string; tipo: string; status: string; vencimento: string }[]) {
      const tipo: TipoEvento = f.tipo === "receita" ? "a_receber" : "a_pagar";
      const cfg = TIPO_CONFIG[tipo];
      lista.push({ id: `fin-${f.id}`, dia: f.vencimento, titulo: f.descricao, tipo, cor: cfg.cor, bg: cfg.bg, navegarPara: "/crm/financeiro" });
    }

    // Aniversários de clientes (filtra por dia/mês do mês exibido)
    const mesStr = String(mesAtual + 1).padStart(2, "0");
    for (const c of (clientes ?? []) as (Cliente & { data_nascimento: string })[]) {
      if (!c.data_nascimento) continue;
      const [, cMes, cDia] = c.data_nascimento.split("-");
      if (cMes !== mesStr) continue;
      const dia = `${anoAtual}-${mesStr}-${cDia}`;
      lista.push({ id: `aniv-${c.id}`, dia, titulo: `🎂 ${c.nome}`, tipo: "aniversario", cor: TIPO_CONFIG.aniversario.cor, bg: TIPO_CONFIG.aniversario.bg });
    }

    // Feriados
    for (const f of feriadosBR(anoAtual)) {
      if (!f.data.startsWith(`${anoAtual}-${mesStr}`)) continue;
      lista.push({ id: `fer-${f.data}`, dia: f.data, titulo: f.nome, tipo: "feriado", cor: TIPO_CONFIG.feriado.cor, bg: TIPO_CONFIG.feriado.bg });
    }

    setEventos(lista);
    setLoading(false);
  }, [fotografo, ano, mes]);

  useEffect(() => { carregar(); }, [carregar]);

  // ─── Navegação de mês ────────────────────────────────────────────────────────

  const irParaMes = (delta: number) => {
    setMes((m) => {
      const novoMes = m + delta;
      if (novoMes < 0)  { setAno((a) => a - 1); return 11; }
      if (novoMes > 11) { setAno((a) => a + 1); return 0; }
      return novoMes;
    });
  };

  const irHoje = () => { setAno(hoje.getFullYear()); setMes(hoje.getMonth()); };

  // ─── Filtrar eventos visíveis ─────────────────────────────────────────────────

  const eventosFiltrados = eventos.filter((e) => {
    if (e.tipo === "agendamento") return filtros.agendamento;
    if (e.tipo === "tarefa")      return filtros.tarefa;
    if (e.tipo === "evento_opp" || e.tipo === "evento_pedido") return filtros.eventos;
    if (e.tipo === "a_receber")   return filtros.a_receber;
    if (e.tipo === "a_pagar")     return filtros.a_pagar;
    if (e.tipo === "aniversario") return filtros.aniversario;
    if (e.tipo === "feriado")     return filtros.feriado;
    return true;
  });

  // ─── Montar grade do calendário ───────────────────────────────────────────────

  const totalDias  = diasNoMes(ano, mes);
  const primeiroDia = primeiroDiaSemana(ano, mes);
  const celulas: (number | null)[] = [
    ...Array(primeiroDia).fill(null),
    ...Array.from({ length: totalDias }, (_, i) => i + 1),
  ];
  while (celulas.length % 7 !== 0) celulas.push(null);

  const eventosPorDia = (dia: number): EventoCalendario[] => {
    const diaStr = `${ano}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
    return eventosFiltrados.filter((e) => e.dia === diaStr);
  };

  const isHoje = (dia: number) =>
    dia === hoje.getDate() && mes === hoje.getMonth() && ano === hoje.getFullYear();

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: "28px 32px", fontFamily: "var(--font-sans)", maxWidth: 1200 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => irParaMes(-1)}
            style={{ width: 32, height: 32, borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "none", cursor: "pointer", fontSize: 16, color: "var(--color-text-secondary)", display: "flex", alignItems: "center", justifyContent: "center" }}
          >‹</button>
          <h1 style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--color-text-primary)", margin: 0, minWidth: 200, textAlign: "center", textTransform: "capitalize" }}>
            {nomeMes(ano, mes)}
          </h1>
          <button
            onClick={() => irParaMes(1)}
            style={{ width: 32, height: 32, borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "none", cursor: "pointer", fontSize: 16, color: "var(--color-text-secondary)", display: "flex", alignItems: "center", justifyContent: "center" }}
          >›</button>
          <button
            onClick={irHoje}
            style={{ padding: "5px 12px", borderRadius: 7, border: "0.5px solid var(--color-border-secondary)", background: "none", cursor: "pointer", fontSize: 12, color: "var(--color-text-secondary)" }}
          >Hoje</button>
        </div>
        <button
          onClick={() => setModal({ modo: "novo", diaInicial: isoDate(hoje) })}
          style={{ padding: "8px 16px", borderRadius: 8, background: "#111", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          + Novo evento
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap" }}>
        {FILTROS.map((f) => (
          <button
            key={f.key}
            onClick={() => toggleFiltro(f.key)}
            style={{
              padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer",
              border: `1px solid ${filtros[f.key] ? f.cor : "var(--color-border-secondary)"}`,
              background: filtros[f.key] ? f.cor + "18" : "transparent",
              color: filtros[f.key] ? f.cor : "var(--color-text-secondary)",
              transition: "all 0.1s",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Grade */}
      {loading ? (
        <div style={{ padding: "60px 0", textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>
      ) : (
        <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflowX: "auto" }}>
          <div style={{ minWidth: 560 }}>
          {/* Cabeçalho dos dias da semana */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", background: "var(--color-background-secondary)", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
              <div key={d} style={{ padding: "8px 10px", fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textAlign: "center", letterSpacing: "0.04em" }}>{d}</div>
            ))}
          </div>

          {/* Células */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
            {celulas.map((dia, idx) => {
              const evsDia = dia ? eventosPorDia(dia) : [];
              const hoje_ = dia ? isHoje(dia) : false;
              const isLastRow = idx >= celulas.length - 7;
              const isLastCol = (idx + 1) % 7 === 0;

              return (
                <div
                  key={idx}
                  onClick={() => dia && setModal({ modo: "novo", diaInicial: `${ano}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}` })}
                  style={{
                    minHeight: 100,
                    borderRight: isLastCol ? "none" : "0.5px solid var(--color-border-tertiary)",
                    borderBottom: isLastRow ? "none" : "0.5px solid var(--color-border-tertiary)",
                    padding: "6px 8px",
                    background: dia ? "var(--color-background-primary)" : "var(--color-background-secondary)",
                    cursor: dia ? "pointer" : "default",
                    position: "relative",
                  }}
                  onMouseEnter={(e) => dia && (e.currentTarget.style.background = "var(--color-background-secondary)")}
                  onMouseLeave={(e) => dia && (e.currentTarget.style.background = "var(--color-background-primary)")}
                >
                  {dia && (
                    <>
                      <div style={{
                        width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 12, fontWeight: hoje_ ? 700 : 400,
                        background: hoje_ ? "#2563EB" : "transparent",
                        color: hoje_ ? "#fff" : "var(--color-text-primary)",
                        marginBottom: 4,
                      }}>
                        {dia}
                      </div>

                      {/* Chips de eventos */}
                      {evsDia.slice(0, 2).map((ev) => (
                        <div
                          key={ev.id}
                          title={ev.titulo}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (ev.navegarPara) { router.push(ev.navegarPara); }
                            else if (ev.dados) { setModal({ modo: "editar", evento: ev }); }
                          }}
                          style={{
                            fontSize: 11, fontWeight: 600, padding: "4px 8px", borderRadius: 5,
                            background: ev.bg, color: ev.cor,
                            borderLeft: `3px solid ${ev.cor}`,
                            marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            cursor: "pointer", lineHeight: 1.3,
                          }}
                        >
                          {ev.dados?.inicio && !ev.dados?.dia_todo
                            ? <><span style={{ opacity: 0.75, fontSize: 10, marginRight: 4 }}>{ev.dados.inicio.slice(11, 16)}</span>{ev.titulo}</>
                            : ev.titulo}
                        </div>
                      ))}

                      {evsDia.length > 2 && (
                        <div
                          onClick={(e) => { e.stopPropagation(); setTooltipId(tooltipId === `day-${idx}` ? null : `day-${idx}`); }}
                          style={{ fontSize: 10, color: "var(--color-text-secondary)", fontWeight: 600, cursor: "pointer", padding: "1px 4px" }}
                        >
                          +{evsDia.length - 2} mais
                        </div>
                      )}

                      {/* Tooltip com todos os eventos do dia */}
                      {tooltipId === `day-${idx}` && evsDia.length > 2 && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            position: "absolute", top: 0, left: "100%", zIndex: 50,
                            width: 220, background: "var(--color-background-primary)",
                            border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10,
                            boxShadow: "0 8px 30px rgba(0,0,0,0.12)", padding: 10,
                          }}
                        >
                          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", marginBottom: 8 }}>
                            {dia}/{mes + 1}/{ano}
                          </div>
                          {evsDia.map((ev) => (
                            <div
                              key={ev.id}
                              onClick={() => {
                                setTooltipId(null);
                                if (ev.navegarPara) router.push(ev.navegarPara);
                                else if (ev.dados) setModal({ modo: "editar", evento: ev });
                              }}
                              style={{ fontSize: 11, padding: "6px 8px", borderRadius: 5, background: ev.bg, color: ev.cor, marginBottom: 4, cursor: "pointer", borderLeft: `3px solid ${ev.cor}` }}
                            >
                              {ev.dados?.inicio && !ev.dados?.dia_todo && (
                                <div style={{ fontSize: 10, opacity: 0.75, marginBottom: 2 }}>{ev.dados.inicio.slice(11, 16)}{ev.dados.fim ? ` – ${ev.dados.fim.slice(11, 16)}` : ""}</div>
                              )}
                              <div style={{ fontWeight: 600 }}>{ev.titulo}</div>
                              {ev.dados?.local && (
                                <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>📍 {ev.dados.local}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
          </div>
        </div>
      )}

      {/* Legenda */}
      <div style={{ display: "flex", gap: 14, marginTop: 14, flexWrap: "wrap" }}>
        {(["evento_opp", "agendamento", "tarefa", "a_receber", "a_pagar", "aniversario", "feriado"] as TipoEvento[]).map((t) => {
          const cfg = TIPO_CONFIG[t];
          const labels: Record<string, string> = { evento_opp: "Evento", agendamento: "Agendamento", tarefa: "Tarefa", a_receber: "A receber", a_pagar: "A pagar", aniversario: "Aniversário", feriado: "Feriado" };
          return (
            <div key={t} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--color-text-secondary)" }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: cfg.bg, border: `1px solid ${cfg.cor}` }} />
              {labels[t]}
            </div>
          );
        })}
      </div>

      {/* Modal de criar/editar evento */}
      {modal.modo !== "fechado" && (
        <ModalEvento
          modo={modal.modo}
          diaInicial={modal.modo === "novo" ? modal.diaInicial : modal.evento.dados?.inicio.slice(0, 10) ?? ""}
          evento={modal.modo === "editar" ? modal.evento : undefined}
          fotografoId={fotografo?.id ?? ""}
          onFechar={() => setModal({ modo: "fechado" })}
          onSalvo={() => { setModal({ modo: "fechado" }); carregar(); }}
        />
      )}

      {/* Fechar tooltip ao clicar fora */}
      {tooltipId && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 40 }}
          onClick={() => setTooltipId(null)}
        />
      )}
    </div>
  );
}

// ─── Modal de criar/editar agendamento ─────────────────────────────────────────

interface ModalEventoProps {
  modo: "novo" | "editar";
  diaInicial: string;
  evento?: EventoCalendario;
  fotografoId: string;
  onFechar: () => void;
  onSalvo: () => void;
}

function ModalEvento({ modo, diaInicial, evento, fotografoId, onFechar, onSalvo }: ModalEventoProps) {
  const { fotografo } = useFotografo();
  const [titulo,      setTitulo]      = useState(evento?.dados?.titulo ?? "");
  const [tipo,        setTipo]        = useState(evento?.dados?.tipo ?? "");
  const [clienteId,   setClienteId]   = useState(evento?.dados?.cliente_id ?? "");
  const [oppId,       setOppId]       = useState(evento?.dados?.oportunidade_id ?? "");
  const [inicio,      setInicio]      = useState(evento?.dados?.inicio.slice(0, 16) ?? (diaInicial + "T09:00"));
  const [fim,         setFim]         = useState(evento?.dados?.fim?.slice(0, 16) ?? "");
  const [diaInteiro,  setDiaInteiro]  = useState(evento?.dados?.dia_todo ?? false);
  const [local,       setLocal]       = useState(evento?.dados?.local ?? "");
  const [descricao,   setDescricao]   = useState(evento?.dados?.descricao ?? "");
  const [saving,      setSaving]      = useState(false);
  const [deletando,   setDeletando]   = useState(false);
  const [erro,        setErro]        = useState("");

  const [categorias, setCategorias] = useState<CrmAgendamentoCategoria[]>([]);
  const [clientes,   setClientes]   = useState<Pick<Cliente, "id" | "nome">[]>([]);
  const [opps,       setOpps]       = useState<{ id: string; titulo: string }[]>([]);

  useEffect(() => {
    if (!fotografo) return;
    const sb = createClient();
    Promise.all([
      sb.from("crm_agendamento_categorias").select("*").or(`fotografo_id.is.null,fotografo_id.eq.${fotografo.id}`).eq("ativo", true).order("ordem"),
      sb.from("clientes").select("id, nome").eq("fotografo_id", fotografo.id).eq("crm_ativo", true).order("nome"),
      sb.from("crm_opportunities").select("id, titulo").eq("fotografo_id", fotografo.id).order("titulo"),
    ]).then(([{ data: cats }, { data: cls }, { data: opp }]) => {
      setCategorias((cats ?? []) as CrmAgendamentoCategoria[]);
      setClientes((cls ?? []) as Pick<Cliente, "id" | "nome">[]);
      setOpps((opp ?? []) as { id: string; titulo: string }[]);
    });
  }, [fotografo]);

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "8px 12px", borderRadius: 8,
    border: "0.5px solid var(--color-border-secondary)",
    background: "var(--color-background-secondary)",
    fontSize: 13, color: "var(--color-text-primary)", outline: "none", boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", letterSpacing: "0.04em", display: "block", marginBottom: 4,
  };

  const salvar = async () => {
    if (!titulo.trim()) { setErro("Título é obrigatório."); return; }
    setSaving(true); setErro("");
    const sb = createClient();
    const payload = {
      fotografo_id:    fotografoId,
      titulo:          titulo.trim(),
      tipo:            tipo || "outro",
      cliente_id:      clienteId || null,
      oportunidade_id: oppId || null,
      inicio:          diaInteiro ? diaInicial + "T00:00:00" : (inicio + ":00"),
      fim:             fim ? (fim + ":00") : null,
      dia_todo:        diaInteiro,
      local:           local.trim() || null,
      descricao:       descricao.trim() || null,
    };
    if (modo === "novo") {
      await sb.from("crm_schedules").insert(payload);
    } else {
      await sb.from("crm_schedules").update(payload).eq("id", evento!.dados!.id);
    }
    setSaving(false);
    onSalvo();
  };

  const excluir = async () => {
    if (!evento?.dados) return;
    setDeletando(true);
    await createClient().from("crm_schedules").delete().eq("id", evento.dados.id);
    setDeletando(false);
    onSalvo();
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={onFechar}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 14, padding: "28px 30px", width: 480, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 16px 60px rgba(0,0,0,0.2)" }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--color-text-primary)" }}>
            {modo === "novo" ? "Novo evento" : "Editar evento"}
          </h2>
          <button onClick={onFechar} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "var(--color-text-secondary)", lineHeight: 1 }}>×</button>
        </div>

        {erro && (
          <div style={{ background: "rgba(239,68,68,0.08)", border: "0.5px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#EF4444" }}>{erro}</div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={labelStyle}>TÍTULO *</label>
            <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Nome do evento ou compromisso" style={inputStyle} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>TIPO</label>
              <select value={tipo} onChange={(e) => setTipo(e.target.value)} style={inputStyle}>
                <option value="">Selecione…</option>
                <option value="tarefa">Tarefa</option>
                {categorias.map((c) => <option key={c.id} value={c.nome}>{c.nome}{c.sistema ? " (sistema)" : ""}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>CLIENTE</label>
              <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} style={inputStyle}>
                <option value="">Nenhum</option>
                {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>OPORTUNIDADE</label>
            <select value={oppId} onChange={(e) => setOppId(e.target.value)} style={inputStyle}>
              <option value="">Nenhuma</option>
              {opps.map((o) => <option key={o.id} value={o.id}>{o.titulo}</option>)}
            </select>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", userSelect: "none" }}>
            <div
              onClick={() => setDiaInteiro(!diaInteiro)}
              style={{ width: 38, height: 22, borderRadius: 11, cursor: "pointer", position: "relative", transition: "background 0.2s", background: diaInteiro ? "#2563EB" : "var(--color-border-secondary)", flexShrink: 0 }}
            >
              <div style={{ position: "absolute", top: 3, left: diaInteiro ? 18 : 3, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
            </div>
            <span style={{ fontSize: 13, color: "var(--color-text-primary)" }}>Dia inteiro</span>
          </label>

          {!diaInteiro && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>INÍCIO</label>
                <input type="datetime-local" value={inicio} onChange={(e) => setInicio(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>FIM (opcional)</label>
                <input type="datetime-local" value={fim} onChange={(e) => setFim(e.target.value)} style={inputStyle} />
              </div>
            </div>
          )}

          {diaInteiro && (
            <div>
              <label style={labelStyle}>DATA</label>
              <input type="date" value={inicio.slice(0, 10)} onChange={(e) => setInicio(e.target.value + "T00:00")} style={inputStyle} />
            </div>
          )}

          <div>
            <label style={labelStyle}>LOCAL</label>
            <input value={local} onChange={(e) => setLocal(e.target.value)} placeholder="Endereço ou link de reunião" style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>DESCRIÇÃO</label>
            <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 22 }}>
          <button onClick={salvar} disabled={saving} style={{ flex: 1, padding: "10px", borderRadius: 8, background: saving ? "#93C5FD" : "#111", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
            {saving ? "Salvando…" : modo === "novo" ? "Criar evento" : "Salvar alterações"}
          </button>
          {modo === "editar" && (
            <button onClick={excluir} disabled={deletando} style={{ padding: "10px 16px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "0.5px solid rgba(239,68,68,0.3)", color: "#EF4444", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              {deletando ? "…" : "Excluir"}
            </button>
          )}
          <button onClick={onFechar} style={{ padding: "10px 16px", borderRadius: 8, background: "none", border: "0.5px solid var(--color-border-secondary)", fontSize: 13, color: "var(--color-text-secondary)", cursor: "pointer" }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
