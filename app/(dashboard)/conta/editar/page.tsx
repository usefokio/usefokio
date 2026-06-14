"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import type { Fotografo } from "@/lib/supabase/types";
import { Field } from "@/components/ui/Field";
import { inputStyle } from "@/lib/styles";

const REQUISITOS_SENHA = [
  { id: "len",     label: "Mínimo 8 caracteres",           ok: (s: string) => s.length >= 8 },
  { id: "upper",   label: "Letra maiúscula (A–Z)",          ok: (s: string) => /[A-Z]/.test(s) },
  { id: "lower",   label: "Letra minúscula (a–z)",          ok: (s: string) => /[a-z]/.test(s) },
  { id: "number",  label: "Número (0–9)",                   ok: (s: string) => /[0-9]/.test(s) },
  { id: "special", label: "Caractere especial (!@#$%...)", ok: (s: string) => /[^A-Za-z0-9]/.test(s) },
] as const;

function calcularForcaSenha(s: string): 0 | 1 | 2 | 3 {
  if (!s) return 0;
  const n = REQUISITOS_SENHA.filter((r) => r.ok(s)).length;
  return n <= 2 ? 1 : n <= 3 ? 2 : 3;
}

const FORCA_COR = { 0: "transparent", 1: "#EF4444", 2: "#F59E0B", 3: "#10B981" } as const;
const FORCA_LABEL = { 0: "", 1: "Fraca", 2: "Média", 3: "Forte" } as const;

const ESTADOS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA",
  "MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN",
  "RS","RO","RR","SC","SP","SE","TO",
];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ gridColumn: "1 / -1", borderBottom: "0.5px solid var(--color-border-tertiary)", paddingBottom: 8, marginTop: 10 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {children}
      </span>
    </div>
  );
}

