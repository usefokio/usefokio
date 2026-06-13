"use client";

import type { Evento } from "./types";

const EVENTO_CONFIG: Record<string, { icon: string; cor: string; label: string }> = {
  acesso:            { icon: "👁",  cor: "#6B7280", label: "Cliente acessou a galeria"     },
  foto_selecionada:  { icon: "✅",  cor: "#059669", label: "Foto selecionada"               },
  foto_desmarcada:   { icon: "↩",  cor: "#9CA3AF", label: "Foto desmarcada"               },
  comentario:        { icon: "💬",  cor: "#2563EB", label: "Comentário adicionado"         },
  selecao_enviada:   { icon: "🏁",  cor: "#B45309", label: "Seleção finalizada"            },
  galeria_ativada:   { icon: "▶",   cor: "#059669", label: "Galeria ativada"               },
  galeria_reativada: { icon: "↩",  cor: "#B45309", label: "Galeria reaberta para reedição" },
  galeria_encerrada: { icon: "⏹",  cor: "#EF4444", label: "Galeria encerrada"             },
  status_alterado:   { icon: "⚙",  cor: "#6B7280", label: "Status alterado"               },
};

type Entrada = { tipo: string; count: number; id: string; created_at: string; descricao: string | null };

function agruparItens(itens: Evento[]): Entrada[] {
  const result: Entrada[] = [];
  for (const ev of itens) {
    const last = result[result.length - 1];
    if (last && last.tipo === ev.tipo) {
      last.count++;
      last.created_at = ev.created_at;
    } else {
      result.push({ tipo: ev.tipo, count: 1, id: ev.id, created_at: ev.created_at, descricao: ev.descricao ?? null });
    }
  }
  return result;
}

function labelEntrada(tipo: string, count: number, descricao: string | null, cfgLabel: string): string {
  if (count === 1) return descricao ?? cfgLabel;
  switch (tipo) {
    case "foto_selecionada": return `Selecionou ${count} fotos`;
    case "foto_desmarcada":  return `Desmarcou ${count} fotos`;
    case "acesso":           return `Acessou a galeria ${count} vezes`;
    case "comentario":       return `Adicionou ${count} comentários`;
    default:                 return `${cfgLabel} (${count}×)`;
  }
}

export function AbaAndamento({ eventos }: { eventos: Evento[] }) {
  if (eventos.length === 0) {
    return (
      <div style={{ border: "0.5px dashed var(--color-border-secondary)", borderRadius: 10, padding: "52px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 6 }}>Nenhuma atividade registrada</div>
        <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>O histórico aparecerá quando o cliente acessar a galeria.</div>
      </div>
    );
  }

  type Grupo = { dia: string; itens: Evento[] };
  const grupos: Grupo[] = [];
  for (const ev of [...eventos].reverse()) {
    const dia = new Date(ev.created_at).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.dia === dia) ultimo.itens.push(ev);
    else grupos.push({ dia, itens: [ev] });
  }

  return (
    <div style={{ maxWidth: 620 }}>
      {grupos.map((grupo, gi) => {
        const entradas = agruparItens(grupo.itens);
        return (
          <div key={gi} style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
                {grupo.dia}
              </div>
              <div style={{ flex: 1, height: "0.5px", background: "var(--color-border-tertiary)" }} />
            </div>

            <div style={{ position: "relative", paddingLeft: 28 }}>
              <div style={{ position: "absolute", left: 9, top: 0, bottom: 0, width: 1, background: "var(--color-border-tertiary)" }} />

              {entradas.map((entrada, i) => {
                const cfg  = EVENTO_CONFIG[entrada.tipo] ?? { icon: "•", cor: "#9CA3AF", label: entrada.tipo };
                const hora = new Date(entrada.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
                const isLast = gi === grupos.length - 1 && i === entradas.length - 1;
                const label  = labelEntrada(entrada.tipo, entrada.count, entrada.descricao, cfg.label);

                return (
                  <div key={entrada.id} style={{ display: "flex", gap: 12, marginBottom: isLast ? 0 : 12, alignItems: "flex-start" }}>
                    <div style={{
                      position: "absolute", left: 0,
                      width: 20, height: 20, borderRadius: "50%",
                      background: "var(--color-background-primary)",
                      border: `1.5px solid ${cfg.cor}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, flexShrink: 0, marginTop: 1, zIndex: 1,
                    }}>
                      {cfg.icon}
                    </div>
                    <div style={{ paddingBottom: 2 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>
                          {label}
                        </span>
                        {entrada.count > 1 && (
                          <span style={{ fontSize: 11, fontWeight: 600, padding: "1px 7px", borderRadius: 10, background: `${cfg.cor}18`, color: cfg.cor }}>
                            {entrada.count}
                          </span>
                        )}
                        <span style={{ fontSize: 11, color: "var(--color-text-secondary)", flexShrink: 0 }}>
                          {hora}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
