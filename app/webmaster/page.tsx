"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const WEBMASTER_ID    = process.env.NEXT_PUBLIC_WEBMASTER_ID ?? "";
const WEBMASTER_EMAIL = "usefokio@gmail.com";

type FotografoStats = {
  id: string;
  nome_completo: string;
  nome_empresa: string;
  email: string;
  plano: string;
  aprovado: boolean;
  created_at: string;
  total_clientes: number;
  total_galerias: number;
  total_fotos: number;
  total_bytes: number;
  limite_fotos_custom: number | null;
  plano_expira_em: string | null;
  plano_ativado_em: string | null;
};

function formatGB(bytes: number): string {
  if (bytes === 0) return "0 MB";
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) return `${mb.toFixed(0)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span style={{
      display: "inline-block", padding: "2px 10px", borderRadius: 20,
      fontSize: 11, fontWeight: 600,
      background: color + "18", color,
    }}>
      {children}
    </span>
  );
}

// ── Pagamentos / Doações (conta Asaas do desenvolvedor) ─────────────────────
type DoacaoItem = { id: string; valor: number; status: string; pagador_nome: string | null; pagador_email: string | null; created_at: string; paid_at: string | null };
type WmConfig = { asaas_ativo: boolean; asaas_ambiente: string; doacao_manual_pix: string | null; doacao_manual_link: string | null; doacao_manual_msg: string | null; pix_qrcode_url: string | null };

function SecaoPagamentos() {
  const [config,     setConfig]     = useState<WmConfig | null>(null);
  const [doacoes,    setDoacoes]    = useState<DoacaoItem[]>([]);
  const [apiKey,     setApiKey]     = useState("");
  const [ambiente,   setAmbiente]   = useState("sandbox");
  const [manualPix,  setManualPix]  = useState("");
  const [manualLink, setManualLink] = useState("");
  const [manualMsg,  setManualMsg]  = useState("");
  const [salvando,   setSalvando]   = useState(false);
  const [msg,        setMsg]        = useState("");
  const [aberto,     setAberto]     = useState(false);
  const [uploadandoQr, setUploadandoQr] = useState(false);

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    const res = await fetch("/api/webmaster/asaas");
    if (!res.ok) return;
    const json = await res.json();
    setConfig(json.config);
    setDoacoes(json.doacoes ?? []);
    setManualPix(json.config?.doacao_manual_pix ?? "");
    setManualLink(json.config?.doacao_manual_link ?? "");
    setManualMsg(json.config?.doacao_manual_msg ?? "");
  }

  async function salvar(comKey: boolean) {
    setSalvando(true);
    setMsg("");
    const body: Record<string, unknown> = { manualPix, manualLink, manualMsg };
    if (comKey && apiKey.trim()) { body.apiKey = apiKey.trim(); body.ambiente = ambiente; }
    const res = await fetch("/api/webmaster/asaas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) { setMsg("❌ " + (json.erro ?? "Erro ao salvar.")); setSalvando(false); return; }
    setMsg(json.conta ? `✅ Conectado como ${json.conta.nome}` : "✅ Salvo!");
    setApiKey("");
    await carregar();
    setSalvando(false);
  }

  async function uploadQrCode(file: File) {
    setUploadandoQr(true);
    setMsg("");
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/webmaster/pix-qrcode", { method: "POST", body: form });
    const json = await res.json();
    if (!res.ok) { setMsg("❌ " + (json.erro ?? "Erro no upload.")); setUploadandoQr(false); return; }
    setMsg("✅ QR code salvo!");
    await carregar();
    setUploadandoQr(false);
  }

  async function removerQrCode() {
    if (!confirm("Remover o QR code?")) return;
    await fetch("/api/webmaster/pix-qrcode", { method: "DELETE" });
    await carregar();
  }

  async function desconectar() {
    if (!confirm("Desconectar a conta Asaas do desenvolvedor?")) return;
    await fetch("/api/webmaster/asaas", { method: "DELETE" });
    await carregar();
  }

  const totalRecebido = doacoes.filter((d) => d.status === "pago").reduce((s, d) => s + Number(d.valor), 0);

  return (
    <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "20px 24px", marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => setAberto(!aberto)}>
        <span style={{ fontSize: 13, transform: aberto ? "rotate(90deg)" : "none", transition: "transform 0.15s", color: "var(--color-text-secondary)" }}>▶</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)" }}>💳 Pagamentos / Doações</span>
        {config?.asaas_ativo && (
          <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: "rgba(16,185,129,0.10)", color: "#059669" }}>
            ASAAS CONECTADO · {config.asaas_ambiente?.toUpperCase()}
          </span>
        )}
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--color-text-secondary)" }}>
          {doacoes.filter((d) => d.status === "pago").length} doações · R$ {totalRecebido.toFixed(2).replace(".", ",")}
        </span>
      </div>

      {aberto && (
        <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 24 }}>

          {/* ── Seção Pix (independente) ── */}
          <div style={{ background: "var(--color-background-secondary)", borderRadius: 10, padding: "16px 18px" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 14 }}>🟢 Recebimento via Pix</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 16, alignItems: "flex-start" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <input value={manualPix} onChange={(e) => setManualPix(e.target.value)} placeholder="Chave Pix (e-mail, CPF, telefone ou chave aleatória)" style={{ padding: "9px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", fontSize: 12, background: "var(--color-background-primary)", color: "var(--color-text-primary)" }} />
                <input value={manualLink} onChange={(e) => setManualLink(e.target.value)} placeholder="Link de pagamento (opcional)" style={{ padding: "9px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", fontSize: 12, background: "var(--color-background-primary)", color: "var(--color-text-primary)" }} />
                <textarea value={manualMsg} onChange={(e) => setManualMsg(e.target.value)} placeholder="Mensagem exibida aos fotógrafos (opcional)" rows={2} style={{ padding: "9px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", fontSize: 12, background: "var(--color-background-primary)", color: "var(--color-text-primary)", resize: "vertical", fontFamily: "inherit" }} />
                <button onClick={() => salvar(false)} disabled={salvando} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "var(--color-text-primary)", color: "var(--color-background-primary)", fontSize: 12, fontWeight: 700, cursor: "pointer", width: "fit-content" }}>
                  {salvando ? "Salvando…" : "Salvar"}
                </button>
              </div>
              {/* QR Code */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>QR Code</div>
                {config?.pix_qrcode_url ? (
                  <>
                    <img src={config.pix_qrcode_url} alt="QR Code Pix" style={{ width: 100, height: 100, objectFit: "contain", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "#fff", padding: 5 }} />
                    <label style={{ fontSize: 11, fontWeight: 600, cursor: uploadandoQr ? "not-allowed" : "pointer", color: "#2563EB", opacity: uploadandoQr ? 0.5 : 1 }}>
                      {uploadandoQr ? "Enviando…" : "Trocar"}
                      <input type="file" accept="image/*" style={{ display: "none" }} disabled={uploadandoQr} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadQrCode(f); e.target.value = ""; }} />
                    </label>
                    <button onClick={removerQrCode} style={{ fontSize: 11, fontWeight: 600, color: "#EF4444", background: "none", border: "none", cursor: "pointer", padding: 0 }}>Remover</button>
                  </>
                ) : (
                  <label style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, width: 100, height: 100, borderRadius: 8, border: "0.5px dashed var(--color-border-secondary)", background: "var(--color-background-primary)", cursor: uploadandoQr ? "not-allowed" : "pointer", justifyContent: "center", opacity: uploadandoQr ? 0.5 : 1 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--color-text-secondary)" }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    <span style={{ fontSize: 10, color: "var(--color-text-secondary)", textAlign: "center", lineHeight: 1.3 }}>{uploadandoQr ? "Enviando…" : "Enviar QR"}</span>
                    <input type="file" accept="image/*" style={{ display: "none" }} disabled={uploadandoQr} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadQrCode(f); e.target.value = ""; }} />
                  </label>
                )}
              </div>
            </div>
            {msg && <div style={{ fontSize: 12, marginTop: 10, color: msg.startsWith("❌") ? "#EF4444" : "#059669" }}>{msg}</div>}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          {/* Coluna 1: Asaas */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>Asaas (cobranças automáticas)</div>
            <p style={{ fontSize: 11, color: "var(--color-text-secondary)", margin: "0 0 12px", lineHeight: 1.5 }}>
              Usado pelo sistema para gerar cobranças automáticas quando solicitado. Não interfere no Pix acima.
            </p>
            {config?.asaas_ativo ? (
              <button onClick={desconectar} style={{ padding: "8px 16px", borderRadius: 8, border: "0.5px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.05)", fontSize: 12, fontWeight: 600, color: "#DC2626", cursor: "pointer" }}>
                Desconectar Asaas
              </button>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="API Key do Asaas ($aact_...)" style={{ padding: "9px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", fontSize: 12, fontFamily: "monospace", background: "var(--color-background-primary)", color: "var(--color-text-primary)" }} />
                <select value={ambiente} onChange={(e) => setAmbiente(e.target.value)} style={{ padding: "9px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", fontSize: 12, background: "var(--color-background-primary)", color: "var(--color-text-primary)", width: 200 }}>
                  <option value="sandbox">Sandbox (testes)</option>
                  <option value="producao">Produção</option>
                </select>
                <button onClick={() => salvar(true)} disabled={salvando || !apiKey.trim()} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "#2563EB", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", width: "fit-content" }}>
                  {salvando ? "Validando…" : "Conectar"}
                </button>
              </div>
            )}
          </div>

          {/* Coluna 2: Doações recebidas */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>Doações recebidas</div>
            {doacoes.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Nenhuma doação registrada ainda.</div>
            ) : (
              <div style={{ maxHeight: 260, overflowY: "auto", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 8 }}>
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
        </div>
      )}
    </div>
  );
}

// ── Config Asaas do Sistema (cobranças de assinatura UseFokio) ───────────────
function SecaoSistema() {
  const [config,   setConfig]   = useState<{ configurado: boolean; ambiente: string; webhookRegistrado: boolean } | null>(null);
  const [apiKey,   setApiKey]   = useState("");
  const [ambiente, setAmbiente] = useState("sandbox");
  const [salvando, setSalvando] = useState(false);
  const [msg,      setMsg]      = useState("");
  const [aberto,   setAberto]   = useState(false);

  useEffect(() => { if (aberto) carregar(); }, [aberto]);

  async function carregar() {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/webmaster/sistema-config", {
      headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
    });
    if (res.ok) setConfig(await res.json());
  }

  async function salvar() {
    if (!apiKey.trim()) return;
    setSalvando(true);
    setMsg("");
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/webmaster/sistema-config", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
      body: JSON.stringify({ apiKey: apiKey.trim(), ambiente }),
    });
    const json = await res.json();
    if (!res.ok) { setMsg("❌ " + (json.error ?? "Erro ao salvar.")); setSalvando(false); return; }
    setMsg(`✅ Conectado como ${json.conta?.nome ?? "Conta Asaas"} · ${ambiente}${json.webhookRegistrado ? " · Webhook ✓" : " · ⚠ Webhook não registrado"}`);
    setApiKey("");
    await carregar();
    setSalvando(false);
  }

  return (
    <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "20px 24px", marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => setAberto(!aberto)}>
        <span style={{ fontSize: 13, transform: aberto ? "rotate(90deg)" : "none", transition: "transform 0.15s", color: "var(--color-text-secondary)" }}>▶</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)" }}>⚙ Asaas do Sistema (assinaturas)</span>
        {config?.configurado && (
          <>
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: "rgba(16,185,129,0.10)", color: "#059669" }}>
              CONECTADO · {config.ambiente?.toUpperCase()}
            </span>
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10,
              background: config.webhookRegistrado ? "rgba(16,185,129,0.10)" : "rgba(245,158,11,0.12)",
              color: config.webhookRegistrado ? "#059669" : "#B45309",
            }}>
              {config.webhookRegistrado ? "✓ Webhook" : "⚠ Webhook"}
            </span>
          </>
        )}
      </div>

      {aberto && (
        <div style={{ marginTop: 20 }}>
          <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "0 0 16px", lineHeight: 1.6 }}>
            Chave Asaas da conta UseFokio para gerar cobranças de assinatura (R$49/mês) para os fotógrafos.
            Separada do Asaas dos fotógrafos.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 440 }}>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={config?.configurado ? "••••••••• (chave já salva — cole nova para alterar)" : "API Key Asaas ($aact_...)"}
              style={{ padding: "9px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", fontSize: 12, fontFamily: "monospace", background: "var(--color-background-secondary)", color: "var(--color-text-primary)" }}
            />
            <select
              value={ambiente}
              onChange={(e) => setAmbiente(e.target.value)}
              style={{ padding: "9px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", fontSize: 12, background: "var(--color-background-secondary)", color: "var(--color-text-primary)", width: 200 }}
            >
              <option value="sandbox">Sandbox (testes)</option>
              <option value="producao">Produção</option>
            </select>
            <button
              onClick={salvar}
              disabled={salvando || !apiKey.trim()}
              style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "#2563EB", color: "#fff", fontSize: 12, fontWeight: 700, cursor: apiKey.trim() && !salvando ? "pointer" : "not-allowed", width: "fit-content", opacity: apiKey.trim() && !salvando ? 1 : 0.6 }}
            >
              {salvando ? "Validando…" : "Salvar e conectar"}
            </button>
            {msg && <div style={{ fontSize: 12, color: msg.startsWith("❌") ? "#EF4444" : "#059669" }}>{msg}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Recursos disponíveis por fotógrafo (checkboxes) ──────────────────────────
const RECURSOS_LABELS: { chave: string; label: string }[] = [
  { chave: "album",      label: "Álbum" },
  { chave: "contatos",   label: "Contatos" },
  { chave: "entrega",    label: "Entrega" },
  { chave: "pagamentos", label: "Pagamentos" },
  { chave: "selecao",    label: "Seleção" },
  { chave: "crm",        label: "CRM" },
];

function RecursosCell({ fotografoId }: { fotografoId: string }) {
  const [aberto,   setAberto]   = useState(false);
  const [recursos, setRecursos] = useState<Record<string, boolean> | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function abrir() {
    if (!aberto && !recursos) {
      const res = await fetch(`/api/webmaster/fotografo-config/${fotografoId}`);
      const data = await res.json();
      setRecursos((data?.recursos as Record<string, boolean>) ?? { selecao: true, entrega: true, album: true, contatos: true, pagamentos: true });
    }
    setAberto(!aberto);
  }

  async function alternar(chave: string) {
    if (!recursos) return;
    const novos = { ...recursos, [chave]: !recursos[chave] };
    setRecursos(novos);
    setSalvando(true);
    await fetch(`/api/webmaster/fotografo-config/${fotografoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recursos: novos }),
    });
    setSalvando(false);
  }

  const ativos = recursos ? Object.values(recursos).filter(Boolean).length : null;

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={abrir}
        style={{ padding: "5px 12px", borderRadius: 7, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", fontSize: 11, fontWeight: 600, color: "var(--color-text-primary)", cursor: "pointer", whiteSpace: "nowrap" }}
      >
        ⚙ {ativos !== null ? `${ativos}/${RECURSOS_LABELS.length}` : "Recursos"}
      </button>
      {aberto && recursos && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, zIndex: 30, background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-secondary)", borderRadius: 10, padding: "12px 14px", boxShadow: "0 6px 24px rgba(0,0,0,0.15)", minWidth: 170 }}>
          {RECURSOS_LABELS.map((r) => (
            <label key={r.chave} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", cursor: "pointer", fontSize: 12, color: "var(--color-text-primary)" }}>
              <input
                type="checkbox"
                checked={recursos[r.chave] !== false}
                onChange={() => alternar(r.chave)}
                style={{ width: 14, height: 14, accentColor: "#2563EB", cursor: "pointer" }}
              />
              {r.label}
            </label>
          ))}
          <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginTop: 6 }}>
            {salvando ? "Salvando…" : "Salvo automaticamente"}
          </div>
        </div>
      )}
    </div>
  );
}

