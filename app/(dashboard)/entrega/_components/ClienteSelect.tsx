"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import { inputStyle } from "@/lib/styles";
import { gerarSenhaAcesso } from "@/lib/utils";
import type { Cliente } from "@/lib/supabase/types";

// ── Modal criar novo cliente ─────────────────────────────────────────────────
function ModalNovoCliente({
  onCriado,
  onFechar,
}: {
  onCriado: (c: Cliente) => void;
  onFechar: () => void;
}) {
  const { fotografo } = useFotografo();
  const [nome,     setNome]     = useState("");
  const [email,    setEmail]    = useState("");
  const [telefone, setTelefone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [saving,   setSaving]   = useState(false);
  const [erro,     setErro]     = useState("");

  async function handleSalvar() {
    if (!nome.trim() || !fotografo) return;
    setSaving(true);
    setErro("");
    const supabase = createClient();
    const { data, error } = await supabase
      .from("clientes")
      .insert({
        fotografo_id:  fotografo.id,
        nome:          nome.trim(),
        email:         email.trim() || null,
        telefone:      telefone.trim() || null,
        whatsapp:      whatsapp.trim() || telefone.trim() || null,
        senha_acesso:  gerarSenhaAcesso(),
      })
      .select()
      .single();
    if (error || !data) {
      setErro("Erro ao salvar cliente. Tente novamente.");
      setSaving(false);
      return;
    }
    onCriado(data);
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 60,
      }}
      onClick={onFechar}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--color-background-primary)",
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: 14, padding: "28px 30px", width: 400,
          boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
        }}
      >
        <h3 style={{ margin: "0 0 18px", fontSize: 15, fontWeight: 700, color: "var(--color-text-primary)" }}>
          Novo cliente
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 5 }}>
              Nome *
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome completo"
              autoFocus
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 5 }}>
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="cliente@email.com"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 5 }}>
              Telefone
            </label>
            <input
              type="tel"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="(11) 3333-0000"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 5 }}>
              WhatsApp
            </label>
            <input
              type="tel"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="(11) 99999-0000"
              style={inputStyle}
            />
            <p style={{ margin: "3px 0 0", fontSize: 11, color: "var(--color-text-secondary)" }}>
              Se igual ao telefone, deixe em branco.
            </p>
          </div>

          {erro && (
            <div style={{ fontSize: 12, color: "#EF4444", padding: "8px 12px", background: "rgba(239,68,68,0.07)", borderRadius: 7 }}>
              {erro}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          <button
            onClick={onFechar}
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
            onClick={handleSalvar}
            disabled={saving || !nome.trim()}
            style={{
              flex: 2, padding: "9px", borderRadius: 8, border: "none",
              background: saving || !nome.trim() ? "var(--color-background-secondary)" : "var(--color-text-primary)",
              color: saving || !nome.trim() ? "var(--color-text-secondary)" : "var(--color-background-primary)",
              fontSize: 13, fontWeight: 600,
              cursor: saving || !nome.trim() ? "default" : "pointer",
            }}
          >
            {saving ? "Salvando…" : "Salvar e selecionar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Componente ClienteSelect ─────────────────────────────────────────────────
export function ClienteSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string, cliente: Cliente | null) => void;
}) {
  const { fotografo } = useFotografo();
  const [clientes,    setClientes]    = useState<Cliente[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [modalAberto, setModalAberto] = useState(false);

  useEffect(() => {
    if (!fotografo) return;
    const supabase = createClient();
    supabase
      .from("clientes")
      .select("*")
      .eq("fotografo_id", fotografo.id)
      .order("nome")
      .then(({ data }) => {
        setClientes(data ?? []);
        setLoading(false);
      });
  }, [fotografo]);

  function handleClienteCriado(c: Cliente) {
    setClientes((prev) => [...prev, c].sort((a, b) => a.nome.localeCompare(b.nome)));
    onChange(c.id, c);
    setModalAberto(false);
  }

  const clienteSelecionado = clientes.find((c) => c.id === value) ?? null;

  return (
    <>
      <div style={{ display: "flex", gap: 7 }}>
        <select
          value={value}
          onChange={(e) => {
            const c = clientes.find((c) => c.id === e.target.value) ?? null;
            onChange(e.target.value, c);
          }}
          disabled={loading}
          style={{ ...inputStyle, flex: 1 }}
        >
          <option value="">
            {loading ? "Carregando clientes…" : "Selecionar cliente…"}
          </option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setModalAberto(true)}
          title="Adicionar novo cliente"
          style={{
            padding: "0 14px", borderRadius: 8,
            border: "0.5px solid var(--color-border-secondary)",
            background: "var(--color-background-secondary)",
            color: "var(--color-text-primary)",
            fontSize: 18, fontWeight: 400, cursor: "pointer",
            flexShrink: 0, height: 38,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          +
        </button>
      </div>

      {/* Info do cliente selecionado */}
      {clienteSelecionado && (
        <div style={{
          marginTop: 7, fontSize: 12, color: "var(--color-text-secondary)",
          display: "flex", gap: 12,
        }}>
          {clienteSelecionado.email && <span>✉ {clienteSelecionado.email}</span>}
          {clienteSelecionado.telefone && <span>📱 {clienteSelecionado.telefone}</span>}
        </div>
      )}

      {modalAberto && (
        <ModalNovoCliente
          onCriado={handleClienteCriado}
          onFechar={() => setModalAberto(false)}
        />
      )}
    </>
  );
}