export default function EditarContaPage() {
  const router = useRouter();
  const { fotografo, loading: ctxLoading, reload } = useFotografo();

  const [form, setForm]     = useState<Partial<Fotografo>>({});
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError]   = useState("");

  // Senha
  const [novaSenha,      setNovaSenha]      = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [salvandoSenha,  setSalvandoSenha]  = useState(false);
  const [erroSenha,      setErroSenha]      = useState("");
  const [salvoSenha,     setSalvoSenha]     = useState(false);
  const [mostrarSenha,   setMostrarSenha]   = useState(false);
  const [mostrarConfirm, setMostrarConfirm] = useState(false);
  const [provedorGoogle, setProvedorGoogle] = useState(false);

  const forcaSenha    = calcularForcaSenha(novaSenha);
  const todosReqs     = REQUISITOS_SENHA.every((r) => r.ok(novaSenha));
  const senhasIguais  = novaSenha === confirmarSenha;

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      const ids = data.user?.identities ?? [];
      setProvedorGoogle(ids.some((i) => i.provider === "google") && !ids.some((i) => i.provider === "email"));
    });
  }, []);

  async function salvarSenha() {
    if (!novaSenha)       { setErroSenha("Informe a nova senha."); return; }
    if (!todosReqs)       { setErroSenha("A senha não atende todos os requisitos."); return; }
    if (!senhasIguais)    { setErroSenha("As senhas não coincidem."); return; }
    setSalvandoSenha(true); setErroSenha("");
    const { error: err } = await createClient().auth.updateUser({ password: novaSenha });
    setSalvandoSenha(false);
    if (err) { setErroSenha(err.message); return; }
    setNovaSenha(""); setConfirmarSenha("");
    setSalvoSenha(true); setTimeout(() => setSalvoSenha(false), 3000);
  }

  // Preenche o formulário assim que o contexto tiver os dados
  useEffect(() => {
    if (fotografo) setForm(fotografo);
  }, [fotografo]);

  const upd = (k: keyof Fotografo, v: string | boolean | null) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.id) return;
    setSaving(true);
    setError("");
    setSuccess(false);

    const supabase = createClient();
    const { error: err } = await supabase
      .from("fotografos")
      .update({
        nome_completo: form.nome_completo,
        nome_empresa:  form.nome_empresa,
        telefone:      form.telefone      || null,
        whatsapp:      form.whatsapp      || null,
        cep:           form.cep           || null,
        rua:           form.rua           || null,
        numero:        form.numero        || null,
        complemento:   form.complemento   || null,
        bairro:        form.bairro        || null,
        cidade:        form.cidade        || null,
        estado:        form.estado        || null,
        instagram:     form.instagram     || null,
        facebook:      form.facebook      || null,
        tiktok:        form.tiktok        || null,
        youtube:       form.youtube       || null,
        site:          form.site          || null,
        aceita_emails: form.aceita_emails ?? false,
        updated_at:    new Date().toISOString(),
      })
      .eq("id", form.id);

    setSaving(false);

    if (err) {
      setError(err.message);
    } else {
      setSuccess(true);
      await reload(); // atualiza o contexto global (sidebar, header, etc.)
      setTimeout(() => router.push("/conta"), 1200);
    }
  };

  if (ctxLoading) return (
    <div style={{ padding: "40px 30px", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>
  );

  if (!fotografo) return (
    <div style={{ padding: "40px 30px", fontSize: 13, color: "var(--color-text-secondary)" }}>Sessão expirada. <a href="/login" style={{ color: "#2563EB" }}>Fazer login</a></div>
  );

  const inp = (k: keyof Fotografo, placeholder = "", type = "text") => (
    <input
      type={type}
      value={(form[k] as string) ?? ""}
      onChange={(e) => upd(k, e.target.value)}
      placeholder={placeholder}
      style={inputStyle}
    />
  );

  return (
    <div style={{ padding: "26px 30px", maxWidth: 740 }}>

      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => router.back()}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 13, padding: 0 }}
          >
            ← Voltar
          </button>
          <span style={{ color: "var(--color-border-secondary)" }}>/</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>Editar dados</span>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: saving ? "#93C5FD" : "#2563EB", color: "#fff", fontSize: 13, fontWeight: 600, cursor: saving ? "default" : "pointer", flexShrink: 0 }}
        >
          {saving ? "Salvando…" : "Salvar"}
        </button>
      </div>

      {success && (
        <div style={{ background: "rgba(16,185,129,0.08)", border: "0.5px solid rgba(16,185,129,0.3)", borderRadius: 8, padding: "10px 16px", marginBottom: 16, fontSize: 13, color: "#059669" }}>
          ✓ Dados atualizados com sucesso! Redirecionando…
        </div>
      )}
      {error && (
        <div style={{ background: "rgba(239,68,68,0.08)", border: "0.5px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "10px 16px", marginBottom: 16, fontSize: 13, color: "#EF4444" }}>
          Erro ao salvar: {error}
        </div>
      )}

      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 14, padding: "28px 32px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

          {/* Dados pessoais */}
          <SectionTitle>Dados pessoais</SectionTitle>
          <div style={{ gridColumn: "1 / -1" }}>
            <Field label="Nome completo *">{inp("nome_completo", "Seu nome completo")}</Field>
          </div>
          <Field label="Telefone">{inp("telefone", "(00) 0000-0000", "tel")}</Field>
          <Field label="WhatsApp">{inp("whatsapp", "(00) 00000-0000", "tel")}</Field>

          {/* Empresa */}
          <SectionTitle>Empresa / Estúdio</SectionTitle>
          <div style={{ gridColumn: "1 / -1" }}>
            <Field label="Nome da empresa *">{inp("nome_empresa", "Ex: Rafael Fotografia")}</Field>
          </div>

          {/* Endereço */}
          <SectionTitle>Endereço</SectionTitle>
          <Field label="CEP">{inp("cep", "00000-000")}</Field>
          <Field label="Estado">
            <select
              value={form.estado ?? ""}
              onChange={(e) => upd("estado", e.target.value)}
              style={inputStyle}
            >
              <option value="">Selecione</option>
              {ESTADOS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
            </select>
          </Field>
          <div style={{ gridColumn: "1 / -1" }}>
            <Field label="Rua / Avenida">{inp("rua", "Nome da rua")}</Field>
          </div>
          <Field label="Número">{inp("numero", "Nº")}</Field>
          <Field label="Complemento">{inp("complemento", "Apto, sala…")}</Field>
          <Field label="Bairro">{inp("bairro", "Bairro")}</Field>
          <Field label="Cidade">{inp("cidade", "Cidade")}</Field>

          {/* Redes sociais */}
          <SectionTitle>Redes sociais</SectionTitle>
          {(["instagram", "facebook", "tiktok", "youtube"] as const).map((rede) => (
            <Field key={rede} label={rede.charAt(0).toUpperCase() + rede.slice(1)}>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "var(--color-text-secondary)", pointerEvents: "none" }}>@</span>
                <input
                  value={(form[rede] as string) ?? ""}
                  onChange={(e) => upd(rede, e.target.value)}
                  placeholder="seu.perfil"
                  style={{ ...inputStyle, paddingLeft: 24 }}
                />
              </div>
            </Field>
          ))}
          <div style={{ gridColumn: "1 / -1" }}>
            <Field label="Site / Portfólio">{inp("site", "https://seusite.com.br", "url")}</Field>
          </div>

          {/* Preferências */}
          <SectionTitle>Preferências</SectionTitle>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <div
                onClick={() => upd("aceita_emails", !form.aceita_emails)}
                style={{
                  width: 17, height: 17, borderRadius: 4, flexShrink: 0, cursor: "pointer",
                  border: form.aceita_emails ? "none" : "1.5px solid var(--color-border-secondary)",
                  background: form.aceita_emails ? "#2563EB" : "var(--color-background-secondary)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                {form.aceita_emails && <span style={{ color: "#fff", fontSize: 10, fontWeight: 700 }}>✓</span>}
              </div>
              <span style={{ fontSize: 13, color: "var(--color-text-primary)" }}>Receber novidades e ofertas por email</span>
            </label>
          </div>

        </div>

        {/* Ações */}
        <div style={{ marginTop: 28, display: "flex", gap: 10 }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: "10px 28px", borderRadius: 8,
              background: saving ? "#93C5FD" : "#2563EB",
              color: "#fff", border: "none", fontSize: 13,
              fontWeight: 700, cursor: saving ? "not-allowed" : "pointer",
              transition: "background 0.15s",
            }}
          >
            {saving ? "Salvando…" : "Salvar alterações"}
          </button>
          <button
            onClick={() => router.back()}
            style={{
              padding: "10px 18px", borderRadius: 8,
              background: "transparent",
              color: "var(--color-text-secondary)",
              border: "0.5px solid var(--color-border-secondary)",
              fontSize: 13, cursor: "pointer",
            }}
          >
            Cancelar
          </button>
        </div>
      </div>

      {/* Card de senha */}
      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 14, padding: "28px 32px", marginTop: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 4 }}>Alterar senha</div>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 20px", lineHeight: 1.6 }}>
          Altere sua senha de acesso ao UseFokio.
        </p>

        {provedorGoogle ? (
          <div style={{ background: "rgba(37,99,235,0.05)", border: "0.5px solid rgba(37,99,235,0.2)", borderRadius: 10, padding: "16px 20px", fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
            ℹ️ Sua conta usa login com o Google. Para alterar a senha, acesse as configurações da sua conta Google.
          </div>
        ) : (
          <div style={{ maxWidth: 420, display: "flex", flexDirection: "column", gap: 16 }}>
            {erroSenha && (
              <div style={{ background: "rgba(239,68,68,0.08)", border: "0.5px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#EF4444" }}>
                {erroSenha}
              </div>
            )}

            {/* Nova senha */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 6, display: "block" }}>
                Nova senha
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={mostrarSenha ? "text" : "password"}
                  value={novaSenha}
                  onChange={(e) => { setNovaSenha(e.target.value); setErroSenha(""); }}
                  placeholder="Digite sua nova senha"
                  style={{ ...inputStyle, paddingRight: 36 }}
                />
                <button type="button" onClick={() => setMostrarSenha((v) => !v)}
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "var(--color-text-secondary)", padding: 2 }}>
                  {mostrarSenha ? "🙈" : "👁"}
                </button>
              </div>

              {novaSenha && (
                <>
                  {/* Barra de força */}
                  <div style={{ display: "flex", gap: 4, marginTop: 10, marginBottom: 4 }}>
                    {([1, 2, 3] as const).map((n) => (
                      <div key={n} style={{ flex: 1, height: 4, borderRadius: 2, background: forcaSenha >= n ? FORCA_COR[forcaSenha] : "var(--color-border-secondary)", transition: "background 0.25s" }} />
                    ))}
                  </div>
                  {forcaSenha > 0 && (
                    <div style={{ fontSize: 11, fontWeight: 700, color: FORCA_COR[forcaSenha], marginBottom: 8 }}>{FORCA_LABEL[forcaSenha]}</div>
                  )}
                  {/* Requisitos */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {REQUISITOS_SENHA.map((r) => {
                      const ok = r.ok(novaSenha);
                      return (
                        <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12 }}>
                          <span style={{ fontSize: 11, color: ok ? "#10B981" : "var(--color-text-secondary)" }}>{ok ? "✓" : "○"}</span>
                          <span style={{ color: ok ? "#10B981" : "var(--color-text-secondary)", fontWeight: ok ? 600 : 400 }}>{r.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Confirmar senha */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 6, display: "block" }}>
                Confirmar nova senha
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={mostrarConfirm ? "text" : "password"}
                  value={confirmarSenha}
                  onChange={(e) => { setConfirmarSenha(e.target.value); setErroSenha(""); }}
                  onKeyDown={(e) => e.key === "Enter" && salvarSenha()}
                  placeholder="Repita a nova senha"
                  style={{
                    ...inputStyle, paddingRight: 36,
                    borderColor: confirmarSenha && !senhasIguais ? "rgba(239,68,68,0.6)" : confirmarSenha && senhasIguais ? "rgba(16,185,129,0.5)" : undefined,
                  }}
                />
                <button type="button" onClick={() => setMostrarConfirm((v) => !v)}
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "var(--color-text-secondary)", padding: 2 }}>
                  {mostrarConfirm ? "🙈" : "👁"}
                </button>
              </div>
              {confirmarSenha && !senhasIguais && <div style={{ fontSize: 11, color: "#EF4444", marginTop: 5 }}>As senhas não coincidem.</div>}
              {confirmarSenha && senhasIguais   && <div style={{ fontSize: 11, color: "#10B981", marginTop: 5 }}>✓ As senhas coincidem.</div>}
            </div>

            <button
              onClick={salvarSenha}
              disabled={salvandoSenha || !todosReqs || !senhasIguais || !novaSenha}
              style={{
                padding: "10px 28px", borderRadius: 9, width: "fit-content",
                background: salvoSenha ? "rgba(5,150,105,0.1)" : !todosReqs || !senhasIguais || !novaSenha ? "var(--color-border-secondary)" : "#2563EB",
                color: salvoSenha ? "#059669" : !todosReqs || !senhasIguais || !novaSenha ? "var(--color-text-secondary)" : "#fff",
                border: salvoSenha ? "0.5px solid rgba(5,150,105,0.4)" : "none",
                fontSize: 13, fontWeight: 700,
                cursor: salvandoSenha || !todosReqs || !senhasIguais || !novaSenha ? "not-allowed" : "pointer",
                transition: "all 0.2s",
              }}
            >
              {salvandoSenha ? "Salvando…" : salvoSenha ? "✓ Senha alterada!" : "Alterar senha"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
