"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import { PLANOS, pctUso, corBarra, limiteEfetivo, type PlanoId } from "@/lib/planos";
import type { Categoria, ConfigVendaFotos } from "@/lib/supabase/types";
import { inputStyle } from "@/lib/styles";
import { mascaraMoeda, parseMoeda, formatarMoeda } from "@/lib/moeda";
import { DoacaoDev } from "../_components/DoacaoDev";

type Tab = "categorias" | "venda" | "entrega" | "identidade" | "pagamentos" | "seguranca" | "mensagens" | "agenda";

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

// ── Configuração de venda de fotos ───────────────────────────────────────────
function VendaFotos() {
  const { fotografo } = useFotografo();
  const [cfg, setCfg]       = useState<Partial<ConfigVendaFotos>>({ ativa: false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);

  useEffect(() => { carregar(); }, [fotografo]);

  async function carregar() {
    if (!fotografo) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("config_venda_fotos")
      .select("*")
      .eq("fotografo_id", fotografo.id)
      .maybeSingle();
    if (data) setCfg(data);
    setLoading(false);
  }

  async function salvar() {
    if (!fotografo) return;
    setSaving(true);
    const supabase = createClient();
    const payload = {
      fotografo_id:       fotografo.id,
      ativa:              cfg.ativa ?? false,
      preco_por_foto:     cfg.ativa ? (cfg.preco_por_foto ?? null) : null,
      pacote_minimo:      cfg.ativa ? (cfg.pacote_minimo ?? null) : null,
      descricao_checkout: cfg.ativa ? (cfg.descricao_checkout ?? null) : null,
      updated_at:         new Date().toISOString(),
    };
    await supabase.from("config_venda_fotos").upsert(payload, { onConflict: "fotografo_id" });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  const upd = (k: keyof ConfigVendaFotos, v: unknown) =>
    setCfg((c) => ({ ...c, [k]: v }));

  if (loading) return <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>;

  return (
    <div>
      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 0, marginBottom: 24 }}>
        Configure a venda de fotos extras para seus clientes. Estas configurações servem como padrão e podem ser ajustadas individualmente em cada galeria.
      </p>

      {/* Toggle ativo */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 18px",
        background: cfg.ativa ? "rgba(37,99,235,0.05)" : "var(--color-background-secondary)",
        border: `0.5px solid ${cfg.ativa ? "rgba(37,99,235,0.3)" : "var(--color-border-secondary)"}`,
        borderRadius: 10, marginBottom: 20, cursor: "pointer",
        transition: "all 0.2s",
      }}
        onClick={() => upd("ativa", !cfg.ativa)}
      >
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>Venda de fotos extras</div>
          <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>
            {cfg.ativa ? "Ativada — clientes poderão comprar fotos adicionais" : "Desativada"}
          </div>
        </div>
        {/* Toggle visual */}
        <div style={{
          width: 40, height: 22, borderRadius: 11, flexShrink: 0,
          background: cfg.ativa ? "#2563EB" : "var(--color-border-secondary)",
          position: "relative", transition: "background 0.2s",
        }}>
          <div style={{
            position: "absolute", top: 3, width: 16, height: 16, borderRadius: "50%",
            background: "#fff", transition: "left 0.2s",
            left: cfg.ativa ? 21 : 3,
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
          }} />
        </div>
      </div>

      {/* Campos — só aparece se ativo */}
      {cfg.ativa && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", display: "block", marginBottom: 6 }}>
              Preço por foto extra (R$) *
            </label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "var(--color-text-secondary)" }}>R$</span>
              <input
                type="number"
                min={0}
                step={0.01}
                value={cfg.preco_por_foto ?? ""}
                onChange={(e) => upd("preco_por_foto", e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="0,00"
                style={{ ...inputStyle, paddingLeft: 32 }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", display: "block", marginBottom: 6 }}>
              Venda a partir de (nº de fotos) *
            </label>
            <input
              type="number"
              min={1}
              value={cfg.pacote_minimo ?? ""}
              onChange={(e) => upd("pacote_minimo", e.target.value ? parseInt(e.target.value) : null)}
              placeholder="Ex: 50"
              style={inputStyle}
            />
            <p style={{ fontSize: 11, color: "var(--color-text-secondary)", margin: "4px 0 0" }}>
              O cliente pode comprar extras só após selecionar este mínimo.
            </p>
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", display: "block", marginBottom: 6 }}>
              Mensagem exibida ao cliente na compra
            </label>
            <textarea
              value={cfg.descricao_checkout ?? ""}
              onChange={(e) => upd("descricao_checkout", e.target.value)}
              placeholder="Ex: Cada foto adicional custa R$ 15,00. O pagamento será feito via Pix após a confirmação da seleção."
              rows={3}
              style={{ ...inputStyle, resize: "vertical", height: "auto" }}
            />
          </div>
        </div>
      )}

      {saved && (
        <div style={{ fontSize: 13, color: "#059669", marginBottom: 14 }}>✓ Configurações salvas!</div>
      )}

      <button
        onClick={salvar}
        disabled={saving}
        style={{
          padding: "10px 28px", borderRadius: 8,
          background: saving ? "#93C5FD" : "#2563EB",
          color: "#fff", border: "none", fontSize: 13,
          fontWeight: 700, cursor: saving ? "not-allowed" : "pointer",
        }}
      >
        {saving ? "Salvando…" : "Salvar configurações"}
      </button>
    </div>
  );
}

