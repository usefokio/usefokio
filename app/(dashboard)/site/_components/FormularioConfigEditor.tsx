"use client";

// Editor da configuração do formulário de contato/lead (campos padrão + campos extras).
// Reusado pelo editor de páginas (página Contato) e pelo bloco "formulario" da landing.
import type { ConfigFormulario, CampoPadrao, CampoExtra } from "@/lib/site/formulario";
import { ORDEM_PADRAO, CAMPO_LABEL } from "@/lib/site/formulario";

function Toggle({ on, onChange, disabled }: { on: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onChange} disabled={disabled}
      style={{ width: 38, height: 22, borderRadius: 11, border: "none", cursor: disabled ? "not-allowed" : "pointer", position: "relative", background: on ? "#2563EB" : "var(--color-border-secondary)", opacity: disabled ? 0.4 : 1, flexShrink: 0 }}>
      <span style={{ position: "absolute", top: 3, left: on ? 19 : 3, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.15s", display: "block" }} />
    </button>
  );
}

const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" };
const inp: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--color-border-secondary)", fontSize: 13, background: "var(--color-background-primary)", color: "var(--color-text-primary)" };

export function FormularioConfigEditor({ value, onChange }: { value: ConfigFormulario; onChange: (c: ConfigFormulario) => void }) {
  const setCampo = (k: CampoPadrao, patch: Partial<{ ativo: boolean; obrigatorio: boolean }>) =>
    onChange({ ...value, campos: { ...value.campos, [k]: { ...value.campos[k], ...patch } } });
  const setExtra = (id: string, patch: Partial<CampoExtra>) =>
    onChange({ ...value, extras: value.extras.map((e) => (e.id === id ? { ...e, ...patch } : e)) });
  const addExtra = () =>
    onChange({ ...value, extras: [...value.extras, { id: crypto.randomUUID(), rotulo: "", tipo: "texto", obrigatorio: false }] });
  const removeExtra = (id: string) =>
    onChange({ ...value, extras: value.extras.filter((e) => e.id !== id) });

  const ordem = value.ordem && value.ordem.length ? value.ordem : ORDEM_PADRAO;

  return (
    <div style={{ border: "1px solid var(--color-border-tertiary)", borderRadius: 12, padding: 18, background: "var(--color-background-secondary)" }}>
      <div style={{ ...lbl, marginBottom: 10 }}>Campos padrão</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 70px 90px", gap: 8, fontSize: 10, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em", padding: "0 4px 4px" }}>
        <span>Campo</span><span style={{ textAlign: "center" }}>Mostrar</span><span style={{ textAlign: "center" }}>Obrigatório</span>
      </div>
      {ordem.map((k) => {
        const c = value.campos[k];
        return (
          <div key={k} style={{ display: "grid", gridTemplateColumns: "1fr 70px 90px", gap: 8, alignItems: "center", padding: "8px 4px", borderTop: "0.5px solid var(--color-border-tertiary)" }}>
            <div style={{ fontSize: 13, color: "var(--color-text-primary)" }}>
              {CAMPO_LABEL[k]}
              {k === "tipo_evento" && <div style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>opções = categorias dos seus trabalhos</div>}
            </div>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <Toggle on={c.ativo} onChange={() => setCampo(k, { ativo: !c.ativo, obrigatorio: c.ativo ? false : c.obrigatorio })} />
            </div>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <Toggle on={c.obrigatorio} disabled={!c.ativo} onChange={() => setCampo(k, { obrigatorio: !c.obrigatorio })} />
            </div>
          </div>
        );
      })}

      <div style={{ ...lbl, margin: "18px 0 8px" }}>Campos extras</div>
      {value.extras.length === 0 && (
        <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 8, lineHeight: 1.5 }}>
          Nenhum campo extra. Adicione campos personalizados (ex.: “Orçamento previsto”, “Como nos conheceu”).
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {value.extras.map((e) => (
          <div key={e.id} style={{ border: "1px solid var(--color-border-tertiary)", borderRadius: 10, padding: 12, background: "var(--color-background-primary)" }}>
            <div style={{ display: "flex", gap: 8, marginBottom: e.tipo === "select" ? 8 : 0 }}>
              <input value={e.rotulo} onChange={(ev) => setExtra(e.id, { rotulo: ev.target.value })} placeholder="Nome do campo (ex.: Orçamento previsto)" style={{ ...inp, flex: 1 }} />
              <select value={e.tipo} onChange={(ev) => setExtra(e.id, { tipo: ev.target.value as CampoExtra["tipo"] })} style={{ ...inp, width: 140 }}>
                <option value="texto">Texto curto</option>
                <option value="textarea">Texto longo</option>
                <option value="select">Lista de opções</option>
              </select>
              <button onClick={() => removeExtra(e.id)} title="Remover campo" style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 14, color: "#DC2626" }}>🗑</button>
            </div>
            {e.tipo === "select" && (
              <textarea value={(e.opcoes ?? []).join("\n")} onChange={(ev) => setExtra(e.id, { opcoes: ev.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })}
                placeholder="Uma opção por linha" rows={3} style={{ ...inp, resize: "vertical", marginBottom: 8, fontFamily: "inherit" }} />
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--color-text-secondary)" }}>
              <Toggle on={e.obrigatorio} onChange={() => setExtra(e.id, { obrigatorio: !e.obrigatorio })} /> Obrigatório
            </div>
          </div>
        ))}
      </div>
      <button onClick={addExtra} style={{ marginTop: 10, padding: "8px 14px", borderRadius: 8, border: "1px dashed var(--color-border-secondary)", background: "transparent", fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)", cursor: "pointer" }}>
        + Adicionar campo
      </button>

      <div style={{ marginTop: 16 }}>
        <label style={{ ...lbl, display: "block", marginBottom: 5 }}>Texto do botão</label>
        <input value={value.textoBotao ?? ""} onChange={(ev) => onChange({ ...value, textoBotao: ev.target.value })} placeholder="Enviar mensagem" style={{ ...inp, maxWidth: 260 }} />
      </div>
    </div>
  );
}
