"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type WmConfig = {
  asaas_ativo: boolean;
  asaas_ambiente: string;
  doacao_manual_pix: string | null;
  doacao_manual_link: string | null;
  doacao_manual_msg: string | null;
  pix_qrcode_url: string | null;
};

type DoacaoItem = {
  id: string;
  valor: number;
  status: string;
  pagador_nome: string | null;
  pagador_email: string | null;
  created_at: string;
  paid_at: string | null;
};

type SistemaConfig = { configurado: boolean; ambiente: string; webhookRegistrado: boolean };

export default function SistemaPage() {
  // ── Asaas Sistema (assinaturas) ──────────────────────────────────────────────
  const [sistemaConfig, setSistemaConfig] = useState<SistemaConfig | null>(null);
  const [apiKeySistema, setApiKeySistema] = useState("");
  const [ambienteSistema, setAmbienteSistema] = useState("sandbox");
  const [salvandoSistema, setSalvandoSistema] = useState(false);
  const [msgSistema, setMsgSistema] = useState("");

  // ── Asaas Webmaster (doações) + Pix ─────────────────────────────────────────
  const [wmConfig,     setWmConfig]     = useState<WmConfig | null>(null);
  const [doacoes,      setDoacoes]      = useState<DoacaoItem[]>([]);
  const [apiKeyWm,     setApiKeyWm]     = useState("");
  const [ambienteWm,   setAmbienteWm]   = useState("sandbox");
  const [manualPix,    setManualPix]    = useState("");
  const [manualLink,   setManualLink]   = useState("");
  const [manualMsg,    setManualMsg]    = useState("");
  const [salvandoWm,   setSalvandoWm]   = useState(false);
  const [msgWm,        setMsgWm]        = useState("");
  const [uploadandoQr, setUploadandoQr] = useState(false);

  // ── Manutenção: re-registrar webhooks de pagamento ──────────────────────────
  const [reregistrando, setReregistrando] = useState(false);
  const [msgReg,        setMsgReg]         = useState("");

  useEffect(() => {
    carregarSistema();
    carregarWm();
  }, []);

  async function carregarSistema() {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/webmaster/sistema-config", {
      headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
    });
    if (res.ok) setSistemaConfig(await res.json());
  }

  async function reregistrarWebhooks() {
    setReregistrando(true);
    setMsgReg("");
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/webmaster/asaas/reregistrar-webhooks", {
      method: "POST",
      headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
    });
    const json = await res.json();
    if (!res.ok) {
      setMsgReg("❌ " + (json.error ?? "Erro ao re-registrar."));
    } else {
      const falhas: { id: string; erro: string }[] = json.falhas ?? [];
      const resumo = `${json.sucesso}/${json.total} fotógrafos · sistema ${json.sistema ? "OK" : "—"} · token ${json.tokenLen} chars · url ${json.appUrl}`;
      const detalhe = falhas.length ? " · " + falhas.map((f) => `[${f.id === "sistema" ? "sistema" : f.id.slice(0, 8)}] ${f.erro}`).join(" | ") : "";
      setMsgReg(`${falhas.length ? "⚠️" : "✅"} ${resumo}${detalhe}`);
    }
    setReregistrando(false);
  }

  async function salvarSistema() {
    if (!apiKeySistema.trim()) return;
    setSalvandoSistema(true);
    setMsgSistema("");
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/webmaster/sistema-config", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
      body: JSON.stringify({ apiKey: apiKeySistema.trim(), ambiente: ambienteSistema }),
    });
    const json = await res.json();
    if (!res.ok) {
      setMsgSistema("❌ " + (json.error ?? "Erro ao salvar."));
      setSalvandoSistema(false);
      return;
    }
    setMsgSistema(`✅ Conectado como ${json.conta?.nome ?? "Conta Asaas"} · ${ambienteSistema}${json.webhookRegistrado ? " · Webhook ✓" : " · ⚠ Webhook não registrado"}`);
    setApiKeySistema("");
    await carregarSistema();
    setSalvandoSistema(false);
  }

  async function carregarWm() {
    const res = await fetch("/api/webmaster/asaas");
    if (!res.ok) return;
    const json = await res.json();
    setWmConfig(json.config);
    setDoacoes(json.doacoes ?? []);
    setManualPix(json.config?.doacao_manual_pix ?? "");
    setManualLink(json.config?.doacao_manual_link ?? "");
    setManualMsg(json.config?.doacao_manual_msg ?? "");
  }

  async function salvarWm(comKey: boolean) {
    setSalvandoWm(true);
    setMsgWm("");
    const body: Record<string, unknown> = { manualPix, manualLink, manualMsg };
    if (comKey && apiKeyWm.trim()) { body.apiKey = apiKeyWm.trim(); body.ambiente = ambienteWm; }
    const res = await fetch("/api/webmaster/asaas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) { setMsgWm("❌ " + (json.erro ?? "Erro ao salvar.")); setSalvandoWm(false); return; }
    setMsgWm(json.conta ? `✅ Conectado como ${json.conta.nome}` : "✅ Salvo!");
    setApiKeyWm("");
    await carregarWm();
    setSalvandoWm(false);
  }

  async function desconectarWm() {
    if (!confirm("Desconectar a conta Asaas do desenvolvedor?")) return;
    await fetch("/api/webmaster/asaas", { method: "DELETE" });
    await carregarWm();
  }

  async function uploadQrCode(file: File) {
    setUploadandoQr(true);
    setMsgWm("");
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/webmaster/pix-qrcode", { method: "POST", body: form });
    const json = await res.json();
    if (!res.ok) { setMsgWm("❌ " + (json.erro ?? "Erro no upload.")); setUploadandoQr(false); return; }
    setMsgWm("✅ QR code salvo!");
    await carregarWm();
    setUploadandoQr(false);
  }

  async function removerQrCode() {
    if (!confirm("Remover o QR code?")) return;
    await fetch("/api/webmaster/pix-qrcode", { method: "DELETE" });
    await carregarWm();
  }

  const totalRecebido = doacoes.filter((d) => d.status === "pago").reduce((s, d) => s + Number(d.valor), 0);

  const cardStyle: React.CSSProperties = {
    background: "var(--color-background-primary)",
    border: "0.5px solid var(--color-border-tertiary)",
    borderRadius: 12,
    padding: "20px 24px",
  };

  const inputStyle: React.CSSProperties = {
    padding: "9px 12px",
    borderRadius: 8,
    border: "0.5px solid var(--color-border-secondary)",
    fontSize: 12,
    background: "var(--color-background-secondary)",
    color: "var(--color-text-primary)",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: "var(--color-text-primary)", letterSpacing: "-0.02em" }}>
        Sistema
      </div>

      {/* ── Asaas do Sistema (assinaturas) ─────────────────────────────────────── */}
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)" }}>⚙ Asaas do Sistema (assinaturas)</div>
          {sistemaConfig?.configurado && (
            <>
              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: "rgba(16,185,129,0.10)", color: "#059669" }}>
                CONECTADO · {sistemaConfig.ambiente?.toUpperCase()}
              </span>
              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10,
                background: sistemaConfig.webhookRegistrado ? "rgba(16,185,129,0.10)" : "rgba(245,158,11,0.12)",
                color: sistemaConfig.webhookRegistrado ? "#059669" : "#B45309",
              }}>
                {sistemaConfig.webhookRegistrado ? "✓ Webhook" : "⚠ Webhook"}
              </span>
            </>
          )}
        </div>
        <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "0 0 16px", lineHeight: 1.6 }}>
          Chave Asaas da conta UseFokio para gerar cobranças de assinatura para os fotógrafos. Separada do Asaas dos fotógrafos.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 440 }}>
          <input
            type="password"
            value={apiKeySistema}
            onChange={(e) => setApiKeySistema(e.target.value)}
            placeholder={sistemaConfig?.configurado ? "••••••••• (chave já salva — cole nova para alterar)" : "API Key Asaas ($aact_...)"}
            style={{ ...inputStyle, fontFamily: "monospace" }}
          />
          <select
            value={ambienteSistema}
            onChange={(e) => setAmbienteSistema(e.target.value)}
            style={{ ...inputStyle, width: 200 }}
          >
            <option value="sandbox">Sandbox (testes)</option>
            <option value="producao">Produção</option>
          </select>
          <button
            onClick={salvarSistema}
            disabled={salvandoSistema || !apiKeySistema.trim()}
            style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "#2563EB", color: "#fff", fontSize: 12, fontWeight: 700, cursor: apiKeySistema.trim() && !salvandoSistema ? "pointer" : "not-allowed", width: "fit-content", opacity: apiKeySistema.trim() && !salvandoSistema ? 1 : 0.6 }}
          >
            {salvandoSistema ? "Validando…" : "Salvar e conectar"}
          </button>
          {msgSistema && <div style={{ fontSize: 12, color: msgSistema.startsWith("❌") ? "#EF4444" : "#059669" }}>{msgSistema}</div>}
        </div>
      </div>

      {/* ── Pix ───────────────────────────────────────────────────────────────── */}
      <div style={cardStyle}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 16 }}>🟢 Recebimento via Pix</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 16, alignItems: "flex-start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <input value={manualPix} onChange={(e) => setManualPix(e.target.value)} placeholder="Chave Pix (e-mail, CPF, telefone ou chave aleatória)" style={inputStyle} />
            <input value={manualLink} onChange={(e) => setManualLink(e.target.value)} placeholder="Link de pagamento (opcional)" style={inputStyle} />
            <textarea value={manualMsg} onChange={(e) => setManualMsg(e.target.value)} placeholder="Mensagem exibida aos fotógrafos (opcional)" rows={2} style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} />
            <button onClick={() => salvarWm(false)} disabled={salvandoWm} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "var(--color-text-primary)", color: "var(--color-background-primary)", fontSize: 12, fontWeight: 700, cursor: "pointer", width: "fit-content" }}>
              {salvandoWm ? "Salvando…" : "Salvar"}
            </button>
          </div>
          {/* QR Code */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>QR Code</div>
            {wmConfig?.pix_qrcode_url ? (
              <>
                <img src={wmConfig.pix_qrcode_url} alt="QR Code Pix" style={{ width: 100, height: 100, objectFit: "contain", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "#fff", padding: 5 }} />
                <label style={{ fontSize: 11, fontWeight: 600, cursor: uploadandoQr ? "not-allowed" : "pointer", color: "#2563EB", opacity: uploadandoQr ? 0.5 : 1 }}>
                  {uploadandoQr ? "Enviando…" : "Trocar"}
                  <input type="file" accept="image/*" style={{ display: "none" }} disabled={uploadandoQr} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadQrCode(f); e.target.value = ""; }} />
                </label>
                <button onClick={removerQrCode} style={{ fontSize: 11, fontWeight: 600, color: "#EF4444", background: "none", border: "none", cursor: "pointer", padding: 0 }}>Remover</button>
              </>
            ) : (
              <label style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, width: 100, height: 100, borderRadius: 8, border: "0.5px dashed var(--color-border-secondary)", background: "var(--color-background-secondary)", cursor: uploadandoQr ? "not-allowed" : "pointer", justifyContent: "center", opacity: uploadandoQr ? 0.5 : 1 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--color-text-secondary)" }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                <span style={{ fontSize: 10, color: "var(--color-text-secondary)", textAlign: "center", lineHeight: 1.3 }}>{uploadandoQr ? "Enviando…" : "Enviar QR"}</span>
                <input type="file" accept="image/*" style={{ display: "none" }} disabled={uploadandoQr} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadQrCode(f); e.target.value = ""; }} />
              </label>
            )}
          </div>
        </div>
        {msgWm && <div style={{ fontSize: 12, marginTop: 10, color: msgWm.startsWith("❌") ? "#EF4444" : "#059669" }}>{msgWm}</div>}
      </div>

      {/* ── Asaas Webmaster (doações) ──────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={cardStyle}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 6 }}>
            💳 Pagamentos / Doações
            {wmConfig?.asaas_ativo && (
              <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: "rgba(16,185,129,0.10)", color: "#059669" }}>
                CONECTADO · {wmConfig.asaas_ambiente?.toUpperCase()}
              </span>
            )}
          </div>
          <p style={{ fontSize: 11, color: "var(--color-text-secondary)", margin: "0 0 14px", lineHeight: 1.5 }}>
            Conta Asaas do desenvolvedor para cobranças automáticas de doação. Separada do Asaas de assinaturas.
          </p>
          {wmConfig?.asaas_ativo ? (
            <button onClick={desconectarWm} style={{ padding: "8px 16px", borderRadius: 8, border: "0.5px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.05)", fontSize: 12, fontWeight: 600, color: "#DC2626", cursor: "pointer" }}>
              Desconectar Asaas
            </button>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <input type="password" value={apiKeyWm} onChange={(e) => setApiKeyWm(e.target.value)} placeholder="API Key do Asaas ($aact_...)" style={{ ...inputStyle, fontFamily: "monospace" }} />
              <select value={ambienteWm} onChange={(e) => setAmbienteWm(e.target.value)} style={{ ...inputStyle, width: 200 }}>
                <option value="sandbox">Sandbox (testes)</option>
                <option value="producao">Produção</option>
              </select>
              <button onClick={() => salvarWm(true)} disabled={salvandoWm || !apiKeyWm.trim()} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "#2563EB", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", width: "fit-content" }}>
                {salvandoWm ? "Validando…" : "Conectar"}
              </button>
            </div>
          )}
        </div>

        <div style={cardStyle}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 6 }}>
            Doações recebidas
            <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 400, color: "var(--color-text-secondary)" }}>
              {doacoes.filter((d) => d.status === "pago").length} pag. · R$ {totalRecebido.toFixed(2).replace(".", ",")}
            </span>
          </div>
          {doacoes.length === 0 ? (
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Nenhuma doação registrada ainda.</div>
          ) : (
            <div style={{ maxHeight: 280, overflowY: "auto", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 8 }}>
              {doacoes.map((d, i) => (
                <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderBottom: i < doacoes.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none", fontSize: 12 }}>
                  <span style={{ flex: 1, color: "var(--color-text-primary)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.pagador_nome ?? d.pagador_email ?? "—"}</span>
                  <span style={{ fontWeight: 700, color: "var(--color-text-primary)", flexShrink: 0 }}>R$ {Number(d.valor).toFixed(2).replace(".", ",")}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 8px", borderRadius: 10, flexShrink: 0, background: d.status === "pago" ? "rgba(16,185,129,0.10)" : "rgba(245,158,11,0.12)", color: d.status === "pago" ? "#059669" : "#B45309" }}>
                    {d.status === "pago" ? "PAGO" : "PENDENTE"}
                  </span>
                  <span style={{ color: "var(--color-text-secondary)", fontSize: 11, flexShrink: 0 }}>{new Date(d.created_at).toLocaleDateString("pt-BR")}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Manutenção: re-registrar webhooks de pagamento ─────────────────────── */}
      <div style={cardStyle}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 6 }}>
          🔁 Webhooks de pagamento
        </div>
        <p style={{ fontSize: 11, color: "var(--color-text-secondary)", margin: "0 0 14px", lineHeight: 1.5 }}>
          Re-registra o webhook do Asaas de todos os fotógrafos conectados (e do sistema) com a URL e o token atuais.
          Use se as confirmações automáticas de pagamento pararem (ex.: após migração de servidor).
        </p>
        <button onClick={reregistrarWebhooks} disabled={reregistrando} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "#2563EB", color: "#fff", fontSize: 12, fontWeight: 700, cursor: reregistrando ? "default" : "pointer", width: "fit-content", opacity: reregistrando ? 0.6 : 1 }}>
          {reregistrando ? "Re-registrando…" : "Re-registrar webhooks"}
        </button>
        {msgReg && <div style={{ fontSize: 12, marginTop: 10, color: msgReg.startsWith("❌") ? "#EF4444" : "#059669" }}>{msgReg}</div>}
      </div>
    </div>
  );
}
