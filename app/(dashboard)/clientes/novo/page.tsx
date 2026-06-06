"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import { gerarSenhaAcesso } from "@/lib/utils";
import { Field } from "@/components/ui/Field";
import { inputStyle } from "@/lib/styles";

export default function NovoClientePage() {
  const router = useRouter();
  const { fotografo } = useFotografo();

  const [nome, setNome]         = useState("");
  const [email, setEmail]       = useState("");
  const [telefone, setTelefone] = useState("");
  const [senha, setSenha]       = useState(gerarSenhaAcesso);  // gera ao montar
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");
  const [copiado, setCopiado]   = useState(false);

  const copiar = async () => {
    await navigator.clipboard.writeText(senha);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const handleSave = async () => {
    if (!nome.trim()) { setError("Nome é obrigatório."); return; }
    if (!fotografo)   { setError("Sessão expirada."); return; }

    setSaving(true);
    setError("");

    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("clientes")
      .insert({
        fotografo_id: fotografo.id,
        nome:         nome.trim(),
        email:        email.trim()    || null,
        telefone:     telefone.trim() || null,
        senha_acesso: senha,
      })
      .select()
      .single();

    setSaving(false);

    if (err) {
      setError(err.message);
    } else {
      router.push(`/clientes/${data.id}`);
    }
  };

  return (
    <div style={{ padding: "26px 30px", maxWidth: 520 }}>

      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
        <button
          onClick={() => router.back()}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 13, padding: 0 }}
        >
          ← Voltar
        </button>
        <span style={{ color: "var(--color-border-secondary)" }}>/</span>
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>Novo cliente</span>
      </div>

      {error && (
        <div style={{ background: "rgba(239,68,68,0.08)", border: "0.5px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "10px 16px", marginBottom: 16, fontSize: 13, color: "#EF4444" }}>
          {error}
        </div>
      )}

      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 14, padding: "28px 32px" }}>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 0, marginBottom: 22 }}>
          Preencha os dados básicos. O cliente usará a senha gerada para acessar as galerias.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          <Field label="Nome completo *">
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Maria Oliveira"
              style={inputStyle}
              autoFocus
            />
          </Field>

          <Field label="Email">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
              style={inputStyle}
            />
          </Field>

          <Field label="Telefone / WhatsApp">
            <input
              type="tel"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="(00) 00000-0000"
              style={inputStyle}
            />
          </Field>

          {/* Senha de acesso */}
          <Field label="Senha de acesso às galerias">
            <div style={{ display: "flex", gap: 8 }}>
              {/* Campo somente leitura mostrando a senha */}
              <div style={{
                ...inputStyle,
                flex: 1,
                display: "flex", alignItems: "center",
                fontFamily: "monospace", fontSize: 15,
                letterSpacing: "0.12em", fontWeight: 600,
                color: "var(--color-text-primary)",
                background: "var(--color-background-secondary)",
                userSelect: "all",
              }}>
                {senha}
              </div>
              {/* Botão regenerar */}
              <button
                type="button"
                onClick={() => setSenha(gerarSenhaAcesso())}
                title="Gerar nova senha"
                style={{
                  padding: "0 12px", borderRadius: 8,
                  border: "0.5px solid var(--color-border-secondary)",
                  background: "var(--color-background-secondary)",
                  cursor: "pointer", fontSize: 16, flexShrink: 0,
                  color: "var(--color-text-secondary)",
                }}
              >
                🔄
              </button>
              {/* Botão copiar */}
              <button
                type="button"
                onClick={copiar}
                title="Copiar senha"
                style={{
                  padding: "0 12px", borderRadius: 8,
                  border: "0.5px solid var(--color-border-secondary)",
                  background: copiado ? "rgba(16,185,129,0.1)" : "var(--color-background-secondary)",
                  cursor: "pointer", fontSize: 13, fontWeight: 600, flexShrink: 0,
                  color: copiado ? "#059669" : "var(--color-text-secondary)",
                  transition: "all 0.15s",
                }}
              >
                {copiado ? "✓ Copiado" : "Copiar"}
              </button>
            </div>
            <p style={{ fontSize: 11, color: "var(--color-text-secondary)", margin: "6px 0 0" }}>
              Gerada automaticamente. Anote ou copie antes de salvar — você poderá consultá-la depois na página do cliente.
            </p>
          </Field>

        </div>

        <div style={{ marginTop: 28, display: "flex", gap: 10 }}>
          <button
            onClick={handleSave}
            disabled={saving || !nome.trim()}
            style={{
              padding: "10px 28px", borderRadius: 8,
              background: saving || !nome.trim() ? "#93C5FD" : "#2563EB",
              color: "#fff", border: "none",
              fontSize: 13, fontWeight: 700,
              cursor: saving || !nome.trim() ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Salvando…" : "Cadastrar cliente"}
          </button>
          <button
            onClick={() => router.back()}
            style={{ padding: "10px 18px", borderRadius: 8, background: "transparent", color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-secondary)", fontSize: 13, cursor: "pointer" }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
