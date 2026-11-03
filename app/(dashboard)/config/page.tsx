"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import type { Categoria } from "@/lib/supabase/types";
import { inputStyle } from "@/lib/styles";
import { mascaraMoeda, parseMoeda, formatarMoeda } from "@/lib/moeda";
import { validarChavePix } from "@/lib/pix/validarChave";

type Tab = "categorias" | "mensagens";

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

  async function excluir(id: string) {
    const supabase = createClient();
    await supabase.from("categorias").delete().eq("id", id);
    setLista((l) => l.filter((c) => c.id !== id));
  }

  return (
    <div>
      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 0, marginBottom: 20 }}>
        Categorias organizam suas galerias. Os valores de renovação e o prazo de acesso por categoria ficam em{" "}
        <a href="/configuracoes/financeiro/galeria-entrega" style={{ color: "#2563EB", fontWeight: 600, textDecoration: "none" }}>⚙️ Configurações → Financeiro</a>.
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
                padding: "10px 14px",
                borderBottom: i < lista.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none",
                background: "var(--color-background-primary)",
              }}
            >
              {/* Linha 1: nome (largura toda) + excluir */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 14, opacity: 0.3, cursor: "grab", flexShrink: 0 }}>⠿</span>
                <input
                  defaultValue={cat.nome}
                  onBlur={(e) => salvarNome(cat.id, e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                  style={{ ...inputStyle, flex: 1, padding: "6px 10px", fontSize: 13 }}
                />
                <button
                  onClick={() => excluir(cat.id)}
                  title="Excluir categoria"
                  style={{ padding: "5px 11px", borderRadius: 6, background: "rgba(239,68,68,0.06)", border: "0.5px solid rgba(239,68,68,0.2)", fontSize: 12, cursor: "pointer", color: "#EF4444", flexShrink: 0 }}
                >🗑</button>
              </div>
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
    { id: "mensagens",   label: "Modelos de mensagem",   icon: "✉️" },
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
          <a href="/configuracoes/financeiro/recebimento" style={{ display: "block", fontSize: 12, color: "var(--color-text-secondary)", padding: "9px 12px", textDecoration: "none" }}>
            💳 Pagamentos (Asaas/PIX) agora ficam em ⚙️ Configurações → Financeiro
          </a>

        </div>

        {/* Conteúdo */}
        <div style={{
          flex: 1,
          background: "var(--color-background-primary)",
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: 12, padding: "24px 28px",
        }}>
          {tab === "categorias"  && <Categorias />}
          {tab === "mensagens"   && <MensagensConfig />}
        </div>
      </div>

    </div>
  );
}
