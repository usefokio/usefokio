"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import { PLANOS, pctUso, corBarra, type PlanoId } from "@/lib/planos";
import type { Categoria, ConfigVendaFotos } from "@/lib/supabase/types";
import { inputStyle } from "@/lib/styles";

type Tab = "categorias" | "venda" | "entrega" | "identidade";

// ── Gerenciador de categorias ────────────────────────────────────────────────
function Categorias() {
  const { fotografo } = useFotografo();
  const [lista, setLista]         = useState<Categoria[]>([]);
  const [loading, setLoading]     = useState(true);
  const [novoNome, setNovoNome]   = useState("");
  const [salvando, setSalvando]   = useState(false);
  const [editando, setEditando]   = useState<string | null>(null);
  const [editNome, setEditNome]   = useState("");
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

  async function salvarEdicao(id: string) {
    const nome = editNome.trim();
    if (!nome) return;
    const supabase = createClient();
    await supabase.from("categorias").update({ nome }).eq("id", id);
    setLista((l) => l.map((c) => c.id === id ? { ...c, nome } : c));
    setEditando(null);
  }

  async function excluir(id: string) {
    const supabase = createClient();
    await supabase.from("categorias").delete().eq("id", id);
    setLista((l) => l.filter((c) => c.id !== id));
  }

  return (
    <div>
      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 0, marginBottom: 20 }}>
        Categorias são usadas para organizar as fotos dentro de uma galeria de seleção. Você pode criar e gerenciar quantas quiser.
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

              {editando === cat.id ? (
                <input
                  value={editNome}
                  onChange={(e) => setEditNome(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") salvarEdicao(cat.id);
                    if (e.key === "Escape") setEditando(null);
                  }}
                  style={{ ...inputStyle, flex: 1, padding: "5px 10px", fontSize: 13 }}
                  autoFocus
                />
              ) : (
                <span style={{ flex: 1, fontSize: 13, color: "var(--color-text-primary)", fontWeight: 500 }}>
                  {cat.nome}
                </span>
              )}

              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                {editando === cat.id ? (
                  <>
                    <button onClick={() => salvarEdicao(cat.id)} style={{ padding: "4px 12px", borderRadius: 6, background: "#2563EB", color: "#fff", border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Salvar</button>
                    <button onClick={() => setEditando(null)} style={{ padding: "4px 10px", borderRadius: 6, background: "transparent", color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-secondary)", fontSize: 12, cursor: "pointer" }}>✕</button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => { setEditando(cat.id); setEditNome(cat.nome); }}
                      style={{ padding: "4px 10px", borderRadius: 6, background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-secondary)", fontSize: 12, cursor: "pointer", color: "var(--color-text-secondary)" }}
                    >✏️</button>
                    <button
                      onClick={() => excluir(cat.id)}
                      style={{ padding: "4px 10px", borderRadius: 6, background: "rgba(239,68,68,0.06)", border: "0.5px solid rgba(239,68,68,0.2)", fontSize: 12, cursor: "pointer", color: "#EF4444" }}
                    >🗑</button>
                  </>
                )}
              </div>
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
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);

  useEffect(() => {
    if (fotografo) setMensagem(fotografo.mensagem_padrao_entrega ?? "");
  }, [fotografo]);

  async function salvar() {
    if (!fotografo) return;
    setSaving(true);
    const supabase = createClient();
    await supabase
      .from("fotografos")
      .update({ mensagem_padrao_entrega: mensagem.trim() || null })
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

      {saved && (
        <div style={{ fontSize: 13, color: "#059669", marginBottom: 14, marginTop: 14 }}>✓ Mensagem padrão salva!</div>
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

// ── Identidade Visual ─────────────────────────────────────────────────────────
function IdentidadeVisual() {
  const { fotografo, reload } = useFotografo();
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
      // Bust cache so preview updates immediately
      setUrl(data.publicUrl + "?t=" + Date.now());
      const field = tipo === "logo" ? "logo_url" : "watermark_url";
      await supabase.from("fotografos").update({ [field]: data.publicUrl }).eq("id", fotografo.id);
      await reload();
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
    await reload();
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
  const pct    = pctUso(usadas, plano);
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
          <span style={{ marginLeft: "auto", fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)" }}>
            {plano.preco === 0 ? "Grátis" : `R$ ${plano.preco}/mês`}
          </span>
        </div>

        {pct !== null && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12 }}>
              <span style={{ color: "var(--color-text-secondary)" }}>Fotos usadas</span>
              <span style={{ fontWeight: 600, color: pct >= 80 ? bc : "var(--color-text-primary)" }}>
                {usadas.toLocaleString("pt-BR")} / {plano.limite_fotos!.toLocaleString("pt-BR")}
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

// ── Página principal ─────────────────────────────────────────────────────────
export default function ConfigPage() {
  const [tab, setTab] = useState<Tab>("categorias");

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "categorias",  label: "Categorias de fotos",   icon: "🏷️" },
    { id: "identidade",  label: "Identidade visual",     icon: "🎨" },
    { id: "venda",       label: "Venda de fotos extras",  icon: "💰" },
    { id: "entrega",     label: "Galerias de entrega",    icon: "📦" },
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
