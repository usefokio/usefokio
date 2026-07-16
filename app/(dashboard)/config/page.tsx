"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import { uploadFileClient } from "@/lib/storage/uploadClient";
import { PLANOS, pctUso, corBarra, limiteEfetivo, type PlanoId } from "@/lib/planos";
import type { Categoria } from "@/lib/supabase/types";
import { inputStyle } from "@/lib/styles";
import { mascaraMoeda, parseMoeda, formatarMoeda } from "@/lib/moeda";
import { aplicarMarcaDagua } from "@/lib/imageResize";

type Tab = "categorias" | "identidade" | "pagamentos" | "seguranca" | "mensagens" | "email";

// ── Gerenciador de categorias ────────────────────────────────────────────────
function Categorias() {
  const { fotografo } = useFotografo();
  const [lista, setLista]         = useState<Categoria[]>([]);
  const [loading, setLoading]     = useState(true);
  const [novoNome, setNovoNome]   = useState("");
  const [salvando, setSalvando]   = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { carregar(); }, [fotografo]);

  async function carregar() {
    if (!fotografo) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("categorias").select("*")
      .eq("fotografo_id", fotografo.id)
      .order("ordem").order("created_at");
    setLista(data ?? []);
    setLoading(false);
  }

  async function adicionar() {
    const nome = novoNome.trim();
    if (!nome || !fotografo) return;
    setSalvando(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("categorias")
      .insert({ fotografo_id: fotografo.id, nome, ordem: lista.length })
      .select().single();
    if (data) setLista((l) => [...l, data]);
    setNovoNome("");
    setSalvando(false);
    inputRef.current?.focus();
  }

  async function salvarNome(id: string, valor: string) {
    const nome = valor.trim();
    if (!nome) { carregar(); return; }
    const supabase = createClient();
    await supabase.from("categorias").update({ nome }).eq("id", id);
    setLista((l) => l.map((c) => c.id === id ? { ...c, nome } : c));
  }

  async function salvarTaxa(id: string, valor: string) {
    const taxa = parseMoeda(valor) || null;
    const supabase = createClient();
    await supabase.from("categorias").update({ taxa_renovacao_padrao: taxa }).eq("id", id);
    setLista((l) => l.map((c) => c.id === id ? { ...c, taxa_renovacao_padrao: taxa } : c));
  }

  async function excluir(id: string) {
    const supabase = createClient();
    await supabase.from("categorias").delete().eq("id", id);
    setLista((l) => l.filter((c) => c.id !== id));
  }

  return (
    <div>
      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 0, marginBottom: 20 }}>
        Categorias organizam suas galerias. Configure uma taxa de renovação padrão por categoria — ela será preenchida automaticamente ao criar uma galeria de entrega.
      </p>

      {/* Adicionar nova */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <input
          ref={inputRef}
          value={novoNome}
          onChange={(e) => setNovoNome(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && adicionar()}
          placeholder="Nome da nova categoria…"
          style={{ ...inputStyle, flex: 1 }}
          autoFocus
        />
        <button
          onClick={adicionar}
          disabled={salvando || !novoNome.trim()}
          style={{
            padding: "0 20px", borderRadius: 8,
            background: salvando || !novoNome.trim() ? "#93C5FD" : "#2563EB",
            color: "#fff", border: "none", fontSize: 13, fontWeight: 700,
            cursor: salvando || !novoNome.trim() ? "not-allowed" : "pointer",
            whiteSpace: "nowrap",
          }}
        >
          + Adicionar
        </button>
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>
      ) : lista.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "32px 16px",
          border: "0.5px dashed var(--color-border-secondary)",
          borderRadius: 10, fontSize: 13, color: "var(--color-text-secondary)",
        }}>
          Nenhuma categoria ainda. Crie a primeira acima!
        </div>
      ) : (
        <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, overflow: "hidden" }}>
          {lista.map((cat, i) => (
            <div
              key={cat.id}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 14px",
                borderBottom: i < lista.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none",
                background: "var(--color-background-primary)",
              }}
            >
              {/* Ícone drag (futuro) */}
              <span style={{ fontSize: 14, opacity: 0.3, cursor: "grab", flexShrink: 0 }}>⠿</span>

              <input
                defaultValue={cat.nome}
                onBlur={(e) => salvarNome(cat.id, e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                style={{ ...inputStyle, flex: 1, padding: "5px 10px", fontSize: 13 }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>Renovação:</span>
                <input
                  value={cat.taxa_renovacao_padrao != null ? formatarMoeda(cat.taxa_renovacao_padrao) : ""}
                  onChange={(e) => {
                    const v = mascaraMoeda(e.target.value);
                    setLista((l) => l.map((c) => c.id === cat.id ? { ...c, taxa_renovacao_padrao: parseMoeda(v) || null } : c));
                  }}
                  onBlur={(e) => salvarTaxa(cat.id, e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                  placeholder="—"
                  style={{ ...inputStyle, width: 110, padding: "4px 8px", fontSize: 12, textAlign: "right" }}
                />
              </div>

              <button
                onClick={() => excluir(cat.id)}
                title="Excluir categoria"
                style={{ padding: "4px 10px", borderRadius: 6, background: "rgba(239,68,68,0.06)", border: "0.5px solid rgba(239,68,68,0.2)", fontSize: 12, cursor: "pointer", color: "#EF4444", flexShrink: 0 }}
              >🗑</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Modelos de mensagem ───────────────────────────────────────────────────────
const DEFS_TEMPLATE = [
  {
    id: "link",
    nome: "Enviar link de acesso",
    icone: "🔗",
    quando: "Quando o fotógrafo reenvia o link da galeria ao cliente.",
    variaveis: "{nomeCliente}, {titulo}, {link}, {nomeEmpresa}",
    padrao: "Olá, {nomeCliente}!\n\nSuas fotos de {titulo} estão disponíveis para acesso.\n\nClique no link abaixo para visualizar e baixar:\n{link}\n\nQualquer dúvida, estou à disposição.\n\nAtenciosamente,\n{nomeEmpresa}",
  },
  {
    id: "expirando",
    nome: "Prazo expirando",
    icone: "⏰",
    quando: "Quando o acesso à galeria vai expirar em breve.",
    variaveis: "{nomeCliente}, {titulo}, {link}, {nomeEmpresa}, {prazo} (ex: hoje / amanhã / em 5 dias)",
    padrao: "Olá, {nomeCliente}!\n\nPassando para avisar que seu acesso à galeria {titulo} expira {prazo}.\n\nAproveite para baixar suas fotos antes que o prazo encerre:\n{link}\n\nSe precisar de mais tempo, entre em contato comigo.\n\nAtenciosamente,\n{nomeEmpresa}",
  },
  {
    id: "suspensa",
    nome: "Galeria suspensa",
    icone: "🔒",
    quando: "Quando o fotógrafo suspende o acesso à galeria.",
    variaveis: "{nomeCliente}, {titulo}, {nomeEmpresa}",
    padrao: "Olá, {nomeCliente}!\n\nInformo que o acesso à galeria {titulo} foi temporariamente suspenso.\n\nCaso queira reativar o acesso, entre em contato comigo.\n\nAtenciosamente,\n{nomeEmpresa}",
  },
  {
    id: "campanha_email1",
    nome: "Campanha — 1º email",
    icone: "📧",
    quando: "Primeiro contato da campanha de reativação — enviado quando o fotógrafo inicia o funil.",
    variaveis: "{nomeCliente}, {titulo}, {respostaUrl}, {nomeEmpresa}",
    padrao: "Olá, {nomeCliente}!\n\nTudo bem? Passando para falar sobre as fotos de {titulo}.\n\nTemos sua galeria salva aqui, mas com o aumento dos custos de armazenamento, precisamos entender a situação antes de tomar uma decisão.\n\nPode nos dizer o que prefere?\n{respostaUrl}\n\n✅ Já tenho meus arquivos salvos — pode remover\n🔄 Ainda preciso acessar — quero renovar\n\nAté breve,\n{nomeEmpresa}",
  },
  {
    id: "campanha_email2",
    nome: "Campanha — 2º email",
    icone: "📧",
    quando: "Segundo contato da campanha (10 dias após o 1º email) — tom mais urgente.",
    variaveis: "{nomeCliente}, {titulo}, {respostaUrl}, {nomeEmpresa}",
    padrao: "Olá, {nomeCliente}!\n\nEnviamos um email há alguns dias sobre as fotos de {titulo} e ainda não recebemos sua resposta.\n\nPrecisamos de um posicionamento antes de tomar uma decisão sobre esses arquivos.\n\nPor favor, acesse o link e nos informe:\n{respostaUrl}\n\n✅ Já tenho meus arquivos — tudo certo\n🔄 Quero renovar meu acesso às fotos\n\nAguardamos seu retorno,\n{nomeEmpresa}",
  },
  {
    id: "campanha_whatsapp",
    nome: "Campanha — WhatsApp",
    icone: "📱",
    quando: "Mensagem de WhatsApp (após o 2º email) — explica o motivo do contato e os custos de armazenamento.",
    variaveis: "{nomeCliente}, {titulo}, {respostaUrl}, {nomeEmpresa}, {dataEmail1}, {dataEmail2}",
    padrao: "Oi, {nomeCliente}! Aqui é {nomeEmpresa}.\n\nTentamos entrar em contato por email duas vezes sobre as fotos de {titulo}, mas acreditamos que você pode não ter recebido:\n📧 1º email enviado em {dataEmail1}\n📧 2º email enviado em {dataEmail2}\n\nO motivo do contato: com o aumento nos custos de armazenamento, não é mais possível manter os arquivos ativos indefinidamente. Precisamos de uma posição sua antes de tomar uma decisão definitiva sobre essas fotos.\n\nPor favor, acesse o link e nos diga o que prefere:\n{respostaUrl}\n\n✅ Já tenho meus arquivos baixados e salvos\n🔄 Quero renovar meu acesso para fazer o download\n\nSem uma resposta, as fotos serão excluídas permanentemente e não poderão ser recuperadas.",
  },
  {
    id: "renovacao",
    nome: "Renovação confirmada",
    icone: "✅",
    quando: "Enviado ao cliente após confirmação de pagamento de renovação de acesso.",
    variaveis: "{nomeCliente}, {titulo}, {link}, {nomeEmpresa}, {prazo}",
    padrao: "Oi, {nomeCliente}! Tudo certo — o acesso à galeria {titulo} foi reativado e o prazo renovado {prazo}.\n\nAgora é o momento de garantir o download de todos os arquivos e salvá-los em um local seguro, como o seu computador ou um serviço de nuvem pessoal. Ter os arquivos salvos localmente é a única garantia de que essas memórias vão ficar com você independente de qualquer coisa.\n\nQuando o prazo estiver se encerrando, você receberá um novo e-mail. Por lá será possível confirmar que já tem tudo salvo ou renovar o acesso mais uma vez.\n\n{nomeEmpresa}",
  },
  {
    id: "campanha_agradecimento",
    nome: "Campanha — Agradecimento",
    icone: "💌",
    quando: "Enviado ao cliente que confirmou que já tem os arquivos — encerra o funil.",
    variaveis: "{nomeCliente}, {titulo}, {nomeEmpresa}",
    padrao: "Oi, {nomeCliente}! Ficamos felizes em saber que você já tem suas fotos de {titulo} salvas.\n\nObrigado pela confiança ao longo de todo esse processo. Qualquer dúvida ou necessidade futura, estou à disposição.\n\nUm abraço,\n{nomeEmpresa}",
  },
] as const;

function MensagensConfig() {
  const { fotografo, reload } = useFotografo();
  const [templates, setTemplates] = useState<Record<string, string>>({});
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);

  useEffect(() => {
    if (fotografo?.templates_mensagem) {
      setTemplates(fotografo.templates_mensagem as Record<string, string>);
    }
  }, [fotografo]);

  async function salvar() {
    if (!fotografo) return;
    setSaving(true);
    const supabase = createClient();
    const payload = Object.fromEntries(
      Object.entries(templates).filter(([id, v]) => {
        const def = (DEFS_TEMPLATE as readonly { id: string; padrao: string }[]).find((d) => d.id === id);
        return v.trim() && v.trim() !== (def?.padrao ?? "").trim();
      })
    );
    await supabase
      .from("fotografos")
      .update({ templates_mensagem: Object.keys(payload).length ? payload : null })
      .eq("id", fotografo.id);
    await reload();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function restaurar(id: string) {
    setTemplates((t) => { const next = { ...t }; delete next[id]; return next; });
  }

  return (
    <div>
      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 0, marginBottom: 24, lineHeight: 1.6 }}>
        Personalize os textos usados no modal de envio de email/WhatsApp para clientes. Deixe em branco para usar o texto padrão do sistema.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {DEFS_TEMPLATE.map((def) => {
          const temCustom = !!(templates[def.id]?.trim());
          return (
            <div key={def.id} style={{ border: "0.5px solid var(--color-border-secondary)", borderRadius: 10, overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", background: "var(--color-background-secondary)", borderBottom: "0.5px solid var(--color-border-tertiary)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)" }}>{def.icone} {def.nome}</span>
                  <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: temCustom ? "rgba(37,99,235,0.1)" : "rgba(0,0,0,0.06)", color: temCustom ? "#2563EB" : "var(--color-text-secondary)", fontWeight: 600 }}>
                    {temCustom ? "Personalizado" : "Padrão do sistema"}
                  </span>
                </div>
                {temCustom && (
                  <button
                    onClick={() => restaurar(def.id)}
                    style={{ fontSize: 11, color: "var(--color-text-secondary)", background: "none", border: "none", cursor: "pointer", padding: "2px 6px", borderRadius: 4 }}
                  >
                    Restaurar padrão
                  </button>
                )}
              </div>
              <div style={{ padding: "14px 16px" }}>
                <p style={{ fontSize: 11, color: "var(--color-text-secondary)", margin: "0 0 10px", lineHeight: 1.5 }}>{def.quando}</p>
                <textarea
                  value={templates[def.id] ?? def.padrao}
                  onChange={(e) => setTemplates((t) => ({ ...t, [def.id]: e.target.value }))}
                  placeholder={def.padrao}
                  rows={7}
                  style={{ ...inputStyle, width: "100%", boxSizing: "border-box", resize: "vertical", lineHeight: 1.6, fontFamily: "inherit", fontSize: 12 }}
                />
                <p style={{ fontSize: 11, color: "var(--color-text-secondary)", margin: "6px 0 0" }}>
                  Variáveis disponíveis:{" "}
                  <code style={{ fontSize: 10, background: "var(--color-background-secondary)", padding: "1px 5px", borderRadius: 3 }}>{def.variaveis}</code>
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {saved && <div style={{ fontSize: 13, color: "#059669", marginTop: 16 }}>✓ Modelos salvos!</div>}

      <button
        onClick={salvar}
        disabled={saving}
        style={{ marginTop: 20, padding: "10px 28px", borderRadius: 8, background: saving ? "#93C5FD" : "#2563EB", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}
      >
        {saving ? "Salvando…" : "Salvar modelos"}
      </button>
    </div>
  );
}

// ── Servidor de e-mail (SMTP) ─────────────────────────────────────────────────
function parseSMTPFrom(raw: string | null) {
  if (!raw) return { nome: "", email: "" };
  const m = raw.match(/^(.+?)\s*<([^>]+)>$/);
  if (m) return { nome: m[1].trim(), email: m[2].trim() };
  return { nome: "", email: raw.trim() };
}

function ConfigEmail() {
  const { fotografo, reload } = useFotografo();
  const parsed = parseSMTPFrom(fotografo?.smtp_from ?? null);
  const [host,      setHost]      = useState(fotografo?.smtp_host ?? "");
  const [port,      setPort]      = useState(String(fotografo?.smtp_port ?? 587));
  const [user,      setUser]      = useState(fotografo?.smtp_user ?? "");
  const [pass,      setPass]      = useState("");
  const [fromNome,  setFromNome]  = useState(parsed.nome);
  const [fromEmail, setFromEmail] = useState(parsed.email);
  const [salvando,   setSalvando]   = useState(false);
  const [testando,   setTestando]   = useState(false);
  const [msg,        setMsg]        = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  const temConfig = !!(fotografo?.smtp_host);
  const fromComposto = fromNome && fromEmail
    ? `${fromNome} <${fromEmail}>`
    : (fromEmail || fromNome || "");

  async function salvar() {
    setSalvando(true);
    setMsg(null);
    const res = await fetch("/api/config/smtp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ host, port: Number(port), user, pass: pass || undefined, from: fromComposto, ativo: true }),
    });
    const json = await res.json();
    setSalvando(false);
    if (json.ok) { setMsg({ tipo: "ok", texto: "Configurações salvas." }); setPass(""); reload(); }
    else setMsg({ tipo: "erro", texto: json.erro ?? "Erro ao salvar." });
  }

  async function testar() {
    setTestando(true);
    setMsg(null);
    const res = await fetch("/api/config/smtp/testar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ host, port: Number(port), user, pass: pass || undefined, from: fromComposto }),
    });
    const json = await res.json();
    setTestando(false);
    if (json.ok) setMsg({ tipo: "ok", texto: "Conexão OK! E-mail de teste enviado para " + fotografo?.email + "." });
    else setMsg({ tipo: "erro", texto: json.erro ?? "Falha na conexão." });
  }

  async function desconectar() {
    await fetch("/api/config/smtp", { method: "DELETE" });
    setHost(""); setPort("587"); setUser(""); setPass(""); setFromNome(""); setFromEmail("");
    setMsg({ tipo: "ok", texto: "Servidor desconectado." });
    reload();
  }

  return (
    <div>
      <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text-primary)", margin: "0 0 4px" }}>Servidor de e-mail</h2>
      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 20px", lineHeight: 1.5 }}>
        Configure seu próprio servidor SMTP para que os e-mails enviados aos seus clientes partam do seu domínio. Se não configurado, os e-mails são enviados pelo UseFokio.
      </p>

      {msg && (
        <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 8, fontSize: 13,
          background: msg.tipo === "ok" ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
          color: msg.tipo === "ok" ? "#059669" : "#DC2626",
          border: `0.5px solid ${msg.tipo === "ok" ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
        }}>
          {msg.texto}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 10 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 5 }}>Host SMTP</label>
            <input value={host} onChange={(e) => setHost(e.target.value)} placeholder="smtp.seudominio.com.br" style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 5 }}>Porta</label>
            <input value={port} onChange={(e) => setPort(e.target.value)} placeholder="587" style={inputStyle} />
          </div>
        </div>

        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 5 }}>Usuário (login)</label>
          <input value={user} onChange={(e) => setUser(e.target.value)} placeholder="contato@seudominio.com.br" style={inputStyle} />
        </div>

        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 5 }}>
            Senha {temConfig && !pass && <span style={{ fontWeight: 400, textTransform: "none" }}>(deixe em branco para manter a atual)</span>}
          </label>
          <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder={temConfig ? "••••••••" : "Senha do servidor"} style={inputStyle} autoComplete="new-password" />
        </div>

        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 5 }}>Nome do remetente</label>
          <input value={fromNome} onChange={(e) => setFromNome(e.target.value)} placeholder="Fernando Agrela Fotografia" style={inputStyle} />
        </div>

        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 5 }}>E-mail do remetente</label>
          <input value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} placeholder="contato@seudominio.com.br" style={inputStyle} />
          {fromComposto && (
            <div style={{ marginTop: 6, fontSize: 12, color: "var(--color-text-secondary)" }}>
              Prévia: <span style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>{fromComposto}</span>
            </div>
          )}
        </div>

        <div style={{ padding: "10px 14px", borderRadius: 9, background: "rgba(37,99,235,0.05)", border: "0.5px solid rgba(37,99,235,0.2)", fontSize: 12, color: "var(--color-text-secondary)" }}>
          {temConfig ? "✓ Servidor configurado — e-mails aos clientes serão enviados pelo seu domínio." : "Sem servidor configurado — e-mails serão enviados pelo UseFokio."}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <button onClick={testar} disabled={testando || !host || !user || !fromComposto} style={{ padding: "9px 16px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", fontSize: 13, fontWeight: 600, cursor: !host || !user || !fromComposto ? "not-allowed" : "pointer", opacity: !host || !user || !fromComposto ? 0.5 : 1 }}>
            {testando ? "Testando…" : "Testar conexão"}
          </button>
          <button onClick={salvar} disabled={salvando} style={{ flex: 1, padding: "9px", borderRadius: 8, border: "none", background: "#2563EB", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            {salvando ? "Salvando…" : "Salvar"}
          </button>
          {temConfig && (
            <button onClick={desconectar} style={{ padding: "9px 14px", borderRadius: 8, border: "0.5px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.05)", color: "#DC2626", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Desconectar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Pagamentos (Asaas) ────────────────────────────────────────────────────────
function mascarEmail(email: string) {
  const [user, domain] = email.split("@");
  return `${user[0]}***@${domain}`;
}

function ConfigPagamentos() {
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
      : { pix_chave: pixChave, pix_tipo: pixTipo, pix_ativo: pixAtivo };
    const result = await solicitarConfirmacao(confirmModal.action, payload);
    if ("erro" in result) {
      if (result.erro === "aguarde_reenvio") setConfirmErro("Aguarde 1 minuto antes de reenviar.");
      else setConfirmErro(result.erro ?? "Erro ao reenviar.");
    } else {
      setConfirmModal(prev => prev ? { ...prev, confirmationId: result.confirmationId!, tentativasRestantes: 5 } : null);
    }
  }

  async function salvarPix() {
    setPixSalvando(true);
    setPixMsg(null);
    // Desativar não exige confirmação; em dev também salvamos direto (não há email real para o OTP —
    // a confirmação por email protege contas reais apenas em produção).
    if (!pixAtivo || process.env.NODE_ENV === "development") {
      const res = await fetch("/api/config/pix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pix_chave: pixChave, pix_tipo: pixTipo, pix_ativo: pixAtivo }),
      });
      const json = await res.json();
      setPixSalvando(false);
      if (json.ok) { setPixMsg({ tipo: "ok", texto: pixAtivo ? "Configuração PIX salva!" : "PIX desativado." }); await reload(); }
      else setPixMsg({ tipo: "erro", texto: json.erro ?? "Erro ao salvar." });
      return;
    }
    // Ativar ou alterar chave PIX requer confirmação por email (produção)
    const result = await solicitarConfirmacao("pix_key", { pix_chave: pixChave, pix_tipo: pixTipo, pix_ativo: true });
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
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={pixAtivo} onChange={(e) => setPixAtivo(e.target.checked)} style={{ width: 16, height: 16, cursor: "pointer" }} />
            Ativar PIX manual
          </label>
        </div>
        {pixAtivo && (
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

// ── Identidade Visual ─────────────────────────────────────────────────────────
function IdentidadeVisual() {
  const { fotografo } = useFotografo();
  const [saving, setSaving]   = useState(false);
  const [saved,  setSaved]    = useState(false);
  const [logoUrl,         setLogoUrl]         = useState<string | null>(null);
  const [watermarkUrl,    setWatermarkUrl]    = useState<string | null>(null);
  const [watermarkUrlV,   setWatermarkUrlV]   = useState<string | null>(null);
  const [logoUploading,       setLogoUploading]       = useState(false);
  const [watermarkUploading,  setWatermarkUploading]  = useState(false);
  const [watermarkUploadingV, setWatermarkUploadingV] = useState(false);
  const logoInputRef       = useRef<HTMLInputElement>(null);
  const watermarkInputRef  = useRef<HTMLInputElement>(null);
  const watermarkInputRefV = useRef<HTMLInputElement>(null);
  const [wmEscala,     setWmEscala]     = useState(0.30);
  const [wmOpacidade,  setWmOpacidade]  = useState(0.55);
  const debounceRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceOpRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const FOTO_EXEMPLO_H = "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80";
  const FOTO_EXEMPLO_V = "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=533&q=80";

  // Assinatura de email
  const [assiEmail,   setAssiEmail]   = useState("");
  const [assiSite,    setAssiSite]    = useState("");
  const [assiSaving,  setAssiSaving]  = useState(false);
  const [assiSaved,   setAssiSaved]   = useState(false);

  useEffect(() => {
    if (fotografo) {
      setLogoUrl(fotografo.logo_url ?? null);
      setWatermarkUrl(fotografo.watermark_url ?? null);
      setWatermarkUrlV(fotografo.watermark_url_vertical ?? null);
      setWmEscala(fotografo.watermark_escala ?? 0.30);
      setWmOpacidade(fotografo.watermark_opacidade ?? 0.55);
      setAssiEmail(fotografo.email ?? "");
      setAssiSite(fotografo.site ?? "");
    }
  }, [fotografo]);

  async function salvarAssinatura() {
    if (!fotografo) return;
    setAssiSaving(true);
    await createClient().from("fotografos").update({
      email: assiEmail.trim() || null,
      site:  assiSite.trim()  || null,
    }).eq("id", fotografo.id);
    setAssiSaving(false);
    setAssiSaved(true);
    setTimeout(() => setAssiSaved(false), 3000);
  }

  async function uploadImagem(
    file: File,
    tipo: "logo" | "watermark" | "watermark_v",
    setUploading: (v: boolean) => void,
    setUrl: (v: string | null) => void,
  ) {
    if (!fotografo) return;
    setUploading(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop() ?? "png";
    const path = `assets/${fotografo.id}/${tipo}.${ext}`;
    try {
      const { url_publica } = await uploadFileClient(path, file, file.type);
      const field = tipo === "logo" ? "logo_url" : tipo === "watermark" ? "watermark_url" : "watermark_url_vertical";
      await supabase.from("fotografos").update({ [field]: url_publica }).eq("id", fotografo.id);
      setUrl(url_publica + "?t=" + Date.now());
    } catch { /* silencioso */ }
    setUploading(false);
  }

  function onSliderChange(valor: number) {
    setWmEscala(valor);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (!fotografo) return;
      await createClient().from("fotografos").update({ watermark_escala: valor }).eq("id", fotografo.id);
    }, 600);
  }

  function onOpacidadeChange(valor: number) {
    setWmOpacidade(valor);
    if (debounceOpRef.current) clearTimeout(debounceOpRef.current);
    debounceOpRef.current = setTimeout(async () => {
      if (!fotografo) return;
      await createClient().from("fotografos").update({ watermark_opacidade: valor }).eq("id", fotografo.id);
    }, 600);
  }

  async function remover(tipo: "logo" | "watermark" | "watermark_v") {
    if (!fotografo) return;
    const field = tipo === "logo" ? "logo_url" : tipo === "watermark" ? "watermark_url" : "watermark_url_vertical";
    await createClient().from("fotografos").update({ [field]: null }).eq("id", fotografo.id);
    if (tipo === "logo") setLogoUrl(null);
    else if (tipo === "watermark") setWatermarkUrl(null);
    else setWatermarkUrlV(null);
  }

  function UploadCard({ label, descricao, url, uploading }: {
    label: string; descricao: string; url: string | null; uploading: boolean;
  }) {
    return (
      <div style={{ border: "0.5px solid var(--color-border-secondary)", borderRadius: 12, padding: "20px 22px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 16, lineHeight: 1.5 }}>{descricao}</div>
        {url ? (
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ background: "repeating-conic-gradient(#e0e0e0 0% 25%, #ffffff 0% 50%) 0 0 / 16px 16px", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 8, padding: 8, display: "flex", alignItems: "center", justifyContent: "center", minWidth: 80, minHeight: 60 }}>
              <img src={url} alt={label} style={{ maxHeight: 56, maxWidth: 140, objectFit: "contain" }} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={() => logoInputRef.current?.click()} style={{ padding: "7px 14px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", fontSize: 12, fontWeight: 600, cursor: "pointer", color: "var(--color-text-primary)" }}>{uploading ? "Enviando…" : "Trocar"}</button>
              <button type="button" onClick={() => remover("logo")} style={{ padding: "7px 14px", borderRadius: 8, border: "0.5px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.06)", fontSize: 12, fontWeight: 600, cursor: "pointer", color: "#DC2626" }}>Remover</button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => logoInputRef.current?.click()} disabled={uploading} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 9, border: "1.5px dashed var(--color-border-secondary)", background: "var(--color-background-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "var(--color-text-secondary)", width: "100%" }}>
            <span style={{ fontSize: 20 }}>🖼</span>{uploading ? "Enviando…" : "Clique para enviar PNG"}
          </button>
        )}
        <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImagem(f, "logo", setLogoUploading, setLogoUrl); e.target.value = ""; }} />
      </div>
    );
  }

  function WmUploadMini({ url, uploading, tipo, inputRef: ref }: {
    url: string | null; uploading: boolean;
    tipo: "watermark" | "watermark_v";
    inputRef: React.RefObject<HTMLInputElement | null>;
  }) {
    const setUpl = tipo === "watermark" ? setWatermarkUploading  : setWatermarkUploadingV;
    const setUrl = tipo === "watermark" ? setWatermarkUrl        : setWatermarkUrlV;
    return (
      <div>
        {url ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ background: "repeating-conic-gradient(#e0e0e0 0% 25%, #ffffff 0% 50%) 0 0 / 12px 12px", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 8, padding: 8, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 52 }}>
              <img src={url} style={{ maxHeight: 44, maxWidth: "100%", objectFit: "contain" }} alt="" />
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button type="button" onClick={() => ref.current?.click()} style={{ flex: 1, padding: "5px 0", borderRadius: 7, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", fontSize: 11, fontWeight: 600, cursor: "pointer", color: "var(--color-text-primary)" }}>{uploading ? "…" : "Trocar"}</button>
              <button type="button" onClick={() => remover(tipo)} style={{ flex: 1, padding: "5px 0", borderRadius: 7, border: "0.5px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.06)", fontSize: 11, fontWeight: 600, cursor: "pointer", color: "#DC2626" }}>Remover</button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => ref.current?.click()} disabled={uploading} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, width: "100%", minHeight: 76, borderRadius: 8, border: "1.5px dashed var(--color-border-secondary)", background: "var(--color-background-secondary)", fontSize: 11, fontWeight: 600, cursor: "pointer", color: "var(--color-text-secondary)" }}>
            <span style={{ fontSize: 18 }}>🖼</span>{uploading ? "Enviando…" : "Enviar PNG"}
          </button>
        )}
        <input ref={ref} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImagem(f, tipo, setUpl, setUrl); e.target.value = ""; }} />
      </div>
    );
  }

  return (
    <div>
      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 0, marginBottom: 24, lineHeight: 1.6 }}>
        Configure a logo do seu estúdio e a marca d'água aplicada nas galerias de seleção.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <UploadCard
          label="Logo do estúdio"
          descricao="Exibida no topo da galeria de entrega do cliente (PNG ou JPG recomendado, fundo transparente)."
          url={logoUrl}
          uploading={logoUploading}
        />

        {/* Card de marca d'água */}
        <div style={{ border: "0.5px solid var(--color-border-secondary)", borderRadius: 12, padding: "20px 22px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 4 }}>Marca d&apos;água</div>
          <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 16, lineHeight: 1.5 }}>
            Aplicada automaticamente nas fotos das galerias de seleção. Use PNG com fundo transparente.
            Se não enviar a versão vertical, a horizontal será usada nas fotos retrato.
          </div>

          {/* Dois uploads lado a lado */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>Horizontal</div>
              <WmUploadMini url={watermarkUrl} uploading={watermarkUploading} tipo="watermark" inputRef={watermarkInputRef} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Vertical <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(opcional)</span>
              </div>
              <WmUploadMini url={watermarkUrlV} uploading={watermarkUploadingV} tipo="watermark_v" inputRef={watermarkInputRefV} />
            </div>
          </div>

          {/* Sliders + previews (só se tiver ao menos uma watermark) */}
          {(watermarkUrl || watermarkUrlV) && (() => {
            const wmH = watermarkUrl;
            const wmV = watermarkUrlV ?? watermarkUrl;
            return (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
                  {([
                    { lbl: "Tamanho",   val: wmEscala,    fn: onSliderChange },
                    { lbl: "Opacidade", val: wmOpacidade, fn: onOpacidadeChange },
                  ] as const).map(({ lbl, val, fn }) => (
                    <div key={lbl} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 12, color: "var(--color-text-secondary)", whiteSpace: "nowrap", minWidth: 72 }}>{lbl}</span>
                      <input type="range" min={0.01} max={1.0} step={0.01} value={val}
                        onChange={e => fn(parseFloat(e.target.value))}
                        style={{ flex: 1, accentColor: "var(--color-accent-primary)", cursor: "pointer" }} />
                      <input type="number" min={1} max={100} value={Math.round(val * 100)}
                        onChange={e => fn(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)) / 100)}
                        style={{ width: 46, fontSize: 12, fontWeight: 700, textAlign: "right", border: "0.5px solid var(--color-border-secondary)", borderRadius: 5, padding: "2px 4px", background: "var(--color-background-secondary)", color: "var(--color-text-primary)" }} />
                      <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>%</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 10 }}>
                  {wmH && (
                    <div style={{ borderRadius: 8, overflow: "hidden", border: "0.5px solid var(--color-border-tertiary)" }}>
                      <div style={{ position: "relative" }}>
                        <img src={FOTO_EXEMPLO_H} style={{ width: "100%", display: "block" }} alt="" />
                        <img src={wmH} style={{ position: "absolute", bottom: "3%", right: "3%", width: `${wmEscala * 100}%`, opacity: wmOpacidade, objectFit: "contain", pointerEvents: "none" }} alt="" />
                      </div>
                      <div style={{ fontSize: 10, color: "var(--color-text-secondary)", padding: "4px 8px", background: "var(--color-background-secondary)" }}>Horizontal</div>
                    </div>
                  )}
                  {wmV && (
                    <div style={{ borderRadius: 8, overflow: "hidden", border: "0.5px solid var(--color-border-tertiary)" }}>
                      <div style={{ position: "relative", aspectRatio: "2/3", overflow: "hidden" }}>
                        <img src={FOTO_EXEMPLO_H} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} alt="" />
                        <img src={wmV} style={{ position: "absolute", bottom: "3%", right: "3%", width: `${wmEscala * 100}%`, opacity: wmOpacidade, objectFit: "contain", pointerEvents: "none" }} alt="" />
                      </div>
                      <div style={{ fontSize: 10, color: "var(--color-text-secondary)", padding: "4px 8px", background: "var(--color-background-secondary)" }}>
                        Vertical{!watermarkUrlV && " (usando horizontal)"}
                      </div>
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* Assinatura de email */}
      <div style={{ marginTop: 28 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 4 }}>
          Assinatura de email
        </div>
        <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 18, lineHeight: 1.5 }}>
          Aparece no rodapé dos emails enviados aos seus clientes. O nome da empresa e seu nome são herdados do seu perfil.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Campos */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6, display: "block" }}>
                Email de contato
              </label>
              <input
                type="email"
                value={assiEmail}
                onChange={(e) => setAssiEmail(e.target.value)}
                placeholder="seuemail@exemplo.com"
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-secondary)", color: "var(--color-text-primary)", fontSize: 13, outline: "none", boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6, display: "block" }}>
                Site
              </label>
              <input
                type="url"
                value={assiSite}
                onChange={(e) => setAssiSite(e.target.value)}
                placeholder="https://seusite.com.br"
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-secondary)", color: "var(--color-text-primary)", fontSize: 13, outline: "none", boxSizing: "border-box" }}
              />
            </div>
          </div>

          {/* Preview */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
              Preview do rodapé
            </div>
            <div style={{ background: "#f9f9f9", border: "1px solid #eee", borderRadius: 10, padding: "18px 20px", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#333", marginBottom: 2 }}>
                  {fotografo?.nome_empresa || fotografo?.nome_completo || "Nome da empresa"}
                </div>
                {fotografo?.nome_empresa && fotografo?.nome_completo && (
                  <div style={{ fontSize: 12, color: "#888", marginBottom: 2 }}>{fotografo.nome_completo}</div>
                )}
                {assiEmail && (
                  <div style={{ marginTop: 4, fontSize: 12, color: "#555" }}>{assiEmail}</div>
                )}
                {assiSite && (
                  <div style={{ marginTop: 2, fontSize: 12, color: "#2563EB" }}>
                    {assiSite.replace(/^https?:\/\//, "")}
                  </div>
                )}
              </div>
              <div style={{ borderTop: "1px solid #e8e8e8", paddingTop: 10, fontSize: 11, color: "#bbb" }}>
                Enviado via UseFokio · Este é um email automático, não responda.
              </div>
            </div>
          </div>

          <button
            onClick={salvarAssinatura}
            disabled={assiSaving}
            style={{ alignSelf: "flex-start", padding: "9px 22px", borderRadius: 9, border: "none", background: assiSaved ? "#10B981" : "#111", color: "#fff", fontSize: 13, fontWeight: 700, cursor: assiSaving ? "default" : "pointer", transition: "background 0.2s" }}
          >
            {assiSaving ? "Salvando…" : assiSaved ? "✓ Salvo!" : "Salvar assinatura"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Card de plano ─────────────────────────────────────────────────────────────
function CardPlano() {
  const { fotografo } = useFotografo();
  if (!fotografo) return null;
  const plano  = PLANOS[fotografo.plano as PlanoId] ?? PLANOS.gratuito;
  const usadas = fotografo.total_fotos_usadas ?? 0;
  const limite = limiteEfetivo(plano, fotografo.limite_fotos_custom);
  const pct    = pctUso(usadas, plano, fotografo.limite_fotos_custom);
  const bc     = pct !== null ? corBarra(pct) : "#2563EB";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 4px" }}>
        Gerencie seu plano, acompanhe o uso de fotos e veja as opções de upgrade.
      </p>

      {/* Mini card do plano atual */}
      <div style={{
        background: plano.corBg,
        border: `1px solid ${plano.cor}30`,
        borderRadius: 12, padding: "18px 20px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: plano.cor }}>{plano.nome}</span>
          {plano.badge && (
            <span style={{ padding: "2px 8px", borderRadius: 20, background: plano.cor, color: "#fff", fontSize: 9, fontWeight: 800, letterSpacing: "0.06em" }}>
              {plano.badge.toUpperCase()}
            </span>
          )}
          <span style={{ marginLeft: "auto", fontSize: 13, fontWeight: 700, color: "#2563EB" }}>
            Fase beta — gratuito
          </span>
        </div>

        {pct !== null && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12 }}>
              <span style={{ color: "var(--color-text-secondary)" }}>Fotos usadas</span>
              <span style={{ fontWeight: 600, color: pct >= 80 ? bc : "var(--color-text-primary)" }}>
                {usadas.toLocaleString("pt-BR")} / {limite!.toLocaleString("pt-BR")}
              </span>
            </div>
            <div style={{ height: 6, background: "rgba(0,0,0,0.08)", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 3, background: bc, width: `${pct}%` }} />
            </div>
            {pct >= 80 && (
              <div style={{ fontSize: 11, color: bc, fontWeight: 600, marginTop: 4 }}>
                {pct >= 95 ? "⚠️ Limite quase atingido!" : "Atenção: uso elevado"}
              </div>
            )}
          </div>
        )}
      </div>

      <Link
        href="/conta/plano"
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "13px 18px", borderRadius: 10,
          background: "var(--color-background-secondary)",
          border: "0.5px solid var(--color-border-secondary)",
          textDecoration: "none", color: "var(--color-text-primary)",
          fontSize: 13, fontWeight: 600,
        }}
      >
        <span>Ver todos os planos e fazer upgrade</span>
        <span style={{ color: "var(--color-text-secondary)", fontSize: 16 }}>→</span>
      </Link>
    </div>
  );
}

// ── Força de senha ────────────────────────────────────────────────────────────
const REQUISITOS_SENHA = [
  { id: "len",     label: "Mínimo 8 caracteres",           ok: (s: string) => s.length >= 8 },
  { id: "upper",   label: "Letra maiúscula (A–Z)",          ok: (s: string) => /[A-Z]/.test(s) },
  { id: "lower",   label: "Letra minúscula (a–z)",          ok: (s: string) => /[a-z]/.test(s) },
  { id: "number",  label: "Número (0–9)",                   ok: (s: string) => /[0-9]/.test(s) },
  { id: "special", label: "Caractere especial (!@#$%...)", ok: (s: string) => /[^A-Za-z0-9]/.test(s) },
] as const;

function calcularForca(senha: string): 0 | 1 | 2 | 3 {
  if (!senha) return 0;
  const pontos = REQUISITOS_SENHA.filter((r) => r.ok(senha)).length;
  if (pontos <= 2) return 1;
  if (pontos <= 3) return 2;
  return 3;
}

const FORCA_CONFIG = {
  0: { label: "",        cor: "transparent" },
  1: { label: "Fraca",  cor: "#EF4444" },
  2: { label: "Média",  cor: "#F59E0B" },
  3: { label: "Forte",  cor: "#10B981" },
} as const;

// ── Alterar senha ─────────────────────────────────────────────────────────────
function AlterarSenha() {
  const [senhaAtual,     setSenhaAtual]     = useState("");
  const [novaSenha,      setNovaSenha]      = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [salvando,       setSalvando]       = useState(false);
  const [erro,           setErro]           = useState("");
  const [salvo,          setSalvo]          = useState(false);
  const [provedor,       setProvedor]       = useState<string | null>(null);
  const [userEmail,      setUserEmail]      = useState<string | null>(null);
  const [mostrarAtual,   setMostrarAtual]   = useState(false);
  const [mostrarSenha,   setMostrarSenha]   = useState(false);
  const [mostrarConfirm, setMostrarConfirm] = useState(false);

  const forca    = calcularForca(novaSenha);
  const forcaCfg = FORCA_CONFIG[forca];
  const todosCumpridos = REQUISITOS_SENHA.every((r) => r.ok(novaSenha));

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      const identities = data.user?.identities ?? [];
      const temEmail  = identities.some((i) => i.provider === "email");
      const temGoogle = identities.some((i) => i.provider === "google");
      if (temGoogle && !temEmail) setProvedor("google");
      else setProvedor("email");
      setUserEmail(data.user?.email ?? null);
    });
  }, []);

  async function salvar() {
    if (!senhaAtual)                   { setErro("Informe sua senha atual."); return; }
    if (!novaSenha)                    { setErro("Informe a nova senha."); return; }
    if (!todosCumpridos)               { setErro("A senha não atende todos os requisitos."); return; }
    if (novaSenha !== confirmarSenha)  { setErro("As senhas não coincidem."); return; }

    setSalvando(true); setErro("");

    // Validar senha atual via re-autenticação
    const { error: erroLogin } = await createClient().auth.signInWithPassword({
      email: userEmail ?? "",
      password: senhaAtual,
    });
    if (erroLogin) {
      setSalvando(false);
      setErro("Senha atual incorreta.");
      return;
    }

    const { error } = await createClient().auth.updateUser({ password: novaSenha });
    setSalvando(false);
    if (error) { setErro(error.message); return; }
    setSenhaAtual(""); setNovaSenha(""); setConfirmarSenha("");
    setSalvo(true); setTimeout(() => setSalvo(false), 3000);
  }

  const inp: React.CSSProperties = {
    width: "100%", padding: "9px 36px 9px 12px", borderRadius: 8,
    background: "var(--color-background-secondary)",
    border: "0.5px solid var(--color-border-secondary)",
    color: "var(--color-text-primary)", fontSize: 13,
    outline: "none", boxSizing: "border-box",
  };
  const lbl: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)",
    textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6, display: "block",
  };

  if (provedor === "google") {
    return (
      <div style={{ background: "rgba(37,99,235,0.05)", border: "0.5px solid rgba(37,99,235,0.2)", borderRadius: 10, padding: "20px 22px", fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
        ℹ️ Sua conta usa login com o Google. Para alterar a senha, acesse as configurações da sua conta Google.
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 420 }}>
      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 0, marginBottom: 24, lineHeight: 1.6 }}>
        Altere sua senha de acesso ao UseFokio. Use uma senha forte para proteger sua conta.
      </p>

      {erro && (
        <div style={{ background: "rgba(239,68,68,0.08)", border: "0.5px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#EF4444" }}>
          {erro}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Campo senha atual */}
        <div>
          <label style={lbl}>SENHA ATUAL</label>
          <div style={{ position: "relative" }}>
            <input
              type={mostrarAtual ? "text" : "password"}
              value={senhaAtual}
              onChange={(e) => { setSenhaAtual(e.target.value); setErro(""); }}
              placeholder="Digite sua senha atual"
              style={inp}
            />
            <button
              type="button"
              onClick={() => setMostrarAtual((v) => !v)}
              style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "var(--color-text-secondary)", padding: 2 }}
              title={mostrarAtual ? "Ocultar senha" : "Mostrar senha"}
            >
              {mostrarAtual ? "🙈" : "👁"}
            </button>
          </div>
        </div>

        {/* Campo nova senha */}
        <div>
          <label style={lbl}>NOVA SENHA</label>
          <div style={{ position: "relative" }}>
            <input
              type={mostrarSenha ? "text" : "password"}
              value={novaSenha}
              onChange={(e) => { setNovaSenha(e.target.value); setErro(""); }}
              placeholder="Digite sua nova senha"
              style={inp}
            />
            <button
              type="button"
              onClick={() => setMostrarSenha((v) => !v)}
              style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "var(--color-text-secondary)", padding: 2 }}
              title={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
            >
              {mostrarSenha ? "🙈" : "👁"}
            </button>
          </div>

          {/* Barra de força */}
          {novaSenha && (
            <div style={{ marginTop: 10 }}>
              <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
                {([1, 2, 3] as const).map((n) => (
                  <div
                    key={n}
                    style={{
                      flex: 1, height: 4, borderRadius: 2,
                      background: forca >= n ? forcaCfg.cor : "var(--color-border-secondary)",
                      transition: "background 0.25s",
                    }}
                  />
                ))}
              </div>
              {forca > 0 && (
                <div style={{ fontSize: 11, fontWeight: 700, color: forcaCfg.cor }}>{forcaCfg.label}</div>
              )}
            </div>
          )}

          {/* Requisitos */}
          {novaSenha && (
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 5 }}>
              {REQUISITOS_SENHA.map((r) => {
                const ok = r.ok(novaSenha);
                return (
                  <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12 }}>
                    <span style={{ fontSize: 11, color: ok ? "#10B981" : "var(--color-text-secondary)", flexShrink: 0 }}>
                      {ok ? "✓" : "○"}
                    </span>
                    <span style={{ color: ok ? "#10B981" : "var(--color-text-secondary)", fontWeight: ok ? 600 : 400 }}>
                      {r.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Campo confirmar senha */}
        <div>
          <label style={lbl}>CONFIRMAR NOVA SENHA</label>
          <div style={{ position: "relative" }}>
            <input
              type={mostrarConfirm ? "text" : "password"}
              value={confirmarSenha}
              onChange={(e) => { setConfirmarSenha(e.target.value); setErro(""); }}
              onKeyDown={(e) => e.key === "Enter" && salvar()}
              placeholder="Repita a nova senha"
              style={{
                ...inp,
                borderColor: confirmarSenha && novaSenha !== confirmarSenha
                  ? "rgba(239,68,68,0.6)"
                  : confirmarSenha && novaSenha === confirmarSenha
                  ? "rgba(16,185,129,0.5)"
                  : undefined,
              }}
            />
            <button
              type="button"
              onClick={() => setMostrarConfirm((v) => !v)}
              style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "var(--color-text-secondary)", padding: 2 }}
              title={mostrarConfirm ? "Ocultar senha" : "Mostrar senha"}
            >
              {mostrarConfirm ? "🙈" : "👁"}
            </button>
          </div>
          {confirmarSenha && novaSenha !== confirmarSenha && (
            <div style={{ fontSize: 11, color: "#EF4444", marginTop: 5 }}>As senhas não coincidem.</div>
          )}
          {confirmarSenha && novaSenha === confirmarSenha && (
            <div style={{ fontSize: 11, color: "#10B981", marginTop: 5 }}>✓ As senhas coincidem.</div>
          )}
        </div>

        <button
          onClick={salvar}
          disabled={salvando || !todosCumpridos || novaSenha !== confirmarSenha}
          style={{
            padding: "10px 28px", borderRadius: 9, width: "fit-content",
            background: salvo
              ? "rgba(5,150,105,0.1)"
              : !todosCumpridos || novaSenha !== confirmarSenha
              ? "var(--color-border-secondary)"
              : "var(--color-text-primary)",
            color: salvo ? "#059669" : !todosCumpridos || novaSenha !== confirmarSenha ? "var(--color-text-secondary)" : "var(--color-background-primary)",
            border: salvo ? "0.5px solid rgba(5,150,105,0.4)" : "none",
            fontSize: 13, fontWeight: 700,
            cursor: salvando || !todosCumpridos || novaSenha !== confirmarSenha ? "not-allowed" : "pointer",
            transition: "all 0.2s",
          }}
        >
          {salvando ? "Salvando…" : salvo ? "✓ Senha alterada!" : "Alterar senha"}
        </button>
      </div>
    </div>
  );
}

// ── Agenda (iCal) ────────────────────────────────────────────────────────────
function AgendaConfig() {
  const { fotografo } = useFotografo();
  const [url, setUrl]         = useState(fotografo?.ical_url ?? "");
  const [salvando, setSalvando] = useState(false);
  const [ok, setOk]           = useState(false);
  const [erro, setErro]       = useState("");

  useEffect(() => { setUrl(fotografo?.ical_url ?? ""); }, [fotografo]);

  async function salvar() {
    setSalvando(true); setOk(false); setErro("");
    const supabase = createClient();
    const { error } = await supabase
      .from("fotografos")
      .update({ ical_url: url.trim() || null })
      .eq("id", fotografo!.id);
    if (error) setErro(error.message);
    else setOk(true);
    setSalvando(false);
  }

  return (
    <div>
      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 0, marginBottom: 20, lineHeight: 1.6 }}>
        Cole o link iCal do AlboomCRM, Google Calendar ou qualquer sistema compatível para ver seus eventos na agenda do UseFokio.
      </p>

      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 6 }}>
        Link iCal
      </label>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          type="url"
          value={url}
          onChange={(e) => { setUrl(e.target.value); setOk(false); }}
          placeholder="https://…/calendar.ics"
          style={{ ...inputStyle, flex: 1, fontSize: 13 }}
        />
        <button
          onClick={salvar}
          disabled={salvando}
          style={{
            padding: "0 20px", borderRadius: 8, border: "none", cursor: salvando ? "not-allowed" : "pointer",
            background: salvando ? "#93C5FD" : "#2563EB", color: "#fff", fontSize: 13, fontWeight: 700,
            whiteSpace: "nowrap",
          }}
        >
          {salvando ? "Salvando…" : "Salvar"}
        </button>
      </div>

      {ok && (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 13, color: "#059669", fontWeight: 600 }}>✓ Link salvo!</span>
          <a href="/agenda" style={{ fontSize: 13, color: "#2563EB", textDecoration: "none", fontWeight: 600 }}>
            Ver agenda →
          </a>
        </div>
      )}
      {erro && <p style={{ fontSize: 13, color: "#DC2626", margin: 0 }}>{erro}</p>}

      <div style={{
        marginTop: 20, padding: "14px 16px",
        background: "var(--color-background-secondary)",
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: 9, fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.7,
      }}>
        <strong style={{ color: "var(--color-text-primary)" }}>Como obter o link no AlboomCRM:</strong><br />
        Acesse o AlboomCRM → Agenda → clique no ícone de integração/exportar → copie o <em>link iCal</em> e cole acima.
      </div>
    </div>
  );
}

// ── Página principal ─────────────────────────────────────────────────────────
export default function ConfigPage() {
  const [tab, setTab] = useState<Tab>("categorias");

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "categorias",  label: "Categorias de fotos",   icon: "🏷️" },
    { id: "identidade",  label: "Identidade visual",     icon: "🎨" },
    { id: "mensagens",   label: "Modelos de mensagem",   icon: "✉️" },
    { id: "email",       label: "Servidor de e-mail",     icon: "📧" },
    { id: "pagamentos",  label: "Pagamentos (Asaas)",     icon: "💳" },
    { id: "seguranca",   label: "Segurança",              icon: "🔐" },
  ];

  return (
    <div style={{ padding: "26px 30px", maxWidth: 740 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 19, fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 3px", letterSpacing: "-0.02em" }}>Configurações</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>Personalize seu espaço no UseFokio</p>
      </div>

      {/* Tabs laterais */}
      <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>

        {/* Menu lateral */}
        <div style={{ width: 200, flexShrink: 0 }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                display: "flex", alignItems: "center", gap: 9,
                width: "100%", padding: "9px 12px",
                borderRadius: 8, border: "none", cursor: "pointer",
                background: tab === t.id ? "var(--color-background-secondary)" : "transparent",
                color: tab === t.id ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                fontSize: 13, fontWeight: tab === t.id ? 600 : 400,
                textAlign: "left", marginBottom: 2,
                borderLeft: tab === t.id ? "2px solid #2563EB" : "2px solid transparent",
              }}
            >
              <span>{t.icon}</span>
              {t.label}
            </button>
          ))}

          {/* Separador + link para plano */}
          <div style={{ margin: "10px 0", borderTop: "0.5px solid var(--color-border-tertiary)" }} />
          <Link
            href="/conta/plano"
            style={{
              display: "flex", alignItems: "center", gap: 9,
              width: "100%", padding: "9px 12px",
              borderRadius: 8,
              color: "var(--color-text-secondary)",
              fontSize: 13, fontWeight: 400,
              textDecoration: "none",
              borderLeft: "2px solid transparent",
            }}
          >
            <span>💳</span>
            Plano e uso
          </Link>
        </div>

        {/* Conteúdo */}
        <div style={{
          flex: 1,
          background: "var(--color-background-primary)",
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: 12, padding: "24px 28px",
        }}>
          {tab === "categorias"  && <Categorias />}
          {tab === "identidade"  && <IdentidadeVisual />}
          {tab === "mensagens"   && <MensagensConfig />}
          {tab === "email"       && <ConfigEmail />}
          {tab === "pagamentos"  && <ConfigPagamentos />}
          {tab === "seguranca"   && <AlterarSenha />}
        </div>
      </div>

      {/* Card de plano abaixo do painel principal */}
      <div style={{ marginTop: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.04em" }}>
          Plano atual
        </div>
        <CardPlano />
      </div>
    </div>
  );
}
