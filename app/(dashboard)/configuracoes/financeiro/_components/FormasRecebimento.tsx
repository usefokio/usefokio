"use client";

// Configurações › Financeiro › Formas de recebimento (antes: aba "Pagamentos (Asaas)" do /config).
// Asaas (chave cifrada, confirmação por código no e-mail) e PIX manual — movido sem mudar o comportamento.
import { useEffect, useState } from "react";
import { useFotografo } from "@/lib/context/FotografoContext";
import { inputStyle } from "@/lib/styles";
import { validarChavePix } from "@/lib/pix/validarChave";

// ── Pagamentos (Asaas) ────────────────────────────────────────────────────────
function mascarEmail(email: string) {
  const [user, domain] = email.split("@");
  return `${user[0]}***@${domain}`;
}

export function FormasRecebimento() {
  const { fotografo, reload } = useFotografo();
  const [apiKey,       setApiKey]       = useState("");
  const [ambiente,     setAmbiente]     = useState<"producao" | "sandbox">("producao");
  const [salvando,     setSalvando]     = useState(false);
  const [erro,         setErro]         = useState("");
  const [contaNome,    setContaNome]    = useState<string | null>(null);
  const [webhookMsg,   setWebhookMsg]   = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [regWebhook,   setRegWebhook]   = useState(false);

  // PIX manual
  const [pixChave,    setPixChave]    = useState(fotografo?.pix_chave ?? "");
  const [pixTipo,     setPixTipo]     = useState(fotografo?.pix_tipo ?? "aleatoria");
  const [pixAtivo,    setPixAtivo]    = useState(fotografo?.pix_ativo ?? false);
  const [revelacaoPixManual, setRevelacaoPixManual] = useState(fotografo?.revelacao_pix_manual ?? false);
  const [pixSalvando, setPixSalvando] = useState(false);
  const [pixMsg,      setPixMsg]      = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  // Modal de confirmação OTP
  const [confirmModal, setConfirmModal] = useState<{
    action: "asaas_key" | "pix_key";
    confirmationId: string;
    emailMascarado: string;
    tentativasRestantes: number;
  } | null>(null);
  const [confirmCode,  setConfirmCode]  = useState("");
  const [confirmErro,  setConfirmErro]  = useState<string | null>(null);
  const [confirmando,  setConfirmando]  = useState(false);

  useEffect(() => {
    if (fotografo) {
      setPixChave(fotografo.pix_chave ?? "");
      setPixTipo(fotografo.pix_tipo ?? "aleatoria");
      setPixAtivo(fotografo.pix_ativo ?? false);
      setRevelacaoPixManual(fotografo.revelacao_pix_manual ?? false);
    }
  }, [fotografo]);

  async function solicitarConfirmacao(action: "asaas_key" | "pix_key", payload: Record<string, unknown>) {
    const res = await fetch("/api/config/solicitar-confirmacao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...payload }),
    });
    const json = await res.json();
    if (!res.ok) return { erro: json.erro ?? "Erro ao enviar código." };
    return { confirmationId: json.confirmationId, emailMascarado: json.emailMascarado };
  }

  async function confirmarOTP() {
    if (!confirmModal || !confirmCode.trim()) return;
    setConfirmando(true);
    setConfirmErro(null);
    const res = await fetch("/api/config/confirmar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmationId: confirmModal.confirmationId, code: confirmCode.trim() }),
    });
    const json = await res.json();
    setConfirmando(false);
    if (res.ok) {
      if (confirmModal.action === "asaas_key") { setApiKey(""); setContaNome(null); }
      if (confirmModal.action === "pix_key") setPixMsg({ tipo: "ok", texto: "Configuração PIX salva!" });
      setConfirmModal(null);
      setConfirmCode("");
      await reload();
    } else {
      const erros: Record<string, string> = {
        codigo_invalido:    `Código incorreto. ${json.tentativas_restantes ?? 0} tentativa(s) restante(s).`,
        codigo_expirado:    "Código expirado. Clique em Reenviar para gerar um novo.",
        codigo_ja_usado:    "Código já utilizado.",
        limite_tentativas:  "Limite de tentativas atingido. Feche e inicie novamente.",
      };
      setConfirmErro(erros[json.erro] ?? json.erro ?? "Erro ao confirmar.");
      if (json.tentativas_restantes !== undefined) {
        setConfirmModal(prev => prev ? { ...prev, tentativasRestantes: json.tentativas_restantes } : null);
      }
    }
  }

  async function reenviarCodigo() {
    if (!confirmModal) return;
    setConfirmErro(null);
    setConfirmCode("");
    const payload = confirmModal.action === "asaas_key"
      ? { apiKey: apiKey.trim(), ambiente }
      : { pix_chave: pixChave, pix_tipo: pixTipo, pix_ativo: pixAtivo, revelacao_pix_manual: revelacaoPixManual };
    const result = await solicitarConfirmacao(confirmModal.action, payload);
    if ("erro" in result) {
      if (result.erro === "aguarde_reenvio") setConfirmErro("Aguarde 1 minuto antes de reenviar.");
      else setConfirmErro(result.erro ?? "Erro ao reenviar.");
    } else {
      setConfirmModal(prev => prev ? { ...prev, confirmationId: result.confirmationId!, tentativasRestantes: 5 } : null);
    }
  }

  async function salvarPix() {
    setPixMsg(null);
    if (pixAtivo || revelacaoPixManual) {
      const erroChave = validarChavePix(pixTipo, pixChave);
      if (erroChave) { setPixMsg({ tipo: "erro", texto: erroChave }); return; }
    }
    setPixSalvando(true);
    // Desativar (nos dois usos) não exige confirmação; em dev também salvamos direto (não há email
    // real para o OTP — a confirmação por email protege contas reais apenas em produção).
    if (!(pixAtivo || revelacaoPixManual) || process.env.NODE_ENV === "development") {
      const res = await fetch("/api/config/pix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pix_chave: pixChave, pix_tipo: pixTipo, pix_ativo: pixAtivo, revelacao_pix_manual: revelacaoPixManual }),
      });
      const json = await res.json();
      setPixSalvando(false);
      if (json.ok) { setPixMsg({ tipo: "ok", texto: (pixAtivo || revelacaoPixManual) ? "Configuração PIX salva!" : "PIX desativado." }); await reload(); }
      else setPixMsg({ tipo: "erro", texto: json.erro ?? "Erro ao salvar." });
      return;
    }
    // Ativar ou alterar chave PIX (renovação ou revelação) requer confirmação por email (produção)
    const result = await solicitarConfirmacao("pix_key", { pix_chave: pixChave, pix_tipo: pixTipo, pix_ativo: pixAtivo, revelacao_pix_manual: revelacaoPixManual });
    setPixSalvando(false);
    if ("erro" in result) { setPixMsg({ tipo: "erro", texto: result.erro ?? "Erro." }); return; }
    setConfirmCode("");
    setConfirmErro(null);
    setConfirmModal({ action: "pix_key", confirmationId: result.confirmationId!, emailMascarado: result.emailMascarado!, tentativasRestantes: 5 });
  }

  const conectado = fotografo?.asaas_ativo ?? false;

  async function registrarWebhook() {
    setRegWebhook(true);
    setWebhookMsg(null);
    const res = await fetch("/api/asaas/webhook/registrar", { method: "POST" });
    const json = await res.json();
    setRegWebhook(false);
    if (json.ok) setWebhookMsg({ tipo: "ok", texto: "Webhook registrado com sucesso! Pagamentos serão atualizados automaticamente." });
    else setWebhookMsg({ tipo: "erro", texto: json.erro ?? "Erro ao registrar webhook." });
  }

  async function conectar() {
    if (!apiKey.trim()) { setErro("Cole sua API key do Asaas."); return; }
    setSalvando(true);
    setErro("");
    // Em dev conecta direto (sem OTP por email); em produção passa pela confirmação.
    if (process.env.NODE_ENV === "development") {
      const res = await fetch("/api/asaas/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: apiKey.trim(), ambiente }),
      });
      const json = await res.json();
      setSalvando(false);
      if (!res.ok) { setErro(json.erro ?? "Erro ao validar chave."); return; }
      setApiKey(""); setContaNome(null);
      await reload();
      return;
    }
    const result = await solicitarConfirmacao("asaas_key", { apiKey: apiKey.trim(), ambiente });
    setSalvando(false);
    if ("erro" in result) { setErro(result.erro ?? "Erro ao validar chave."); return; }
    setConfirmCode("");
    setConfirmErro(null);
    setConfirmModal({ action: "asaas_key", confirmationId: result.confirmationId!, emailMascarado: result.emailMascarado!, tentativasRestantes: 5 });
  }

  async function desconectar() {
    if (!confirm("Desconectar sua conta Asaas? Clientes não poderão mais pagar renovações online.")) return;
    setSalvando(true);
    await fetch("/api/asaas/config", { method: "DELETE" });
    setContaNome(null);
    await reload();
    setSalvando(false);
  }

  return (
    <div>
      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 0, marginBottom: 24, lineHeight: 1.6 }}>
        Conecte sua conta <strong>Asaas</strong> para receber pagamentos de renovação de acesso das galerias de entrega.
        O pagamento vai direto para a sua conta — o UseFokio não fica com nenhuma taxa.
      </p>

      {conectado ? (
        <div style={{ background: "rgba(16,185,129,0.06)", border: "0.5px solid rgba(16,185,129,0.3)", borderRadius: 12, padding: "18px 22px", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: 16 }}>✅</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#059669" }}>
              Conta Asaas conectada{contaNome ? ` — ${contaNome}` : ""}
            </span>
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: fotografo?.asaas_ambiente === "sandbox" ? "rgba(245,158,11,0.12)" : "rgba(37,99,235,0.10)", color: fotografo?.asaas_ambiente === "sandbox" ? "#B45309" : "#2563EB" }}>
              {fotografo?.asaas_ambiente === "sandbox" ? "SANDBOX" : "PRODUÇÃO"}
            </span>
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 14 }}>
            Suas galerias com taxa de renovação já aceitam pagamento online (Pix, boleto e cartão).
          </div>
          {webhookMsg && (
            <div style={{ marginBottom: 12, padding: "9px 12px", borderRadius: 8, fontSize: 12, fontWeight: 500,
              background: webhookMsg.tipo === "ok" ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
              color: webhookMsg.tipo === "ok" ? "#059669" : "#DC2626",
              border: `0.5px solid ${webhookMsg.tipo === "ok" ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
            }}>
              {webhookMsg.texto}
            </div>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={registrarWebhook} disabled={regWebhook} style={{ padding: "8px 16px", borderRadius: 8, border: "0.5px solid rgba(37,99,235,0.3)", background: "rgba(37,99,235,0.05)", fontSize: 12, fontWeight: 600, color: "#2563EB", cursor: regWebhook ? "default" : "pointer" }}>
              {regWebhook ? "Registrando…" : "🔗 Registrar webhook"}
            </button>
            <button onClick={desconectar} disabled={salvando} style={{ padding: "8px 16px", borderRadius: 8, border: "0.5px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.05)", fontSize: 12, fontWeight: 600, color: "#DC2626", cursor: "pointer" }}>
              Desconectar conta
            </button>
          </div>
        </div>
      ) : (
        <div style={{ border: "0.5px solid var(--color-border-secondary)", borderRadius: 12, padding: "20px 22px", marginBottom: 24 }}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", display: "block", marginBottom: 6 }}>API Key do Asaas</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="$aact_..."
              style={{ ...inputStyle, width: "100%", boxSizing: "border-box", fontFamily: "monospace" }}
            />
            <p style={{ fontSize: 11, color: "var(--color-text-secondary)", margin: "5px 0 0", lineHeight: 1.5 }}>
              Gere em: painel Asaas → Configurações → Integrações → <strong>Chave de API</strong>. A chave é armazenada criptografada.
            </p>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", display: "block", marginBottom: 6 }}>Ambiente</label>
            <select value={ambiente} onChange={(e) => setAmbiente(e.target.value as "producao" | "sandbox")} style={{ ...inputStyle, width: 220 }}>
              <option value="producao">Produção (asaas.com)</option>
              <option value="sandbox">Sandbox (testes)</option>
            </select>
          </div>
          {erro && <div style={{ fontSize: 12, color: "#EF4444", marginBottom: 12 }}>{erro}</div>}
          <button onClick={conectar} disabled={salvando} style={{ padding: "10px 24px", borderRadius: 8, border: "none", background: salvando ? "#93C5FD" : "#2563EB", color: "#fff", fontSize: 13, fontWeight: 700, cursor: salvando ? "not-allowed" : "pointer" }}>
            {salvando ? "Validando…" : "Conectar conta Asaas"}
          </button>
        </div>
      )}

      {/* PIX manual */}
      <div style={{ borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: 20, marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 4 }}>💸 PIX manual (chave própria)</div>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 16px", lineHeight: 1.6 }}>
          O cliente recebe sua chave PIX e paga diretamente para você. Zero taxas de gateway. Confirmação manual no painel.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={pixAtivo} onChange={(e) => setPixAtivo(e.target.checked)} style={{ width: 16, height: 16, cursor: "pointer" }} />
            Ativar PIX manual (renovação de acesso)
          </label>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={revelacaoPixManual} onChange={(e) => setRevelacaoPixManual(e.target.checked)} style={{ width: 16, height: 16, cursor: "pointer" }} />
            Usar PIX manual para pedidos de Revelação
          </label>
        </div>
        <p style={{ fontSize: 11, color: "var(--color-text-secondary)", margin: "-4px 0 14px", lineHeight: 1.5 }}>
          Independente da opção acima — a renovação de acesso continua pelo Asaas. Marque só esta se
          quiser que os pedidos de revelação (impressão física) sejam pagos via PIX direto pra sua conta.
        </p>
        {(pixAtivo || revelacaoPixManual) && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", display: "block", marginBottom: 5 }}>Tipo de chave</label>
              <select value={pixTipo} onChange={(e) => setPixTipo(e.target.value)} style={{ ...inputStyle, width: 220 }}>
                <option value="aleatoria">Chave aleatória</option>
                <option value="email">E-mail</option>
                <option value="cpf">CPF</option>
                <option value="cnpj">CNPJ</option>
                <option value="telefone">Telefone</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", display: "block", marginBottom: 5 }}>Chave PIX</label>
              <input value={pixChave} onChange={(e) => setPixChave(e.target.value)} placeholder="Cole sua chave PIX aqui" style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} />
            </div>
            {revelacaoPixManual && !pixChave.trim() && (
              <div style={{ fontSize: 12, color: "#B45309", background: "rgba(217,119,6,0.08)", border: "0.5px solid rgba(217,119,6,0.3)", borderRadius: 8, padding: "8px 12px" }}>
                Preencha a chave PIX acima para os pedidos de revelação poderem ser fechados.
              </div>
            )}
          </div>
        )}
        {pixMsg && (
          <div style={{ marginBottom: 12, padding: "9px 12px", borderRadius: 8, fontSize: 12, fontWeight: 500,
            background: pixMsg.tipo === "ok" ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
            color: pixMsg.tipo === "ok" ? "#059669" : "#DC2626",
            border: `0.5px solid ${pixMsg.tipo === "ok" ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
          }}>
            {pixMsg.texto}
          </div>
        )}
        <button onClick={salvarPix} disabled={pixSalvando} style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: pixSalvando ? "#6B7280" : "#111", color: "#fff", fontSize: 13, fontWeight: 600, cursor: pixSalvando ? "default" : "pointer" }}>
          {pixSalvando ? "Salvando…" : "Salvar configuração PIX"}
        </button>
      </div>

      {/* Modal de confirmação OTP */}
      {confirmModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 500 }}
          onClick={(e) => { if (e.target === e.currentTarget) { setConfirmModal(null); setConfirmCode(""); setConfirmErro(null); } }}
        >
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 16, padding: "32px 36px", width: 420, maxWidth: "92vw", boxShadow: "0 24px 64px rgba(0,0,0,0.22)" }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>🔐</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 6 }}>Confirmação de segurança</div>
            <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 24, lineHeight: 1.6 }}>
              Enviamos um código de 6 dígitos para <strong>{confirmModal.emailMascarado}</strong>. Digite-o abaixo para confirmar a alteração.
            </div>

            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={confirmCode}
              onChange={(e) => { setConfirmCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setConfirmErro(null); }}
              onKeyDown={(e) => { if (e.key === "Enter" && confirmCode.length === 6) confirmarOTP(); }}
              placeholder="000000"
              autoFocus
              style={{ ...inputStyle, width: "100%", boxSizing: "border-box", fontSize: 24, fontWeight: 700, letterSpacing: "0.2em", textAlign: "center", marginBottom: 8 }}
            />

            {confirmErro && (
              <div style={{ fontSize: 12, color: "#DC2626", marginBottom: 12, padding: "8px 12px", background: "rgba(239,68,68,0.06)", border: "0.5px solid rgba(239,68,68,0.25)", borderRadius: 8 }}>
                {confirmErro}
              </div>
            )}

            <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 20 }}>
              Código válido por 15 minutos.
              {confirmModal.tentativasRestantes < 5 && (
                <span style={{ color: "#D97706" }}> {confirmModal.tentativasRestantes} tentativa(s) restante(s).</span>
              )}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={confirmarOTP}
                disabled={confirmando || confirmCode.length !== 6}
                style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: confirmando || confirmCode.length !== 6 ? "var(--color-background-secondary)" : "#111", color: confirmando || confirmCode.length !== 6 ? "var(--color-text-secondary)" : "#fff", fontSize: 13, fontWeight: 700, cursor: confirmando || confirmCode.length !== 6 ? "default" : "pointer" }}
              >
                {confirmando ? "Confirmando…" : "Confirmar"}
              </button>
              <button
                onClick={() => { setConfirmModal(null); setConfirmCode(""); setConfirmErro(null); }}
                style={{ padding: "10px 16px", borderRadius: 8, background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-secondary)", color: "var(--color-text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >
                Cancelar
              </button>
            </div>

            <div style={{ textAlign: "center", marginTop: 16 }}>
              <button
                onClick={reenviarCodigo}
                style={{ background: "none", border: "none", color: "var(--color-text-secondary)", fontSize: 12, cursor: "pointer", textDecoration: "underline" }}
              >
                Não recebeu? Reenviar código
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
