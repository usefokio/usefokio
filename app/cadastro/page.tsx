"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/Field";
import { inputStyle } from "@/lib/styles";
import { createClient } from "@/lib/supabase/client";

// ── Ícone do Google ───────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
    </svg>
  );
}

type Form = {
  email: string;
  senha: string;
  confirmarSenha: string;
  nomeCompleto: string;
  telefone: string;
  whatsapp: string;
  nomeEmpresa: string;
  cep: string;
  rua: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  instagram: string;
  facebook: string;
  tiktok: string;
  youtube: string;
  site: string;
  aceitaEmails: boolean;
  aceitaTermos: boolean;
};

const ESTADOS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS",
  "MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC",
  "SP","SE","TO",
];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ gridColumn: "1 / -1", borderBottom: "0.5px solid var(--color-border-tertiary)", paddingBottom: 10, marginTop: 8 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {children}
      </span>
    </div>
  );
}

function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: React.ReactNode }) {
  return (
    <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
      <div
        onClick={onChange}
        style={{
          width: 17, height: 17, borderRadius: 4, flexShrink: 0, marginTop: 1,
          border: checked ? "none" : "1.5px solid var(--color-border-secondary)",
          background: checked ? "#2563EB" : "var(--color-background-secondary)",
          display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
        }}
      >
        {checked && <span style={{ color: "#fff", fontSize: 10, fontWeight: 700 }}>✓</span>}
      </div>
      <span style={{ fontSize: 13, color: "var(--color-text-primary)", lineHeight: 1.5 }}>{label}</span>
    </label>
  );
}