// ── Configuração de Entrega ──────────────────────────────────────────────────
function ConfigEntrega() {
  const { fotografo, reload } = useFotografo();
  const [mensagem, setMensagem] = useState("");
  const [taxaPadrao, setTaxaPadrao] = useState("");
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);

  useEffect(() => {
    if (fotografo) {
      setMensagem(fotografo.mensagem_padrao_entrega ?? "");
      setTaxaPadrao(fotografo.renewal_fee_padrao != null ? formatarMoeda(fotografo.renewal_fee_padrao) : "");
    }
  }, [fotografo]);

  async function salvar() {
    if (!fotografo) return;
    setSaving(true);
    const supabase = createClient();
    await supabase
      .from("fotografos")
      .update({
        mensagem_padrao_entrega: mensagem.trim() || null,
        renewal_fee_padrao: parseMoeda(taxaPadrao),
      })
      .eq("id", fotografo.id);
    await reload();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div>
      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 0, marginBottom: 24 }}>
        Configure a mensagem padrão enviada aos clientes nas galerias de entrega. Ela será pré-preenchida automaticamente ao criar uma nova galeria, mas pode ser editada em cada caso.
      </p>

      <div>
        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 7 }}>
          Mensagem padrão
        </label>
        <textarea
          value={mensagem}
          onChange={(e) => setMensagem(e.target.value)}
          placeholder="Olá {nome}! Suas fotos estão prontas 🎉 Acesse o link abaixo para fazer o download…"
          rows={6}
          style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6, width: "100%", boxSizing: "border-box" }}
        />
        <p style={{ fontSize: 11, color: "var(--color-text-secondary)", margin: "6px 0 0" }}>
          Dica: você pode usar {"{nome}"} para personalizar com o nome do cliente.
        </p>
      </div>

      <div style={{ marginTop: 24 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 7 }}>
          Taxa de renovação padrão
        </label>
        <div style={{ position: "relative", width: 200 }}>
          <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "var(--color-text-secondary)", pointerEvents: "none" }}>R$</span>
          <input
            type="text" inputMode="numeric"
            value={taxaPadrao}
            onChange={(e) => setTaxaPadrao(mascaraMoeda(e.target.value))}
            placeholder="0,00"
            style={{ ...inputStyle, width: "100%", paddingLeft: 34 }}
          />
        </div>
        <p style={{ fontSize: 11, color: "var(--color-text-secondary)", margin: "6px 0 0" }}>
          Valor pré-preenchido como taxa de renovação ao criar uma nova galeria de entrega.
        </p>
      </div>

      {saved && (
        <div style={{ fontSize: 13, color: "#059669", marginBottom: 14, marginTop: 14 }}>✓ Configurações salvas!</div>
      )}

      <button
        onClick={salvar}
        disabled={saving}
        style={{
          marginTop: 20, padding: "10px 28px", borderRadius: 8,
          background: saving ? "#93C5FD" : "#2563EB",
          color: "#fff", border: "none", fontSize: 13,
          fontWeight: 700, cursor: saving ? "not-allowed" : "pointer",
        }}
      >
        {saving ? "Salvando…" : "Salvar mensagem padrão"}
      </button>
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
    quando: "Mensagem de WhatsApp (4 dias após o 2º email) — menciona as tentativas anteriores por email.",
    variaveis: "{nomeCliente}, {titulo}, {respostaUrl}, {nomeEmpresa}, {dataEmail1}, {dataEmail2}",
    padrao: "Olá, {nomeCliente}! Tudo bem?\n\nSou {nomeEmpresa} e estou tentando falar com você sobre as fotos de {titulo}.\n\nEnviei emails nos dias {dataEmail1} e {dataEmail2}, mas ainda não recebi resposta. Caso não tenha recebido, verifique a pasta de spam.\n\nPreciso que você me diga o que prefere fazer com esses arquivos — é rapidinho:\n{respostaUrl}\n\n✅ Já tenho minhas fotos salvas\n🔄 Quero renovar o acesso\n\nObrigado!",
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
    const payload = Object.fromEntries(Object.entries(templates).filter(([, v]) => v.trim()));
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
                  value={templates[def.id] ?? ""}
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

