"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { EventoAgenda } from "@/app/api/agenda/route";

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const DIAS_SEMANA = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

function formatarHora(iso: string, diaTodo: boolean): string {
  if (diaTodo) return "Dia todo";
  const d = new Date(iso);
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

function agruparPorMes(eventos: EventoAgenda[]): Record<string, EventoAgenda[]> {
  const grupos: Record<string, EventoAgenda[]> = {};
  for (const ev of eventos) {
    const d = new Date(ev.inicio);
    const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!grupos[chave]) grupos[chave] = [];
    grupos[chave].push(ev);
  }
  return grupos;
}

function tituloMes(chave: string): string {
  const [ano, mes] = chave.split("-");
  return `${MESES[parseInt(mes) - 1]} ${ano}`;
}

export default function AgendaPage() {
  const [eventos,     setEventos]     = useState<EventoAgenda[]>([]);
  const [configurado, setConfigurado] = useState(true);
  const [erro,        setErro]        = useState<string | null>(null);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    fetch("/api/agenda")
      .then((r) => r.json())
      .then((json) => {
        setEventos(json.eventos ?? []);
        setConfigurado(json.configurado ?? false);
        setErro(json.erro ?? null);
      })
      .catch(() => setErro("Erro ao carregar agenda."))
      .finally(() => setLoading(false));
  }, []);

  const agora = new Date();
  agora.setHours(0, 0, 0, 0);
  const hoje = agora.toISOString().slice(0, 10);

  const grupos = agruparPorMes(eventos);
  const chaves = Object.keys(grupos).sort();

  return (
    <div style={{ padding: "26px 30px", maxWidth: 700 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 19, fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 3px", letterSpacing: "-0.02em" }}>
            Agenda
          </h1>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
            Eventos importados do seu link iCal
          </p>
        </div>
        <Link
          href="/config"
          style={{
            fontSize: 12, padding: "7px 14px", borderRadius: 7,
            border: "0.5px solid var(--color-border-secondary)",
            color: "var(--color-text-secondary)", textDecoration: "none",
            background: "var(--color-background-secondary)",
          }}
        >
          ⚙️ Configurar link
        </Link>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando agenda…</div>
      )}

      {/* Não configurado */}
      {!loading && !configurado && (
        <div style={{
          background: "var(--color-background-primary)",
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: 12, padding: "36px 32px", textAlign: "center",
        }}>
          <div style={{ fontSize: 32, marginBottom: 14 }}>📅</div>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text-primary)", margin: "0 0 8px" }}>
            Conecte sua agenda
          </h2>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 20px", lineHeight: 1.6 }}>
            Cole o link iCal do AlboomCRM, Google Calendar ou qualquer sistema compatível<br />
            nas configurações para ver seus eventos aqui.
          </p>
          <Link
            href="/config"
            style={{
              display: "inline-block", padding: "10px 22px", borderRadius: 8,
              background: "#2563EB", color: "#fff", textDecoration: "none",
              fontSize: 13, fontWeight: 700,
            }}
          >
            Ir para Configurações →
          </Link>
        </div>
      )}

      {/* Erro de carregamento */}
      {!loading && configurado && erro && (
        <div style={{
          background: "rgba(239,68,68,0.06)", border: "0.5px solid rgba(239,68,68,0.3)",
          borderRadius: 10, padding: "14px 18px", marginBottom: 16,
          fontSize: 13, color: "#DC2626",
        }}>
          ⚠️ {erro}
        </div>
      )}

      {/* Sem eventos */}
      {!loading && configurado && !erro && eventos.length === 0 && (
        <div style={{
          background: "var(--color-background-primary)",
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: 12, padding: "36px 32px", textAlign: "center",
          fontSize: 13, color: "var(--color-text-secondary)",
        }}>
          Nenhum evento nos próximos meses.
        </div>
      )}

      {/* Lista por mês */}
      {!loading && configurado && chaves.map((chave) => (
        <div key={chave} style={{ marginBottom: 28 }}>
          {/* Cabeçalho do mês */}
          <div style={{
            display: "flex", alignItems: "center", gap: 10, marginBottom: 8,
          }}>
            <span style={{
              fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)",
              textTransform: "uppercase", letterSpacing: "0.07em",
            }}>
              {tituloMes(chave)}
            </span>
            <div style={{ flex: 1, height: "0.5px", background: "var(--color-border-tertiary)" }} />
          </div>

          {/* Eventos do mês */}
          <div style={{
            background: "var(--color-background-primary)",
            border: "0.5px solid var(--color-border-tertiary)",
            borderRadius: 10, overflow: "hidden",
          }}>
            {grupos[chave].map((ev, idx) => {
              const d       = new Date(ev.inicio);
              const diaNum  = d.getDate();
              const diaSem  = DIAS_SEMANA[d.getDay()];
              const hora    = formatarHora(ev.inicio, ev.diaTodo);
              const isHoje  = ev.inicio.slice(0, 10) === hoje;
              const passado = new Date(ev.inicio).getTime() < agora.getTime();

              return (
                <div
                  key={ev.uid}
                  style={{
                    display: "flex", alignItems: "flex-start", gap: 0,
                    borderBottom: idx < grupos[chave].length - 1
                      ? "0.5px solid var(--color-border-tertiary)"
                      : "none",
                    opacity: passado ? 0.45 : 1,
                    borderLeft: isHoje ? "3px solid #2563EB" : "3px solid transparent",
                  }}
                >
                  {/* Data */}
                  <div style={{
                    flexShrink: 0, width: 60, padding: "14px 0 14px 14px",
                    textAlign: "center",
                  }}>
                    <div style={{
                      fontSize: 20, fontWeight: 800,
                      color: isHoje ? "#2563EB" : "var(--color-text-primary)",
                      lineHeight: 1,
                    }}>
                      {diaNum}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginTop: 2, fontWeight: 600 }}>
                      {diaSem}
                    </div>
                  </div>

                  {/* Divisor vertical */}
                  <div style={{ width: "0.5px", background: "var(--color-border-tertiary)", alignSelf: "stretch", margin: "8px 0" }} />

                  {/* Conteúdo */}
                  <div style={{ flex: 1, padding: "13px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{
                        fontSize: 11, fontWeight: 600,
                        color: "var(--color-text-secondary)",
                        background: "var(--color-background-secondary)",
                        padding: "2px 8px", borderRadius: 20, flexShrink: 0,
                      }}>
                        {hora}
                      </span>
                      <span style={{
                        fontSize: 14, fontWeight: 600,
                        color: "var(--color-text-primary)",
                      }}>
                        {ev.titulo}
                      </span>
                    </div>
                    {ev.local && (
                      <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 4 }}>
                        📍 {ev.local}
                      </div>
                    )}
                    {ev.descricao && (
                      <div style={{
                        fontSize: 12, color: "var(--color-text-secondary)",
                        marginTop: 4, lineHeight: 1.5,
                        display: "-webkit-box", WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical", overflow: "hidden",
                      }}>
                        {ev.descricao}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