export default function CadastroPage() {
  const router = useRouter();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [form, setForm] = useState<Form>({
    email: "", senha: "", confirmarSenha: "",
    nomeCompleto: "", telefone: "", whatsapp: "",
    nomeEmpresa: "",
    cep: "", rua: "", numero: "", complemento: "", bairro: "", cidade: "", estado: "",
    instagram: "", facebook: "", tiktok: "", youtube: "", site: "",
    aceitaEmails: false, aceitaTermos: false,
  });
  const [errors, setErrors]   = useState<Partial<Record<keyof Form, string>>>({});
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState("");

  const upd = (k: keyof Form, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleGoogle = async () => {
    setGoogleLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
    if (error) {
      setGlobalError("Erro ao conectar com o Google: " + error.message);
      setGoogleLoading(false);
    }
  };

  const validate = () => {
    const e: Partial<Record<keyof Form, string>> = {};
    if (!form.nomeCompleto.trim()) e.nomeCompleto    = "Campo obrigatório";
    if (!form.email.trim())        e.email           = "Campo obrigatório";
    if (!form.senha)               e.senha           = "Campo obrigatório";
    if (form.senha.length < 8)     e.senha           = "Mínimo 8 caracteres";
    if (form.senha !== form.confirmarSenha) e.confirmarSenha = "Senhas não coincidem";
    if (!form.nomeEmpresa.trim())  e.nomeEmpresa     = "Campo obrigatório";
    if (!form.aceitaTermos)        e.aceitaTermos    = "Você precisa aceitar os termos";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    setGlobalError("");

    const supabase = createClient();

    // 1. Cria o usuário no Supabase Auth (confirma email automaticamente em dev)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.senha,
      options: {
        // emailRedirectTo é usado quando a confirmação de email estiver ativa
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: { nome_completo: form.nomeCompleto, nome_empresa: form.nomeEmpresa },
      },
    });

    if (authError) {
      setGlobalError(authError.message === "User already registered"
        ? "Este email já está cadastrado."
        : authError.message);
      setLoading(false);
      return;
    }

    const userId = authData.user?.id;
    if (!userId) {
      setGlobalError("Erro ao criar usuário. Tente novamente.");
      setLoading(false);
      return;
    }

    // 2. Salva o perfil — só se a sessão já está disponível (sem confirmação de email)
    // Se email confirmation está ativa, authData.session é null e auth.uid() seria null na RPC.
    // Nesse caso, o auth/callback cria o perfil automaticamente ao confirmar o email.
    if (authData.session) {
      const { error: profileError } = await supabase.rpc("criar_perfil_fotografo", {
        p_nome_completo: form.nomeCompleto,
        p_nome_empresa:  form.nomeEmpresa,
        p_email:         form.email,
        p_telefone:      form.telefone    || null,
        p_whatsapp:      form.whatsapp    || null,
        p_cep:           form.cep         || null,
        p_rua:           form.rua         || null,
        p_numero:        form.numero      || null,
        p_complemento:   form.complemento || null,
        p_bairro:        form.bairro      || null,
        p_cidade:        form.cidade      || null,
        p_estado:        form.estado      || null,
        p_instagram:     form.instagram   || null,
        p_facebook:      form.facebook    || null,
        p_tiktok:        form.tiktok      || null,
        p_youtube:       form.youtube     || null,
        p_site:          form.site        || null,
        p_aceita_emails: form.aceitaEmails,
      });

      if (profileError) {
        setGlobalError("Conta criada, mas erro ao salvar perfil: " + profileError.message);
        setLoading(false);
        return;
      }
    }

    // 3. Notifica webmaster sobre novo cadastro (fire-and-forget, não bloqueia)
    fetch("/api/email/novo-fotografo", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nomeCompleto: form.nomeCompleto,
        nomeEmpresa:  form.nomeEmpresa,
        email:        form.email,
      }),
    }).catch(() => { /* silencioso — não impede o fluxo */ });

    // 4. Redireciona — para confirmação de email quando ativa, senão para aguardando aprovação
    const emailPendente = authData.user?.identities?.[0]?.identity_data?.email_verified === false;
    if (emailPendente) {
      router.push("/cadastro/confirmar-email?email=" + encodeURIComponent(form.email));
    } else {
      router.push("/aguardando-aprovacao");
    }
  };

  const inp = (k: keyof Form, placeholder = "", type = "text", optional = false) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <input
        type={type}
        value={form[k] as string}
        onChange={(e) => upd(k, e.target.value)}
        placeholder={optional ? `${placeholder} (opcional)` : placeholder}
        style={{ ...inputStyle, borderColor: errors[k] ? "#EF4444" : undefined }}
      />
      {errors[k] && <span style={{ fontSize: 11, color: "#EF4444" }}>{errors[k]}</span>}
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-background-tertiary)", fontFamily: "var(--font-sans)" }}>

      {/* Header */}
      <nav style={{ background: "var(--color-background-primary)", borderBottom: "0.5px solid var(--color-border-tertiary)", padding: "0 32px", height: 54, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/landing" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
          <img src="/usefokio-logo.svg" alt="UseFokio" style={{ height: 24, width: "auto", display: "block" }} />
        </Link>
        <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
          Já tem conta?{" "}
          <Link href="/login" style={{ color: "#2563EB", fontWeight: 600, textDecoration: "none" }}>Entrar</Link>
        </span>
      </nav>

      {/* Form */}
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px 80px" }}>
        <div style={{ marginBottom: 32, textAlign: "center" }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--color-text-primary)", margin: "0 0 8px", letterSpacing: "-0.03em" }}>
            Crie sua conta grátis
          </h1>
          <p style={{ fontSize: 14, color: "var(--color-text-secondary)", margin: 0 }}>
            Preencha os dados abaixo para começar a usar o UseFokio
          </p>
        </div>

        {/* ── Cadastro rápido com Google ── */}
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 14, padding: "22px 28px", marginBottom: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 14px", textAlign: "center" }}>
            Cadastro rápido
          </p>
          <button
            onClick={handleGoogle}
            disabled={googleLoading}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              padding: "11px", borderRadius: 8,
              border: "0.5px solid var(--color-border-secondary)",
              background: "var(--color-background-primary)",
              color: "var(--color-text-primary)",
              fontSize: 13, fontWeight: 600,
              cursor: googleLoading ? "not-allowed" : "pointer",
              opacity: googleLoading ? 0.7 : 1,
            }}
          >
            {googleLoading ? (
              <span style={{ width: 18, height: 18, border: "2px solid #ccc", borderTopColor: "#555", borderRadius: "50%", display: "inline-block", animation: "spin 0.6s linear infinite" }} />
            ) : <GoogleIcon />}
            {googleLoading ? "Redirecionando…" : "Criar conta com Google"}
          </button>
          <p style={{ fontSize: 11, color: "var(--color-text-secondary)", textAlign: "center", margin: "10px 0 0" }}>
            Seus dados do Google são importados automaticamente. Sem precisar preencher o formulário abaixo.
          </p>
        </div>

        {/* Divisor "ou preencha manualmente" */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1, height: "0.5px", background: "var(--color-border-tertiary)" }} />
          <span style={{ fontSize: 12, color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>ou preencha manualmente</span>
          <div style={{ flex: 1, height: "0.5px", background: "var(--color-border-tertiary)" }} />
        </div>

        {globalError && (
          <div style={{ background: "rgba(239,68,68,0.08)", border: "0.5px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "10px 16px", marginBottom: 16, fontSize: 13, color: "#EF4444", textAlign: "center" }}>
            {globalError}
          </div>
        )}

        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 14, padding: "28px 32px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

            <SectionTitle>Dados de acesso</SectionTitle>
            <div style={{ gridColumn: "1 / -1" }}>
              <Field label="Email *">{inp("email", "seu@email.com", "email")}</Field>
            </div>
            <Field label="Senha *">{inp("senha", "Mínimo 8 caracteres", "password")}</Field>
            <Field label="Confirmar senha *">{inp("confirmarSenha", "Repita a senha", "password")}</Field>

            <SectionTitle>Dados pessoais</SectionTitle>
            <div style={{ gridColumn: "1 / -1" }}>
              <Field label="Nome completo *">{inp("nomeCompleto", "Seu nome completo")}</Field>
            </div>
            <Field label="Telefone">{inp("telefone", "(00) 0000-0000", "tel", true)}</Field>
            <Field label="WhatsApp">{inp("whatsapp", "(00) 00000-0000", "tel", true)}</Field>

            <SectionTitle>Empresa / Estúdio</SectionTitle>
            <div style={{ gridColumn: "1 / -1" }}>
              <Field label="Nome da empresa ou estúdio *">{inp("nomeEmpresa", "Ex: Rafael Fotografia")}</Field>
            </div>

            <SectionTitle>Endereço</SectionTitle>
            <Field label="CEP">{inp("cep", "00000-000", "text", true)}</Field>
            <Field label="Estado">
              <select value={form.estado} onChange={(e) => upd("estado", e.target.value)} style={inputStyle}>
                <option value="">Selecione</option>
                {ESTADOS.map((uf) => <option key={uf}>{uf}</option>)}
              </select>
            </Field>
            <div style={{ gridColumn: "1 / -1" }}>
              <Field label="Rua / Avenida">{inp("rua", "Nome da rua", "text", true)}</Field>
            </div>
            <Field label="Número">{inp("numero", "Nº", "text", true)}</Field>
            <Field label="Complemento">{inp("complemento", "Apto, sala…", "text", true)}</Field>
            <Field label="Bairro">{inp("bairro", "Bairro", "text", true)}</Field>
            <Field label="Cidade">{inp("cidade", "Cidade", "text", true)}</Field>

            <SectionTitle>Redes sociais</SectionTitle>
            {(["instagram","facebook","tiktok","youtube"] as const).map((rede) => (
              <Field key={rede} label={rede.charAt(0).toUpperCase() + rede.slice(1)}>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "var(--color-text-secondary)", pointerEvents: "none" }}>@</span>
                  <input
                    value={form[rede]}
                    onChange={(e) => upd(rede, e.target.value)}
                    placeholder="seu.perfil (opcional)"
                    style={{ ...inputStyle, paddingLeft: 24 }}
                  />
                </div>
              </Field>
            ))}
            <div style={{ gridColumn: "1 / -1" }}>
              <Field label="Site / Portfólio">{inp("site", "https://seusite.com.br", "url", true)}</Field>
            </div>

            <SectionTitle>Preferências</SectionTitle>
            <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 12 }}>
              <Checkbox
                checked={form.aceitaEmails}
                onChange={() => upd("aceitaEmails", !form.aceitaEmails)}
                label="Quero receber novidades, dicas e ofertas exclusivas do UseFokio por email"
              />
              <Checkbox
                checked={form.aceitaTermos}
                onChange={() => upd("aceitaTermos", !form.aceitaTermos)}
                label={<>Li e aceito os <a href="#" style={{ color: "#2563EB", textDecoration: "none", fontWeight: 500 }}>Termos de Uso</a> e a <a href="#" style={{ color: "#2563EB", textDecoration: "none", fontWeight: 500 }}>Política de Privacidade</a> *</>}
              />
              {errors.aceitaTermos && (
                <span style={{ fontSize: 11, color: "#EF4444", marginTop: -4 }}>{errors.aceitaTermos}</span>
              )}
            </div>
          </div>

          <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 12 }}>
            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{ width: "100%", padding: "12px", borderRadius: 9, background: loading ? "#93C5FD" : "#2563EB", color: "#fff", border: "none", fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", letterSpacing: "-0.01em" }}
            >
              {loading ? "Criando conta…" : "Criar minha conta →"}
            </button>
            <p style={{ textAlign: "center", fontSize: 12, color: "var(--color-text-secondary)", margin: 0 }}>
              Grátis para sempre. Sem cartão de crédito.
            </p>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
