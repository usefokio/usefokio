"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import type { Fotografo } from "@/lib/supabase/types";
import { Field } from "@/components/ui/Field";
import { inputStyle } from "@/lib/styles";

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
    </div>
  );
}
