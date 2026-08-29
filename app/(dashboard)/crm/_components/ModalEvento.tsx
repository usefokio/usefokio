"use client";

// Modal de criar/editar agendamento (crm_schedules) — compartilhado entre a Agenda (clicar numa
// data) e qualquer outra tela que precise gerar um agendamento avulso vinculado a algo (ex.:
// botão "Marcar na agenda" na página do pedido, via pedidoId/clienteIdInicial).
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import { ClienteSelect } from "@/components/ui/ClienteSelect";
import { ComboSelect } from "@/components/ui/ComboSelect";
import type { CrmSchedule, CrmAgendamentoCategoria } from "@/lib/supabase/types";

interface ModalEventoProps {
  modo: "novo" | "editar";
  diaInicial: string;
  evento?: CrmSchedule | null;
  fotografoId: string;
  pedidoId?: string;          // vincula o agendamento a um pedido (crm_schedules.pedido_id)
  clienteIdInicial?: string;  // pré-preenche o cliente ao abrir em modo "novo"
  onFechar: () => void;
  onSalvo: () => void;
}

export function ModalEvento({ modo, diaInicial, evento, fotografoId, pedidoId, clienteIdInicial, onFechar, onSalvo }: ModalEventoProps) {
  const { fotografo } = useFotografo();
  const [titulo,      setTitulo]      = useState(evento?.titulo ?? "");
  const [tipo,        setTipo]        = useState(evento?.tipo ?? "");
  const [clienteId,   setClienteId]   = useState(evento?.cliente_id ?? clienteIdInicial ?? "");
  const [oppId,       setOppId]       = useState(evento?.oportunidade_id ?? "");
  const [inicio,      setInicio]      = useState(evento?.inicio.slice(0, 16) ?? (diaInicial + "T09:00"));
  const [fim,         setFim]         = useState(evento?.fim?.slice(0, 16) ?? "");
  const [diaInteiro,  setDiaInteiro]  = useState(evento?.dia_todo ?? false);
  const [local,       setLocal]       = useState(evento?.local ?? "");
  const [descricao,   setDescricao]   = useState(evento?.descricao ?? "");
  const [saving,      setSaving]      = useState(false);
  const [deletando,   setDeletando]   = useState(false);
  const [erro,        setErro]        = useState("");

  const [categorias, setCategorias] = useState<CrmAgendamentoCategoria[]>([]);
  const [opps,       setOpps]       = useState<{ id: string; titulo: string }[]>([]);

  useEffect(() => {
    if (!fotografo) return;
    const sb = createClient();
    Promise.all([
      sb.from("crm_agendamento_categorias").select("*").or(`fotografo_id.is.null,fotografo_id.eq.${fotografo.id}`).eq("ativo", true).order("ordem"),
      sb.from("crm_opportunities").select("id, titulo").eq("fotografo_id", fotografo.id).order("titulo"),
    ]).then(([{ data: cats }, { data: opp }]) => {
      setCategorias((cats ?? []) as CrmAgendamentoCategoria[]);
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
      pedido_id:       pedidoId ?? evento?.pedido_id ?? null,
      inicio:          diaInteiro ? diaInicial + "T00:00:00" : (inicio + ":00"),
      fim:             fim ? (fim + ":00") : null,
      dia_todo:        diaInteiro,
      local:           local.trim() || null,
      descricao:       descricao.trim() || null,
    };
    if (modo === "novo") {
      await sb.from("crm_schedules").insert(payload);
    } else {
      await sb.from("crm_schedules").update(payload).eq("id", evento!.id);
    }
    setSaving(false);
    onSalvo();
  };

  const excluir = async () => {
    if (!evento) return;
    setDeletando(true);
    await createClient().from("crm_schedules").delete().eq("id", evento.id);
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
              <ComboSelect
                options={[
                  { id: "tarefa", label: "Tarefa" },
                  ...categorias.map(c => ({ id: c.nome, label: c.nome + (c.sistema ? " (sistema)" : "") })),
                ]}
                value={tipo}
                onChange={setTipo}
                placeholder="Selecione…"
              />
            </div>
            <div>
              <label style={labelStyle}>CLIENTE</label>
              <ClienteSelect
                value={clienteId}
                onChange={id => setClienteId(id)}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>OPORTUNIDADE</label>
            <ComboSelect
              options={[{ id: "", label: "Nenhuma" }, ...opps.map(o => ({ id: o.id, label: o.titulo }))]}
              value={oppId}
              onChange={setOppId}
              placeholder="Nenhuma"
            />
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
