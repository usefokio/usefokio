"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchAllRows } from "@/lib/supabase/fetchAll";
import { useFotografo } from "@/lib/context/FotografoContext";
import { inputStyle } from "@/lib/styles";
import { gerarSenhaAcesso } from "@/lib/utils";
import { normalizar } from "@/lib/utils/normalizar";
import { mascaraTelefone } from "@/lib/utils/format";
import type { Cliente } from "@/lib/supabase/types";
import { DropdownPortal } from "./DropdownPortal";

// ── Modal criar novo cliente ─────────────────────────────────────────────────
function ModalNovoCliente({
  onCriado,
  onFechar,
}: {
  onCriado: (c: Cliente) => void;
  onFechar: () => void;
}) {
  const { fotografo } = useFotografo();
  const [nome,       setNome]       = useState("");
  const [email,      setEmail]      = useState("");
  const [telefone,   setTelefone]   = useState("");
  const [whatsapp,   setWhatsapp]   = useState("");
  const [saving,     setSaving]     = useState(false);
  const [erro,       setErro]       = useState("");
  const [erroEmail,  setErroEmail]  = useState("");
  const [erroWpp,    setErroWpp]    = useState("");

  async function checkEmailDup() {
    if (!email.trim() || !fotografo) return;
    const { data: dup } = await createClient().from("clientes").select("id, nome")
      .eq("fotografo_id", fotografo.id).eq("email", email.trim()).maybeSingle();
    setErroEmail(dup ? `Email já cadastrado para "${(dup as { nome: string }).nome}"` : "");
  }

  async function checkWppDup() {
    if (!whatsapp.replace(/\D/g, "") || !fotografo) return;
    const { data: dup } = await createClient().from("clientes").select("id, nome")
      .eq("fotografo_id", fotografo.id).eq("whatsapp", whatsapp).maybeSingle();
    setErroWpp(dup ? `WhatsApp já cadastrado para "${(dup as { nome: string }).nome}"` : "");
  }

  async function handleSalvar() {
    if (!nome.trim() || !fotografo) return;
    if (erroEmail || erroWpp) return;
    setSaving(true);
    setErro("");
    const supabase = createClient();
    const fid = fotografo.id;
    if (email.trim()) {
      const { data: dup } = await supabase.from("clientes").select("id, nome")
        .eq("fotografo_id", fid).eq("email", email.trim()).maybeSingle();
      if (dup) { setErroEmail(`Email já cadastrado para "${(dup as { nome: string }).nome}"`); setSaving(false); return; }
    }
    if (whatsapp.replace(/\D/g, "")) {
      const { data: dup } = await supabase.from("clientes").select("id, nome")
        .eq("fotografo_id", fid).eq("whatsapp", whatsapp).maybeSingle();
      if (dup) { setErroWpp(`WhatsApp já cadastrado para "${(dup as { nome: string }).nome}"`); setSaving(false); return; }
    }
    const { data, error } = await supabase
      .from("clientes")
      .insert({
        fotografo_id:  fid,
        nome:          nome.trim(),
        email:         email.trim() || null,
        telefone:      telefone || null,
        whatsapp:      whatsapp || telefone || null,
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
              onChange={(e) => { setEmail(e.target.value); setErroEmail(""); }}
              onBlur={checkEmailDup}
              placeholder="cliente@email.com"
              style={{ ...inputStyle, borderColor: erroEmail ? "#EF4444" : undefined }}
            />
            {erroEmail && <p style={{ margin: "3px 0 0", fontSize: 11, color: "#EF4444" }}>{erroEmail}</p>}
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 5 }}>
              Telefone
            </label>
            <input
              type="tel"
              value={telefone}
              onChange={(e) => setTelefone(mascaraTelefone(e.target.value))}
              onPaste={(e) => { e.preventDefault(); setTelefone(mascaraTelefone(e.clipboardData.getData("text"))); }}
              placeholder="55 11 99999-9999"
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
              onChange={(e) => { setWhatsapp(mascaraTelefone(e.target.value)); setErroWpp(""); }}
              onPaste={(e) => { e.preventDefault(); setWhatsapp(mascaraTelefone(e.clipboardData.getData("text"))); setErroWpp(""); }}
              onBlur={checkWppDup}
              placeholder="55 11 99999-9999"
              style={{ ...inputStyle, borderColor: erroWpp ? "#EF4444" : undefined }}
            />
            {erroWpp
              ? <p style={{ margin: "3px 0 0", fontSize: 11, color: "#EF4444" }}>{erroWpp}</p>
              : <p style={{ margin: "3px 0 0", fontSize: 11, color: "var(--color-text-secondary)" }}>Se igual ao telefone, deixe em branco.</p>
            }
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
  const [busca,       setBusca]       = useState("");
  const [aberto,      setAberto]      = useState(false);
  const [foco,        setFoco]        = useState(-1);

  const inputRef    = useRef<HTMLInputElement>(null);
  const listaRef    = useRef<HTMLDivElement>(null);
  const wrapperRef  = useRef<HTMLDivElement>(null);
  const comboRef    = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!fotografo) return;
    const supabase = createClient();
    fetchAllRows<Cliente>(
      (sb, from, to) => sb.from("clientes").select("*").eq("fotografo_id", fotografo.id).order("nome").range(from, to),
      supabase,
    ).then((data) => {
      setClientes(data);
      setLoading(false);
    });
  }, [fotografo]);

  const clienteSelecionado = clientes.find((c) => c.id === value) ?? null;

  const filtrados = busca.trim()
    ? clientes.filter((c) => normalizar(c.nome).includes(normalizar(busca)))
    : clientes;

  function abrir() {
    setBusca("");
    setFoco(-1);
    setAberto(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function fechar() {
    setAberto(false);
    setBusca("");
    setFoco(-1);
  }

  function selecionar(c: Cliente) {
    onChange(c.id, c);
    fechar();
  }

  function limpar() {
    onChange("", null);
    setBusca("");
    setAberto(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFoco((f) => Math.min(f + 1, filtrados.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFoco((f) => Math.max(f - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (foco >= 0 && filtrados[foco]) selecionar(filtrados[foco]);
      else if (filtrados.length === 1) selecionar(filtrados[0]);
    } else if (e.key === "Escape") {
      fechar();
    }
  }

  // Rola o item focado para visível
  useEffect(() => {
    if (foco < 0 || !listaRef.current) return;
    const item = listaRef.current.children[foco] as HTMLElement;
    item?.scrollIntoView({ block: "nearest" });
  }, [foco]);

  function handleClienteCriado(c: Cliente) {
    setClientes((prev) => [...prev, c].sort((a, b) => a.nome.localeCompare(b.nome)));
    onChange(c.id, c);
    setModalAberto(false);
    fechar();
  }

  return (
    <>
      <div style={{ display: "flex", gap: 7 }} ref={wrapperRef}>
        {/* Combobox */}
        <div ref={comboRef} style={{ flex: 1, position: "relative" }}>
          {aberto ? (
            /* Campo de busca */
            <input
              ref={inputRef}
              type="text"
              value={busca}
              onChange={(e) => { setBusca(e.target.value); setFoco(-1); }}
              onKeyDown={handleKeyDown}
              placeholder="Digite para buscar…"
              style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }}
              autoComplete="off"
            />
          ) : (
            /* Exibição do valor selecionado ou placeholder */
            <button
              type="button"
              onClick={abrir}
              disabled={loading}
              style={{
                ...inputStyle,
                width: "100%", textAlign: "left", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                color: clienteSelecionado ? "var(--color-text-primary)" : "var(--color-text-secondary)",
              }}
            >
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {loading ? "Carregando clientes…" : (clienteSelecionado?.nome ?? "Selecionar cliente…")}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0, marginLeft: 6 }}>
                {clienteSelecionado && (
                  <span
                    role="button"
                    onClick={(e) => { e.stopPropagation(); limpar(); }}
                    style={{ fontSize: 14, color: "var(--color-text-secondary)", lineHeight: 1, padding: "0 2px" }}
                    title="Remover cliente"
                  >
                    ×
                  </span>
                )}
                <span style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>▼</span>
              </span>
            </button>
          )}

          {/* Dropdown */}
          <DropdownPortal anchorRef={comboRef} open={aberto} onClose={fechar} maxHeight={220}>
            <div ref={listaRef}>
              {filtrados.length === 0 ? (
                <div style={{ padding: "12px 14px", fontSize: 13, color: "var(--color-text-secondary)" }}>
                  {busca ? `Nenhum cliente encontrado para "${busca}"` : "Nenhum cliente cadastrado"}
                </div>
              ) : (
                filtrados.map((c, i) => (
                  <div
                    key={c.id}
                    onMouseDown={() => selecionar(c)}
                    onMouseEnter={() => setFoco(i)}
                    style={{
                      padding: "10px 14px", cursor: "pointer", fontSize: 13,
                      background: i === foco ? "var(--color-background-secondary)" : "transparent",
                      borderBottom: i < filtrados.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none",
                    }}
                  >
                    <div style={{ fontWeight: 500, color: "var(--color-text-primary)" }}>{c.nome}</div>
                    {(c.email || c.telefone) && (
                      <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>
                        {c.email && <span>{c.email}</span>}
                        {c.email && c.telefone && <span> · </span>}
                        {c.telefone && <span>{c.telefone}</span>}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </DropdownPortal>
        </div>

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
      {clienteSelecionado && !aberto && (
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