// ── Pagamentos (Asaas) ────────────────────────────────────────────────────────
function ConfigPagamentos() {
  const { fotografo, reload } = useFotografo();
  const [apiKey,    setApiKey]    = useState("");
  const [ambiente,  setAmbiente]  = useState<"producao" | "sandbox">("producao");
  const [salvando,  setSalvando]  = useState(false);
  const [erro,      setErro]      = useState("");
  const [contaNome, setContaNome] = useState<string | null>(null);

  const conectado = fotografo?.asaas_ativo ?? false;

  async function conectar() {
    if (!apiKey.trim()) { setErro("Cole sua API key do Asaas."); return; }
    setSalvando(true);
    setErro("");
    try {
      const res = await fetch("/api/asaas/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: apiKey.trim(), ambiente }),
      });
      const json = await res.json();
      if (!res.ok) { setErro(json.erro ?? "Erro ao conectar."); return; }
      setContaNome(json.conta?.nome ?? null);
      setApiKey("");
      await reload();
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setSalvando(false);
    }
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
          <button onClick={desconectar} disabled={salvando} style={{ padding: "8px 16px", borderRadius: 8, border: "0.5px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.05)", fontSize: 12, fontWeight: 600, color: "#DC2626", cursor: "pointer" }}>
            Desconectar conta
          </button>
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

      {/* Doação ao desenvolvedor */}
      <div style={{ borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 4 }}>❤️ Apoie o desenvolvedor</div>
        <DoacaoDev />
      </div>
    </div>
  );
}