function LimiteFotosCell({ fotografoId, inicial }: { fotografoId: string; inicial: number | null }) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor]       = useState(String(inicial ?? ""));
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    setSalvando(true);
    const num = valor.trim() === "" ? null : parseInt(valor);
    await fetch(`/api/webmaster/fotografo-config/${fotografoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ limite_fotos_custom: isNaN(num as number) ? null : num }),
    });
    setSalvando(false);
    setEditando(false);
  }

  if (editando) {
    return (
      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
        <input
          type="number"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") salvar(); if (e.key === "Escape") setEditando(false); }}
          autoFocus
          style={{ width: 70, padding: "3px 6px", borderRadius: 6, border: "0.5px solid var(--color-border-secondary)", fontSize: 12, background: "var(--color-background-primary)", color: "var(--color-text-primary)" }}
        />
        <button onClick={salvar} disabled={salvando} style={{ fontSize: 10, fontWeight: 700, padding: "3px 7px", borderRadius: 5, border: "none", background: "#059669", color: "#fff", cursor: "pointer" }}>
          {salvando ? "…" : "✓"}
        </button>
        <button onClick={() => setEditando(false)} style={{ fontSize: 10, padding: "3px 6px", borderRadius: 5, border: "0.5px solid var(--color-border-secondary)", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer" }}>
          ✕
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditando(true)}
      title="Clique para editar limite"
      style={{ padding: "3px 8px", borderRadius: 6, border: "0.5px solid var(--color-border-secondary)", background: "transparent", fontSize: 11, fontWeight: 600, color: "var(--color-text-primary)", cursor: "pointer", whiteSpace: "nowrap" }}
    >
      {inicial != null ? inicial.toLocaleString("pt-BR") : "∞"} fotos
    </button>
  );
}

// ── Planos e Campanhas ────────────────────────────────────────────────────────
type PlanoConfig = {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  preco: number;
  preco_anual: number | null;
  limite_fotos: number | null;
  limite_galerias: number | null;
  duracao_dias: number | null;
  ativo: boolean;
  eh_campanha: boolean;
  valido_ate: string | null;
  cor: string;
  ordem: number;
};

function SecaoPlanos() {
  const [aberto, setAberto]   = useState(false);
  const [planos, setPlanos]   = useState<PlanoConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal]     = useState<Partial<PlanoConfig> | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg]         = useState("");

  useEffect(() => { if (aberto) carregar(); }, [aberto]);

  async function carregar() {
    setLoading(true);
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/webmaster/planos", {
      headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
    });
    if (res.ok) setPlanos((await res.json()).planos ?? []);
    setLoading(false);
  }

  async function salvar() {
    if (!modal) return;
    setSalvando(true); setMsg("");
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const isNovo = !modal.id;
    const res = await fetch(isNovo ? "/api/webmaster/planos" : `/api/webmaster/planos/${modal.id}`, {
      method: isNovo ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
      body: JSON.stringify(modal),
    });
    const json = await res.json();
    if (!res.ok) { setMsg("❌ " + (json.error ?? "Erro ao salvar")); setSalvando(false); return; }
    setModal(null);
    await carregar();
    setSalvando(false);
  }

  async function toggleAtivo(p: PlanoConfig) {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(`/api/webmaster/planos/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
      body: JSON.stringify({ ativo: !p.ativo }),
    });
    await carregar();
  }

  const inputStyle: React.CSSProperties = {
    padding: "8px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)",
    fontSize: 12, background: "var(--color-background-secondary)", color: "var(--color-text-primary)",
    width: "100%", boxSizing: "border-box",
  };

  return (
    <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "20px 24px", marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => setAberto(!aberto)}>
        <span style={{ fontSize: 13, transform: aberto ? "rotate(90deg)" : "none", transition: "transform 0.15s", color: "var(--color-text-secondary)" }}>▶</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)" }}>📋 Planos e Campanhas</span>
        {planos.length > 0 && (
          <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>
            {planos.filter((p) => p.ativo).length} ativos
          </span>
        )}
      </div>

      {aberto && (
        <div style={{ marginTop: 20 }}>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
            <button
              onClick={() => setModal({ ativo: true, eh_campanha: false, preco: 49, duracao_dias: 31, cor: "#2563EB", ordem: 10 })}
              style={{ padding: "7px 16px", borderRadius: 8, border: "none", background: "#2563EB", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
            >
              + Nova Campanha
            </button>
          </div>
          {msg && <div style={{ fontSize: 12, marginBottom: 12, color: msg.startsWith("❌") ? "#EF4444" : "#059669" }}>{msg}</div>}
          {loading ? (
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Carregando…</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {planos.map((p) => (
                <div key={p.id} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
                  background: "var(--color-background-secondary)", borderRadius: 8, opacity: p.ativo ? 1 : 0.5,
                }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: p.cor, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "var(--color-text-primary)" }}>
                      {p.nome}
                      {p.eh_campanha && (
                        <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 10, background: "rgba(245,158,11,0.15)", color: "#B45309" }}>
                          CAMPANHA
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>
                      {`R$${Number(p.preco).toFixed(2).replace(".", ",")}/mês`}
                      {p.preco_anual != null ? ` · R$${Number(p.preco_anual).toFixed(2).replace(".", ",")}/mês anual` : ""}
                      {p.limite_fotos != null ? ` · ${p.limite_fotos.toLocaleString("pt-BR")} fotos` : " · fotos ilimitadas"}
                      {p.limite_galerias != null ? ` · ${p.limite_galerias} galerias entrega` : ""}
                      {p.duracao_dias != null ? ` · ${p.duracao_dias}d` : ""}
                      {p.valido_ate ? ` · válido até ${new Date(p.valido_ate + "T12:00:00").toLocaleDateString("pt-BR")}` : ""}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      onClick={() => setModal({ ...p })}
                      style={{ padding: "4px 12px", borderRadius: 6, border: "0.5px solid var(--color-border-secondary)", background: "transparent", fontSize: 11, fontWeight: 600, color: "var(--color-text-primary)", cursor: "pointer" }}
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => toggleAtivo(p)}
                      style={{ padding: "4px 12px", borderRadius: 6, border: "none", background: p.ativo ? "rgba(239,68,68,0.1)" : "rgba(5,150,105,0.1)", fontSize: 11, fontWeight: 600, color: p.ativo ? "#EF4444" : "#059669", cursor: "pointer" }}
                    >
                      {p.ativo ? "Desativar" : "Ativar"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}
          onClick={(e) => { if (e.target === e.currentTarget && !salvando) { setModal(null); setMsg(""); } }}>
          <div style={{ background: "var(--color-background-primary)", borderRadius: 14, padding: "28px 30px", width: 460, boxShadow: "0 8px 40px rgba(0,0,0,0.25)", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "var(--color-text-primary)", marginBottom: 20 }}>
              {modal.id ? "Editar Plano" : "Nova Campanha"}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 4 }}>Nome</div>
                <input style={inputStyle} value={modal.nome ?? ""} onChange={(e) => setModal({ ...modal, nome: e.target.value })} placeholder="Ex: Promoção Julho" />
              </div>
              {!modal.id && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 4 }}>Código único</div>
                  <input style={inputStyle} value={modal.codigo ?? ""} onChange={(e) => setModal({ ...modal, codigo: e.target.value })} placeholder="ex: campanha-jul26" />
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 4 }}>Preço mensal (R$)</div>
                  <input style={inputStyle} type="number" value={modal.preco ?? ""} onChange={(e) => setModal({ ...modal, preco: Number(e.target.value) })} />
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 4 }}>Preço anual — parcela 12x (R$)</div>
                  <input style={inputStyle} type="number" value={modal.preco_anual ?? ""} onChange={(e) => setModal({ ...modal, preco_anual: e.target.value ? Number(e.target.value) : null })} placeholder="em branco = sem plano anual" />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 4 }}>Duração (dias)</div>
                  <input style={inputStyle} type="number" value={modal.duracao_dias ?? ""} onChange={(e) => setModal({ ...modal, duracao_dias: e.target.value ? Number(e.target.value) : null })} placeholder="31" />
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 4 }}>Cor (hex)</div>
                  <input style={inputStyle} value={modal.cor ?? "#2563EB"} onChange={(e) => setModal({ ...modal, cor: e.target.value })} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 4 }}>Limite de fotos</div>
                  <input style={inputStyle} type="number" value={modal.limite_fotos ?? ""} onChange={(e) => setModal({ ...modal, limite_fotos: e.target.value ? Number(e.target.value) : null })} placeholder="em branco = ilimitado" />
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 4 }}>Limite de galerias de entrega</div>
                  <input style={inputStyle} type="number" value={modal.limite_galerias ?? ""} onChange={(e) => setModal({ ...modal, limite_galerias: e.target.value ? Number(e.target.value) : null })} placeholder="em branco = ilimitado" />
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 4 }}>Válido até (deixe em branco para sem prazo)</div>
                <input style={inputStyle} type="date" value={modal.valido_ate ?? ""} onChange={(e) => setModal({ ...modal, valido_ate: e.target.value || null })} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 4 }}>Descrição</div>
                <textarea style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} rows={2} value={modal.descricao ?? ""} onChange={(e) => setModal({ ...modal, descricao: e.target.value })} placeholder="Descrição opcional" />
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--color-text-primary)", cursor: "pointer" }}>
                <input type="checkbox" checked={modal.eh_campanha ?? false} onChange={(e) => setModal({ ...modal, eh_campanha: e.target.checked })} />
                Marcar como campanha promocional
              </label>
            </div>
            {msg && <div style={{ fontSize: 12, marginTop: 12, color: msg.startsWith("❌") ? "#EF4444" : "#059669" }}>{msg}</div>}
            <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
              <button
                onClick={() => { setModal(null); setMsg(""); }}
                disabled={salvando}
                style={{ flex: 1, padding: "9px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "transparent", fontSize: 13, color: "var(--color-text-secondary)", cursor: "pointer" }}
              >
                Cancelar
              </button>
              <button
                onClick={salvar}
                disabled={salvando || !modal.nome?.trim()}
                style={{ flex: 2, padding: "9px", borderRadius: 8, border: "none", background: salvando || !modal.nome?.trim() ? "rgba(37,99,235,0.3)" : "#2563EB", color: "#fff", fontSize: 13, fontWeight: 700, cursor: salvando || !modal.nome?.trim() ? "default" : "pointer" }}
              >
                {salvando ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Assinaturas ───────────────────────────────────────────────────────────────
type AssinaturaItem = {
  id: string;
  plano: string;
  valor: number;
  preco_cobrado: number | null;
  periodo_inicio: string;
  periodo_fim: string | null;
  status: string;
  pago_em: string | null;
  created_at: string;
  fotografos: { id: string; nome_completo: string; nome_empresa: string; email: string; plano_expira_em: string | null; plano: string } | null;
  planos_config: { nome: string; cor: string; eh_campanha: boolean } | null;
};

const ASS_STATUS_LABEL: Record<string, string> = { pendente: "Pendente", pago: "Pago", cancelado: "Cancelado" };
const ASS_STATUS_COLOR: Record<string, string>  = { pago: "#059669", pendente: "#B45309", cancelado: "#6B7280" };

function SecaoAssinaturas() {
  const [aberto,      setAberto]      = useState(false);
  const [assinaturas, setAssinaturas] = useState<AssinaturaItem[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [agindo,      setAgindo]      = useState<string | null>(null);
  const [msg,         setMsg]         = useState("");

  useEffect(() => {
    if (!aberto) return;
    async function load() {
      setLoading(true);
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const params = filtroStatus !== "todos" ? `?status=${filtroStatus}` : "";
      const res = await fetch(`/api/webmaster/assinaturas${params}`, {
        headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
      });
      if (res.ok) setAssinaturas((await res.json()).assinaturas ?? []);
      setLoading(false);
    }
    load();
  }, [aberto, filtroStatus]);

  async function estender(id: string, dias = 30) {
    setAgindo(id);
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`/api/webmaster/assinaturas/${id}/estender`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
      body: JSON.stringify({ dias }),
    });
    const json = await res.json();
    if (!res.ok) setMsg("❌ " + (json.error ?? "Erro"));
    else setMsg(`✅ Estendido até ${json.nova_expiracao ? new Date(json.nova_expiracao).toLocaleDateString("pt-BR") : "—"}`);
    setAssinaturas((prev) => prev.map((a) => {
      if (a.id !== id || !a.fotografos) return a;
      return { ...a, fotografos: { ...a.fotografos, plano_expira_em: json.nova_expiracao ?? null } };
    }));
    setAgindo(null);
  }

  async function cancelar(id: string) {
    if (!confirm("Cancelar assinatura e rebaixar fotógrafo para gratuito?")) return;
    setAgindo(id);
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(`/api/webmaster/assinaturas/${id}/cancelar`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
    });
    setAssinaturas((prev) => prev.map((a) => a.id === id ? { ...a, status: "cancelado" } : a));
    setAgindo(null);
  }

  function formatExpira(exp: string | null) {
    if (!exp) return { txt: "—", color: "var(--color-text-secondary)" as string };
    const d = new Date(exp);
    const diffDias = Math.ceil((d.getTime() - Date.now()) / 86400000);
    const txt = d.toLocaleDateString("pt-BR");
    if (diffDias < 0) return { txt: `Expirou ${txt}`, color: "#EF4444" };
    if (diffDias <= 7) return { txt: `⚠ ${txt}`, color: "#B45309" };
    return { txt, color: "#059669" };
  }

  const pagas = assinaturas.filter((a) => a.status === "pago").length;

  return (
    <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "20px 24px", marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => setAberto(!aberto)}>
        <span style={{ fontSize: 13, transform: aberto ? "rotate(90deg)" : "none", transition: "transform 0.15s", color: "var(--color-text-secondary)" }}>▶</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)" }}>💰 Assinaturas</span>
        {assinaturas.length > 0 && (
          <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>
            {pagas} paga{pagas !== 1 ? "s" : ""} · {assinaturas.length} total
          </span>
        )}
      </div>

      {aberto && (
        <div style={{ marginTop: 20 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
            {(["todos", "pago", "pendente", "cancelado"] as const).map((s) => (
              <button key={s} onClick={() => setFiltroStatus(s)}
                style={{
                  padding: "4px 12px", borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: "pointer",
                  border: "0.5px solid", borderColor: filtroStatus === s ? "var(--color-text-primary)" : "var(--color-border-secondary)",
                  background: filtroStatus === s ? "var(--color-text-primary)" : "transparent",
                  color: filtroStatus === s ? "var(--color-background-primary)" : "var(--color-text-secondary)",
                }}>
                {s === "todos" ? "Todas" : ASS_STATUS_LABEL[s] ?? s}
              </button>
            ))}
          </div>
          {msg && <div style={{ fontSize: 12, marginBottom: 12, color: msg.startsWith("❌") ? "#EF4444" : "#059669" }}>{msg}</div>}
          {loading ? (
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Carregando…</div>
          ) : assinaturas.length === 0 ? (
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Nenhuma assinatura encontrada.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", minWidth: 820, borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: "var(--color-background-secondary)" }}>
                    {["Fotógrafo", "Plano", "Valor", "Status", "Expira", "Criado em", "Ações"].map((h) => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "0.5px solid var(--color-border-tertiary)", whiteSpace: "nowrap" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {assinaturas.map((a, i) => {
                    const expira    = formatExpira(a.fotografos?.plano_expira_em ?? null);
                    const precoReal = a.preco_cobrado ?? a.valor;
                    const nomePlano = a.planos_config?.nome ?? a.plano;
                    const corPlano  = a.planos_config?.cor ?? "#6B7280";
                    return (
                      <tr key={a.id} style={{ borderBottom: i < assinaturas.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none" }}>
                        <td style={{ padding: "10px 12px" }}>
                          <div style={{ fontWeight: 600, color: "var(--color-text-primary)" }}>{a.fotografos?.nome_completo ?? "—"}</div>
                          <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{a.fotografos?.email}</div>
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: corPlano + "18", color: corPlano }}>
                            {nomePlano}
                          </span>
                          {a.planos_config?.eh_campanha && <span style={{ marginLeft: 5, fontSize: 10 }}>🏷</span>}
                        </td>
                        <td style={{ padding: "10px 12px", fontWeight: 700, color: "var(--color-text-primary)", whiteSpace: "nowrap" }}>
                          R$ {Number(precoReal).toFixed(2).replace(".", ",")}
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: (ASS_STATUS_COLOR[a.status] ?? "#6B7280") + "18", color: ASS_STATUS_COLOR[a.status] ?? "#6B7280" }}>
                            {ASS_STATUS_LABEL[a.status] ?? a.status}
                          </span>
                        </td>
                        <td style={{ padding: "10px 12px", color: expira.color, whiteSpace: "nowrap", fontWeight: 500, fontSize: 11 }}>
                          {expira.txt}
                        </td>
                        <td style={{ padding: "10px 12px", color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>
                          {new Date(a.created_at).toLocaleDateString("pt-BR")}
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <div style={{ display: "flex", gap: 5 }}>
                            <button
                              onClick={() => estender(a.id, 30)}
                              disabled={agindo === a.id}
                              style={{ padding: "4px 10px", borderRadius: 6, border: "0.5px solid rgba(37,99,235,0.4)", background: "rgba(37,99,235,0.08)", color: "#2563EB", fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
                            >
                              {agindo === a.id ? "…" : "+30d"}
                            </button>
                            {a.status !== "cancelado" && (
                              <button
                                onClick={() => cancelar(a.id)}
                                disabled={agindo === a.id}
                                style={{ padding: "4px 10px", borderRadius: 6, border: "none", background: "rgba(239,68,68,0.1)", color: "#EF4444", fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
                              >
                                Cancelar
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SecaoStorage() {
  const [status, setStatus] = useState<{ deleted?: number; total?: number; errors?: string[]; error?: string } | null>(null);
  const [rodando, setRodando] = useState(false);

  async function limpar() {
    if (!confirm(`Deletar TODOS os arquivos de fotos de entrega que estão no storage mas não têm registro no banco?\n\nIsso inclui fotos órfãs de TODOS os fotógrafos.`)) return;
    setRodando(true);
    setStatus(null);
    try {
      const res = await fetch("/api/webmaster/cleanup-storage", { method: "POST" });
      setStatus(await res.json());
    } catch (e) {
      setStatus({ error: String(e) });
    } finally {
      setRodando(false);
    }
  }

  return (
    <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "20px 24px", marginBottom: 28 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 12 }}>🗑️ Storage — Limpeza de Órfãos</div>
      <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "0 0 14px", lineHeight: 1.5 }}>
        Remove arquivos de fotos de entrega que existem no bucket Supabase mas não têm registro em <code>galerias_entrega_fotos</code>. Não apaga capas nem arquivos de seleção/álbum.
      </p>
      <button
        onClick={limpar}
        disabled={rodando}
        style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: rodando ? "rgba(239,68,68,0.3)" : "#EF4444", color: "#fff", fontSize: 12, fontWeight: 700, cursor: rodando ? "default" : "pointer" }}
      >
        {rodando ? "Limpando…" : "Limpar arquivos órfãos"}
      </button>
      {status && (
        <div style={{ marginTop: 10, fontSize: 12, color: status.error || status.errors?.length ? "#EF4444" : "#059669" }}>
          {status.error
            ? `❌ Erro: ${status.error}`
            : status.errors?.length
            ? `⚠️ ${status.deleted}/${status.total} deletados com ${status.errors.length} erro(s)`
            : `✅ ${status.deleted} arquivo(s) deletado(s)${status.total && status.total > 0 ? ` de ${status.total} órfão(s)` : " — storage limpo"}`
          }
        </div>
      )}
    </div>
  );
}

export default function WebmasterPage() {
  const router = useRouter();
  const [verificado, setVerificado]       = useState(false);
  const [stats, setStats]                 = useState<FotografoStats[]>([]);
  const [loading, setLoading]             = useState(true);
  const [pendingIds, setPendingIds]       = useState<Set<string>>(new Set());
  const [filtro, setFiltro]               = useState<"todos" | "pendentes">("todos");
  const [modalExcluir, setModalExcluir]   = useState<FotografoStats | null>(null);
  const [confirmEmail, setConfirmEmail]   = useState("");
  const [excluindo, setExcluindo]         = useState(false);
  const [erroExcluir, setErroExcluir]     = useState("");
  const [resetando, setResetando]         = useState<string | null>(null);
  const [ativando,  setAtivando]          = useState<string | null>(null);
  const [modalAtivacao, setModalAtivacao] = useState<{ id: string; nome: string } | null>(null);
  const [periodoAtivacao, setPeriodoAtivacao] = useState<"mensal" | "anual">("mensal");

  // Verifica se é webmaster
  useEffect(() => {
    async function verificar() {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const isWebmaster = session && (
        (WEBMASTER_ID    && session.user.id    === WEBMASTER_ID) ||
        (WEBMASTER_EMAIL && session.user.email === WEBMASTER_EMAIL)
      );
      if (!isWebmaster) {
        router.push("/login");
        return;
      }
      setVerificado(true);
    }
    verificar();
  }, [router]);

  // Carrega stats
  useEffect(() => {
    if (!verificado) return;
    carregarStats();
  }, [verificado]);

  async function carregarStats() {
    setLoading(true);
    const res = await fetch("/api/webmaster/stats");
    const json = await res.json();
    if (res.ok && json.data) {
      setStats(json.data as FotografoStats[]);
    }
    setLoading(false);
  }

  async function aprovar(id: string, valor: boolean) {
    setPendingIds((prev) => new Set([...prev, id]));
    await fetch(`/api/webmaster/fotografo-config/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aprovado: valor }),
    });
    setStats((prev) => prev.map((f) => f.id === id ? { ...f, aprovado: valor } : f));
    setPendingIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
  }

  async function sair() {
    await createClient().auth.signOut();
    router.push("/login");
  }

  function abrirAtivacao(fotografoId: string, nome: string) {
    setPeriodoAtivacao("mensal");
    setModalAtivacao({ id: fotografoId, nome });
  }

  async function confirmarAtivacao() {
    if (!modalAtivacao) return;
    setAtivando(modalAtivacao.id);
    const dias = periodoAtivacao === "anual" ? 365 : 31;
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    await fetch("/api/webmaster/ativar-plano", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
      body: JSON.stringify({ fotografo_id: modalAtivacao.id, plano: "profissional", dias, periodo: periodoAtivacao }),
    });
    await carregarStats();
    setAtivando(null);
    setModalAtivacao(null);
  }

  async function resetarContaTeste(id: string) {
    if (!confirm("Reiniciar conta de teste? Onboarding e categorias serão limpos.")) return;
    setResetando(id);
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    await fetch("/api/webmaster/resetar-conta-teste", {
      method: "POST",
      headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
    });
    setResetando(null);
  }

  async function excluirFotografo() {
    if (!modalExcluir) return;
    setExcluindo(true);
    setErroExcluir("");
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token ?? "";
    const res = await fetch("/api/webmaster/excluir-fotografo", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ fotografo_id: modalExcluir.id }),
    });
    if (!res.ok) {
      const body = await res.json();
      setErroExcluir(body.error ?? "Erro ao excluir.");
      setExcluindo(false);
      return;
    }
    setStats((prev) => prev.filter((f) => f.id !== modalExcluir.id));
    setModalExcluir(null);
    setConfirmEmail("");
    setExcluindo(false);
  }

  if (!verificado) return null;

  const pendentes = stats.filter((f) => !f.aprovado);
  const lista     = filtro === "pendentes" ? pendentes : stats;

  const PLANO_COLOR: Record<string, string> = {
    gratuito:    "#059669",
    profissional: "#2563EB",
    estudio:      "#7C3AED",
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-background-tertiary)", fontFamily: "var(--font-sans)" }}>

      {/* Header */}
      <header style={{
        background: "var(--color-background-primary)",
        borderBottom: "0.5px solid var(--color-border-tertiary)",
        padding: "0 32px", height: 54,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src="/usefokio-logo.svg" alt="UseFokio" style={{ height: 22 }} />
          <span style={{
            fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 5,
            background: "rgba(124,58,237,0.1)", color: "#7C3AED", letterSpacing: "0.05em",
          }}>
            WEBMASTER
          </span>
        </div>
        <button
          onClick={sair}
          style={{ background: "none", border: "0.5px solid var(--color-border-secondary)", borderRadius: 7, padding: "6px 14px", fontSize: 12, color: "var(--color-text-secondary)", cursor: "pointer" }}
        >
          Sair
        </button>
      </header>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>

        {/* Stats resumo */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 32 }}>
          {[
            { label: "Total fotógrafos", value: stats.length, color: "#2563EB" },
            { label: "Pendentes aprovação", value: pendentes.length, color: "#F59E0B" },
            { label: "Aprovados", value: stats.filter((f) => f.aprovado).length, color: "#059669" },
            { label: "Total de fotos", value: stats.reduce((a, f) => a + f.total_fotos, 0).toLocaleString("pt-BR"), color: "#6B7280" },
            { label: "Armazenamento total", value: formatGB(stats.reduce((a, f) => a + f.total_bytes, 0)), color: "#7C3AED" },
          ].map((item) => (
            <div key={item.label} style={{
              background: "var(--color-background-primary)",
              border: "0.5px solid var(--color-border-tertiary)",
              borderRadius: 10, padding: "16px 20px",
            }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: item.color, letterSpacing: "-0.03em" }}>
                {item.value}
              </div>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2, fontWeight: 500 }}>
                {item.label}
              </div>
            </div>
          ))}
        </div>

        {/* Config Asaas do Sistema */}
        <SecaoSistema />

        {/* Planos e Campanhas */}
        <SecaoPlanos />

        {/* Assinaturas */}
        <SecaoAssinaturas />

        {/* Pagamentos / Doações */}
        <SecaoPagamentos />

        {/* Storage — Limpeza de órfãos */}
        <SecaoStorage />

        {/* Pendentes — destaque */}
        {pendentes.length > 0 && (
          <div style={{
            background: "rgba(245,158,11,0.06)",
            border: "0.5px solid rgba(245,158,11,0.35)",
            borderRadius: 12, padding: "20px 24px", marginBottom: 28,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <span style={{ fontSize: 16 }}>⏳</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#92400E" }}>
                {pendentes.length} cadastro{pendentes.length !== 1 ? "s" : ""} aguardando aprovação
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {pendentes.map((f) => (
                <div key={f.id} style={{
                  background: "var(--color-background-primary)",
                  border: "0.5px solid var(--color-border-tertiary)",
                  borderRadius: 8, padding: "12px 16px",
                  display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
                }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>
                      {f.nome_completo}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                      {f.nome_empresa} · {f.email}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)", flexShrink: 0 }}>
                    {new Date(f.created_at).toLocaleDateString("pt-BR")}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    <button
                      onClick={() => aprovar(f.id, true)}
                      disabled={pendingIds.has(f.id)}
                      style={{
                        padding: "7px 18px", borderRadius: 8, border: "none",
                        background: pendingIds.has(f.id) ? "#D1FAE5" : "#059669",
                        color: "#fff", fontSize: 12, fontWeight: 700,
                        cursor: pendingIds.has(f.id) ? "default" : "pointer",
                      }}
                    >
                      {pendingIds.has(f.id) ? "Aprovando…" : "✓ Aprovar"}
                    </button>
                    <button
                      onClick={() => { setModalExcluir(f); setConfirmEmail(""); setErroExcluir(""); }}
                      disabled={pendingIds.has(f.id)}
                      style={{
                        padding: "7px 14px", borderRadius: 8, border: "none",
                        background: "rgba(239,68,68,0.1)", color: "#EF4444",
                        fontSize: 12, fontWeight: 700,
                        cursor: pendingIds.has(f.id) ? "default" : "pointer",
                      }}
                    >
                      ✕ Recusar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabela completa */}
        <div style={{
          background: "var(--color-background-primary)",
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: 12, overflow: "hidden",
        }}>
          {/* Cabeçalho da tabela */}
          <div style={{
            padding: "16px 20px",
            borderBottom: "0.5px solid var(--color-border-tertiary)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)" }}>
              Fotógrafos
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {(["pendentes", "todos"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFiltro(f)}
                  style={{
                    padding: "5px 12px", borderRadius: 7, fontSize: 11, fontWeight: 600,
                    border: "0.5px solid",
                    borderColor: filtro === f ? "var(--color-text-primary)" : "var(--color-border-secondary)",
                    background: filtro === f ? "var(--color-text-primary)" : "transparent",
                    color: filtro === f ? "var(--color-background-primary)" : "var(--color-text-secondary)",
                    cursor: "pointer",
                  }}
                >
                  {f === "pendentes" ? `Pendentes (${pendentes.length})` : `Todos (${stats.length})`}
                </button>
              ))}
              <button
                onClick={carregarStats}
                style={{ padding: "5px 10px", borderRadius: 7, fontSize: 11, border: "0.5px solid var(--color-border-secondary)", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer" }}
              >
                ↻ Atualizar
              </button>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: "40px", textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>
              Carregando…
            </div>
          ) : lista.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>
              {filtro === "pendentes" ? "Nenhum cadastro pendente. 🎉" : "Nenhum fotógrafo cadastrado."}
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", minWidth: 900, borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: "var(--color-background-secondary)" }}>
                    {["Nome / Empresa", "Email", "Plano", "Expira", "Status", "Clientes", "Galerias", "Fotos", "Uso", "Limite", "Cadastro", "Recursos", "Ação"].map((h) => (
                      <th key={h} style={{
                        padding: "10px 14px", textAlign: "left",
                        fontSize: 10, fontWeight: 700,
                        color: "var(--color-text-secondary)",
                        textTransform: "uppercase", letterSpacing: "0.05em",
                        borderBottom: "0.5px solid var(--color-border-tertiary)",
                        whiteSpace: "nowrap",
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lista.map((f, i) => (
                    <tr
                      key={f.id}
                      style={{ borderBottom: i < lista.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none" }}
                    >
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ fontWeight: 600, color: "var(--color-text-primary)" }}>{f.nome_completo}</div>
                        <div style={{ color: "var(--color-text-secondary)", fontSize: 11 }}>{f.nome_empresa}</div>
                      </td>
                      <td style={{ padding: "12px 14px", color: "var(--color-text-secondary)" }}>
                        {f.email}
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <Badge color={PLANO_COLOR[f.plano] ?? "#6B7280"}>
                          {f.plano}
                        </Badge>
                      </td>
                      <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                        {(() => {
                          const exp = f.plano_expira_em;
                          if (!exp) return <span style={{ color: "var(--color-text-secondary)", fontSize: 11 }}>—</span>;
                          const d = new Date(exp);
                          const diff = Math.ceil((d.getTime() - Date.now()) / 86400000);
                          const txt = d.toLocaleDateString("pt-BR");
                          if (diff < 0) return <span style={{ color: "#EF4444", fontSize: 11, fontWeight: 600 }}>Expirado</span>;
                          if (diff <= 7) return <span style={{ color: "#B45309", fontSize: 11, fontWeight: 600 }}>⚠ {txt}</span>;
                          return <span style={{ color: "#059669", fontSize: 11 }}>{txt}</span>;
                        })()}
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        {f.aprovado
                          ? <Badge color="#059669">Aprovado</Badge>
                          : <Badge color="#F59E0B">Pendente</Badge>
                        }
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "center", color: "var(--color-text-primary)", fontWeight: 500 }}>
                        {f.total_clientes}
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "center", color: "var(--color-text-primary)", fontWeight: 500 }}>
                        {f.total_galerias}
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "center", color: "var(--color-text-primary)", fontWeight: 500 }}>
                        {f.total_fotos.toLocaleString("pt-BR")}
                      </td>
                      <td style={{ padding: "12px 14px", color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>
                        {formatGB(f.total_bytes)}
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <LimiteFotosCell fotografoId={f.id} inicial={f.limite_fotos_custom} />
                      </td>
                      <td style={{ padding: "12px 14px", color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>
                        {new Date(f.created_at).toLocaleDateString("pt-BR")}
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <RecursosCell fotografoId={f.id} />
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <button
                            onClick={() => aprovar(f.id, !f.aprovado)}
                            disabled={pendingIds.has(f.id)}
                            style={{
                              padding: "5px 12px", borderRadius: 7, border: "none",
                              background: f.aprovado ? "rgba(239,68,68,0.1)" : "rgba(5,150,105,0.1)",
                              color: f.aprovado ? "#EF4444" : "#059669",
                              fontSize: 11, fontWeight: 600,
                              cursor: pendingIds.has(f.id) ? "default" : "pointer",
                              opacity: pendingIds.has(f.id) ? 0.6 : 1,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {pendingIds.has(f.id) ? "…" : f.aprovado ? "Suspender" : "Aprovar"}
                          </button>
                          <button
                            onClick={() => { setModalExcluir(f); setConfirmEmail(""); setErroExcluir(""); }}
                            style={{
                              padding: "5px 10px", borderRadius: 7, border: "none",
                              background: "rgba(239,68,68,0.08)", color: "#EF4444",
                              fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
                              lineHeight: 1,
                            }}
                            title="Excluir conta e todos os dados"
                          >
                            Excluir
                          </button>
                          {f.plano !== "profissional" && (
                            <button
                              onClick={() => abrirAtivacao(f.id, f.nome_empresa || f.nome_completo)}
                              disabled={ativando === f.id}
                              title="Ativar plano Profissional manualmente"
                              style={{ padding: "4px 10px", borderRadius: 6, border: "0.5px solid rgba(37,99,235,0.4)", background: "rgba(37,99,235,0.08)", color: "#2563EB", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
                            >
                              {ativando === f.id ? "…" : "✓ Ativar Pro"}
                            </button>
                          )}
                          {f.email === "fernando.agrelaws@gmail.com" && (
                            <button
                              onClick={() => resetarContaTeste(f.id)}
                              disabled={resetando === f.id}
                              title="Reiniciar conta de teste"
                              style={{ padding: "4px 10px", borderRadius: 6, border: "0.5px solid rgba(124,58,237,0.4)", background: "rgba(124,58,237,0.08)", color: "#7C3AED", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
                            >
                              {resetando === f.id ? "…" : "🔄 Reiniciar"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal exclusão de fotógrafo */}
      {modalExcluir && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200,
        }} onClick={(e) => e.target === e.currentTarget && !excluindo && setModalExcluir(null)}>
          <div style={{
            background: "var(--color-background-primary)",
            border: "0.5px solid var(--color-border-tertiary)",
            borderRadius: 14, padding: "28px 30px", width: 420,
            boxShadow: "0 8px 40px rgba(0,0,0,0.25)",
          }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#EF4444", marginBottom: 8 }}>
              ⚠️ Excluir conta permanentemente
            </div>
            <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 20, lineHeight: 1.6 }}>
              Esta ação é <strong>irreversível</strong>. Todos os dados de{" "}
              <strong style={{ color: "var(--color-text-primary)" }}>{modalExcluir.nome_completo}</strong>{" "}
              serão apagados: galerias, fotos, pedidos, financeiro, CRM e a conta de acesso.
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
                Digite o email do fotógrafo para confirmar
              </div>
              <input
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                placeholder={modalExcluir.email}
                style={{
                  width: "100%", padding: "9px 12px", borderRadius: 8, boxSizing: "border-box",
                  border: "0.5px solid var(--color-border-secondary)",
                  background: "var(--color-background-primary)",
                  fontSize: 13, color: "var(--color-text-primary)", outline: "none",
                }}
                autoFocus
              />
            </div>

            {erroExcluir && (
              <div style={{ fontSize: 12, color: "#EF4444", marginBottom: 12, padding: "8px 12px", background: "rgba(239,68,68,0.07)", borderRadius: 7 }}>
                {erroExcluir}
              </div>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => { setModalExcluir(null); setConfirmEmail(""); setErroExcluir(""); }}
                disabled={excluindo}
                style={{
                  flex: 1, padding: "9px", borderRadius: 8,
                  border: "0.5px solid var(--color-border-secondary)",
                  background: "transparent", fontSize: 13,
                  color: "var(--color-text-secondary)", cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={excluirFotografo}
                disabled={excluindo || confirmEmail.trim() !== modalExcluir.email}
                style={{
                  flex: 2, padding: "9px", borderRadius: 8, border: "none",
                  background: (excluindo || confirmEmail.trim() !== modalExcluir.email) ? "rgba(239,68,68,0.3)" : "#EF4444",
                  color: "#fff", fontSize: 13, fontWeight: 700,
                  cursor: (excluindo || confirmEmail.trim() !== modalExcluir.email) ? "default" : "pointer",
                }}
              >
                {excluindo ? "Excluindo…" : "Excluir tudo permanentemente"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Ativar plano profissional */}
      {modalAtivacao && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300 }}
          onClick={(e) => { if (e.target === e.currentTarget) { setModalAtivacao(null); } }}>
          <div style={{ background: "var(--color-background-primary)", borderRadius: 14, padding: "28px 30px", width: 380, boxShadow: "0 8px 40px rgba(0,0,0,0.25)" }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "var(--color-text-primary)", marginBottom: 6 }}>
              Ativar Plano Profissional
            </div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 20 }}>
              {modalAtivacao.nome}
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 8 }}>
              Período de assinatura
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
              {(["mensal", "anual"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriodoAtivacao(p)}
                  style={{
                    flex: 1, padding: "10px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700,
                    border: periodoAtivacao === p ? "2px solid #2563EB" : "0.5px solid var(--color-border-secondary)",
                    background: periodoAtivacao === p ? "rgba(37,99,235,0.08)" : "transparent",
                    color: periodoAtivacao === p ? "#2563EB" : "var(--color-text-secondary)",
                  }}
                >
                  {p === "mensal" ? "Mensal (31d)" : "Anual (365d)"}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setModalAtivacao(null)}
                disabled={!!ativando}
                style={{ flex: 1, padding: "9px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "transparent", fontSize: 13, color: "var(--color-text-secondary)", cursor: "pointer" }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmarAtivacao}
                disabled={!!ativando}
                style={{ flex: 2, padding: "9px", borderRadius: 8, border: "none", background: ativando ? "rgba(37,99,235,0.3)" : "#2563EB", color: "#fff", fontSize: 13, fontWeight: 700, cursor: ativando ? "default" : "pointer" }}
              >
                {ativando ? "Ativando…" : `Confirmar — ${periodoAtivacao}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