// ── Identidade Visual ─────────────────────────────────────────────────────────
function IdentidadeVisual() {
  const { fotografo } = useFotografo();
  const [saving, setSaving]   = useState(false);
  const [saved,  setSaved]    = useState(false);
  const [logoUrl,      setLogoUrl]      = useState<string | null>(null);
  const [watermarkUrl, setWatermarkUrl] = useState<string | null>(null);
  const [logoUploading,      setLogoUploading]      = useState(false);
  const [watermarkUploading, setWatermarkUploading] = useState(false);
  const logoInputRef      = useRef<HTMLInputElement>(null);
  const watermarkInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (fotografo) {
      setLogoUrl(fotografo.logo_url ?? null);
      setWatermarkUrl(fotografo.watermark_url ?? null);
    }
  }, [fotografo]);

  async function uploadImagem(
    file: File,
    tipo: "logo" | "watermark",
    setUploading: (v: boolean) => void,
    setUrl: (v: string | null) => void,
  ) {
    if (!fotografo) return;
    setUploading(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop() ?? "png";
    const path = `assets/${fotografo.id}/${tipo}.${ext}`;
    const { error } = await supabase.storage
      .from("galerias")
      .upload(path, file, { contentType: file.type, upsert: true });
    if (!error) {
      const { data } = supabase.storage.from("galerias").getPublicUrl(path);
      const field = tipo === "logo" ? "logo_url" : "watermark_url";
      await supabase.from("fotografos").update({ [field]: data.publicUrl }).eq("id", fotografo.id);
      setUrl(data.publicUrl + "?t=" + Date.now());
    }
    setUploading(false);
  }

  async function remover(tipo: "logo" | "watermark") {
    if (!fotografo) return;
    const supabase = createClient();
    const field = tipo === "logo" ? "logo_url" : "watermark_url";
    await supabase.from("fotografos").update({ [field]: null }).eq("id", fotografo.id);
    if (tipo === "logo") setLogoUrl(null);
    else setWatermarkUrl(null);
  }

  function UploadCard({ tipo, label, descricao, url, uploading, inputRef: ref }: {
    tipo: "logo" | "watermark";
    label: string;
    descricao: string;
    url: string | null;
    uploading: boolean;
    inputRef: React.RefObject<HTMLInputElement | null>;
  }) {
    const setUploadingFn = tipo === "logo" ? setLogoUploading : setWatermarkUploading;
    const setUrlFn       = tipo === "logo" ? setLogoUrl       : setWatermarkUrl;
    return (
      <div style={{ border: "0.5px solid var(--color-border-secondary)", borderRadius: 12, padding: "20px 22px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 16, lineHeight: 1.5 }}>{descricao}</div>

        {url ? (
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ background: "#F9FAFB", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 8, padding: 8, display: "flex", alignItems: "center", justifyContent: "center", minWidth: 80, minHeight: 60 }}>
              <img src={url} alt={label} style={{ maxHeight: 56, maxWidth: 140, objectFit: "contain" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                type="button"
                onClick={() => ref.current?.click()}
                style={{ padding: "7px 14px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", fontSize: 12, fontWeight: 600, cursor: "pointer", color: "var(--color-text-primary)" }}
              >
                {uploading ? "Enviando…" : "Trocar imagem"}
              </button>
              <button
                type="button"
                onClick={() => remover(tipo)}
                style={{ padding: "7px 14px", borderRadius: 8, border: "0.5px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.06)", fontSize: 12, fontWeight: 600, cursor: "pointer", color: "#DC2626" }}
              >
                Remover
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => ref.current?.click()}
            disabled={uploading}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 9, border: "1.5px dashed var(--color-border-secondary)", background: "var(--color-background-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "var(--color-text-secondary)", width: "100%" }}
          >
            <span style={{ fontSize: 20 }}>🖼</span>
            {uploading ? "Enviando…" : "Clique para enviar PNG"}
          </button>
        )}

        <input
          ref={ref}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadImagem(f, tipo, setUploadingFn, setUrlFn);
            e.target.value = "";
          }}
        />
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
          tipo="logo"
          label="Logo do estúdio"
          descricao="Exibida no topo da galeria de entrega do cliente (PNG ou JPG recomendado, fundo transparente)."
          url={logoUrl}
          uploading={logoUploading}
          inputRef={logoInputRef}
        />
        <UploadCard
          tipo="watermark"
          label="Marca d'água"
          descricao="Aplicada automaticamente nas fotos das galerias de seleção. Use um PNG com fundo transparente para melhor resultado."
          url={watermarkUrl}
          uploading={watermarkUploading}
          inputRef={watermarkInputRef}
        />
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
  const [novaSenha,      setNovaSenha]      = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [salvando,       setSalvando]       = useState(false);
  const [erro,           setErro]           = useState("");
  const [salvo,          setSalvo]          = useState(false);
  const [provedor,       setProvedor]       = useState<string | null>(null);
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
    });
  }, []);

  async function salvar() {
    if (!novaSenha)                    { setErro("Informe a nova senha."); return; }
    if (!todosCumpridos)               { setErro("A senha não atende todos os requisitos."); return; }
    if (novaSenha !== confirmarSenha)  { setErro("As senhas não coincidem."); return; }

    setSalvando(true); setErro("");
    const { error } = await createClient().auth.updateUser({ password: novaSenha });
    setSalvando(false);
    if (error) { setErro(error.message); return; }
    setNovaSenha(""); setConfirmarSenha("");
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
    { id: "venda",       label: "Venda de fotos extras",  icon: "💰" },
    { id: "entrega",     label: "Galerias de entrega",    icon: "📦" },
    { id: "mensagens",   label: "Modelos de mensagem",   icon: "✉️" },
    { id: "agenda",      label: "Agenda (iCal)",          icon: "📅" },
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
          {tab === "venda"       && <VendaFotos />}
          {tab === "entrega"     && <ConfigEntrega />}
          {tab === "mensagens"   && <MensagensConfig />}
          {tab === "agenda"      && <AgendaConfig />}
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
