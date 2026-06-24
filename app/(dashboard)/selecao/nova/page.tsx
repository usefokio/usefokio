"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import { useUnsavedGuard } from "@/lib/hooks/useUnsavedGuard";
import type { Categoria, ConfigVendaFotos, ResolucaoExibicao } from "@/lib/supabase/types";
import { processarImagem, aplicarMarcaDagua, formatBytes } from "@/lib/imageResize";
import { BETA_RESOLUCAO_MAXIMA } from "@/lib/planos";
import { Field } from "@/components/ui/Field";
import { ClienteSelect } from "@/components/ui/ClienteSelect";
import { inputStyle } from "@/lib/styles";

// ─── Arquivo em fila de upload ─────────────────────────────────────────────────
type ArquivoFila = {
  id:         string;
  file:       File;
  previewUrl: string;
  status:     "aguardando" | "processando" | "enviando" | "ok" | "erro";
  progresso:  number;
  erro?:      string;
};

// ─── Seletor de categorias ────────────────────────────────────────────────────
function CategoriaSelector({ fotografoId, selecionadas, onChange }: { fotografoId: string; selecionadas: string[]; onChange: (ids: string[]) => void }) {
  const [lista, setLista]       = useState<Categoria[]>([]);
  const [novoNome, setNovoNome] = useState("");
  const [criando, setCriando]   = useState(false);
  const [open, setOpen]         = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase.from("categorias").select("*").eq("fotografo_id", fotografoId).order("ordem").order("created_at");
      setLista(data ?? []);
    }
    load();
  }, [fotografoId]);

  useEffect(() => {
    function handleClick(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function criarCategoria() {
    const nome = novoNome.trim();
    if (!nome) return;
    setCriando(true);
    const supabase = createClient();
    const { data } = await supabase.from("categorias").insert({ fotografo_id: fotografoId, nome, ordem: lista.length }).select().single();
    if (data) { setLista((l) => [...l, data]); onChange([...selecionadas, data.id]); }
    setNovoNome(""); setCriando(false);
  }

  const toggle = (id: string) => onChange(selecionadas.includes(id) ? selecionadas.filter((s) => s !== id) : [...selecionadas, id]);
  const nomesSel = lista.filter((c) => selecionadas.includes(c.id)).map((c) => c.nome);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div onClick={() => setOpen((o) => !o)} style={{ ...inputStyle, cursor: "pointer", display: "flex", alignItems: "center", flexWrap: "wrap", gap: 5, minHeight: 40, userSelect: "none" }}>
        {nomesSel.length === 0 ? <span style={{ color: "var(--color-text-secondary)", fontSize: 13 }}>Selecione ou crie categorias…</span>
          : nomesSel.map((nome) => <span key={nome} style={{ background: "rgba(37,99,235,0.1)", color: "#2563EB", borderRadius: 5, padding: "2px 8px", fontSize: 12, fontWeight: 500 }}>{nome}</span>)}
        <span style={{ marginLeft: "auto", fontSize: 11, opacity: 0.4, flexShrink: 0 }}>▾</span>
      </div>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 50, background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-secondary)", borderRadius: 9, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", overflow: "hidden" }}>
          <div style={{ maxHeight: 200, overflowY: "auto" }}>
            {lista.length === 0
              ? <div style={{ padding: "12px 14px", fontSize: 12, color: "var(--color-text-secondary)" }}>Nenhuma categoria criada ainda — crie abaixo!</div>
              : lista.map((cat) => {
                const sel = selecionadas.includes(cat.id);
                return (
                  <div key={cat.id} onClick={() => toggle(cat.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", cursor: "pointer", background: sel ? "rgba(37,99,235,0.05)" : "transparent", fontSize: 13, color: "var(--color-text-primary)" }}
                    onMouseEnter={(e) => { if (!sel) e.currentTarget.style.background = "var(--color-background-secondary)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = sel ? "rgba(37,99,235,0.05)" : "transparent"; }}>
                    <div style={{ width: 16, height: 16, borderRadius: 4, flexShrink: 0, border: sel ? "none" : "1.5px solid var(--color-border-secondary)", background: sel ? "#2563EB" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {sel && <span style={{ color: "#fff", fontSize: 10, fontWeight: 700 }}>✓</span>}
                    </div>
                    {cat.nome}
                  </div>
                );
              })}
          </div>
          <div style={{ borderTop: "0.5px solid var(--color-border-tertiary)", padding: "10px 14px", display: "flex", gap: 8 }}>
            <input value={novoNome} onChange={(e) => setNovoNome(e.target.value)} onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter") criarCategoria(); }} placeholder="Nova categoria…" style={{ ...inputStyle, flex: 1, padding: "6px 10px", fontSize: 12 }} />
            <button onClick={criarCategoria} disabled={criando || !novoNome.trim()} style={{ padding: "6px 14px", borderRadius: 7, background: !novoNome.trim() ? "var(--color-background-secondary)" : "#2563EB", color: !novoNome.trim() ? "var(--color-text-secondary)" : "#fff", border: "none", fontSize: 12, fontWeight: 600, cursor: !novoNome.trim() ? "default" : "pointer", whiteSpace: "nowrap" }}>
              {criando ? "…" : "+ Criar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function addMonths(n: number): string {
  const d = new Date(); d.setMonth(d.getMonth() + n); return d.toISOString().split("T")[0];
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ padding: "10px 20px", borderBottom: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{title}</span>
      </div>
      <div style={{ padding: "20px" }}>{children}</div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
import { Suspense } from "react";

function NovaSelecaoConteudo() {
  const router        = useRouter();
  const params        = useSearchParams();
  const { fotografo } = useFotografo();

  const [cfgVenda, setCfgVenda]   = useState<ConfigVendaFotos | null>(null);

  // Campos do formulário
  const [titulo, setTitulo]         = useState("");
  const [categorias, setCategorias] = useState<string[]>([]);
  const [clienteId, setClienteId]   = useState(params.get("cliente") ?? "");
  const [dataEvento, setDataEvento] = useState(new Date().toISOString().split("T")[0]);
  const [prazo, setPrazo]           = useState("");
  const [resolucao, setResolucao]   = useState<ResolucaoExibicao>(BETA_RESOLUCAO_MAXIMA ? "hd" : "fullhd");
  const [selecaoLivre, setSelecaoLivre] = useState(true);
  const [limiteMin, setLimiteMin]   = useState("");
  const [limiteMax, setLimiteMax]   = useState("");
  const [vendaAtiva, setVendaAtiva] = useState(false);
  const [vendaPreco, setVendaPreco] = useState("");
  const [vendaPacoteMin, setVendaPacoteMin] = useState("");
  const [marcaDagua, setMarcaDagua] = useState(true);
  const [draftInitialized, setDraftInitialized] = useState(false);

  // Fila de upload
  const [fila, setFila]           = useState<ArquivoFila[]>([]);
  const inputRef                  = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver]   = useState(false);

  // Estado geral
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");
  // Fase de upload pós-criação
  const [galeriaId, setGaleriaId] = useState<string | null>(null);
  const [uploadAtual, setUploadAtual] = useState(0);
  const [successMsg, setSuccessMsg]   = useState<string | undefined>();
  const [uploadTotal, setUploadTotal] = useState(0);

  useEffect(() => {
    async function load() {
      if (!fotografo) return;
      const supabase = createClient();
      const [{ data: cfg }] = await Promise.all([
        supabase.from("config_venda_fotos").select("*").eq("fotografo_id", fotografo.id).maybeSingle(),
      ]);

      // Pré-preencher configurações padrão de venda
      if (cfg) {
        setCfgVenda(cfg);
        if (cfg.ativa) { setVendaAtiva(true); setVendaPreco(cfg.preco_por_foto?.toString() ?? ""); setVendaPacoteMin(cfg.pacote_minimo?.toString() ?? ""); }
      }
      setDraftInitialized(true);
    }
    load();
  }, [fotografo]);

  // Há dados que seriam perdidos ao sair? (formulário preenchido ou fotos na fila, antes de criar)
  const temAlteracoes = !galeriaId && (titulo.trim() !== "" || fila.length > 0 || categorias.length > 0);

  // Guarda de navegação: intercepta links internos e fechar aba
  const { modalAberto: modalSair, setModalAberto: setModalSair, pedirSaida, irParaDestino } = useUnsavedGuard(temAlteracoes);

  function handleSairClick() {
    if (temAlteracoes) { pedirSaida("/selecao"); return; }
    router.back();
  }

  // ── Fila de arquivos ──
  function adicionarArquivos(files: File[]) {
    const imgs = files.filter((f) => f.type.startsWith("image/"));
    const novos: ArquivoFila[] = imgs.map((f) => ({
      id: crypto.randomUUID(), file: f,
      previewUrl: URL.createObjectURL(f),
      status: "aguardando", progresso: 0,
    }));
    setFila((prev) => [...prev, ...novos]);
  }

  function removerArquivo(id: string) {
    setFila((prev) => {
      const item = prev.find((f) => f.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
  }

  // ── Salvar ──
  async function handleSave(status: "rascunho" | "ativa") {
    if (!titulo.trim())              { setError("Título é obrigatório."); return; }
    if (!fotografo)                  { setError("Sessão expirada."); return; }
    if (!selecaoLivre && !limiteMin) { setError("Informe o mínimo de fotos."); return; }
    if (vendaAtiva && !vendaPreco)   { setError("Informe o preço por foto extra."); return; }

    setSaving(true); setError("");
    const supabase = createClient();

    const { data, error: err } = await supabase.from("galerias_selecao").insert({
      fotografo_id: fotografo.id, cliente_id: clienteId || null,
      titulo: titulo.trim(), selecao_livre: selecaoLivre,
      limite_minimo: selecaoLivre ? null : (parseInt(limiteMin) || null),
      limite_maximo: selecaoLivre ? null : (parseInt(limiteMax) || null),
      resolucao_exibicao: BETA_RESOLUCAO_MAXIMA ? "hd" : resolucao, venda_ativa: vendaAtiva,
      venda_preco_unitario: vendaAtiva ? (parseFloat(vendaPreco) || null) : null,
      venda_pacote_minimo: vendaAtiva ? (parseInt(vendaPacoteMin) || null) : null,
      data_evento: dataEvento || null,
      expira_em: prazo ? new Date(prazo + "T23:59:59").toISOString() : null,
      marca_dagua: marcaDagua,
      status,
    }).select().single();

    if (err) { setError(err.message); setSaving(false); return; }

    // Categorias
    if (categorias.length > 0) {
      await supabase.from("galeria_selecao_categorias").insert(categorias.map((cat_id) => ({ galeria_id: data.id, categoria_id: cat_id })));
    }

    // Se não tem fotos em fila → vai direto
    if (fila.length === 0) { router.push(`/selecao/${data.id}`); return; }

    // Inicia upload das fotos na fila
    setGaleriaId(data.id);
    setUploadTotal(fila.length);
    setUploadAtual(0);

    const CONCORRENCIA = 3;
    let concluidos = 0;
    let filaIdx = 0;

    async function processarItem(item: ArquivoFila) {
      const updateItem = (patch: Partial<ArquivoFila>) =>
        setFila((prev) => prev.map((f) => f.id === item.id ? { ...f, ...patch } : f));

      try {
        updateItem({ status: "processando", progresso: 10 });
        const resolucaoUpload = BETA_RESOLUCAO_MAXIMA ? "hd" : resolucao;
        let processed = await processarImagem(item.file, resolucaoUpload);

        if (marcaDagua && fotografo.watermark_url) {
          const img = new Image();
          const blobUrl = URL.createObjectURL(processed.blob);
          await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = rej; img.src = blobUrl; });
          URL.revokeObjectURL(blobUrl);
          const canvas = document.createElement("canvas");
          canvas.width = processed.largura; canvas.height = processed.altura;
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(img, 0, 0);
          await aplicarMarcaDagua(ctx, processed.largura, processed.altura, fotografo.watermark_url);
          const watermarkedBlob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => b ? res(b) : rej(new Error("toBlob null")), "image/jpeg", 0.88));
          processed = { ...processed, blob: watermarkedBlob, tamanho_bytes: watermarkedBlob.size };
        }

        updateItem({ status: "enviando", progresso: 40 });

        const uuid      = crypto.randomUUID();
        const mainPath  = `${fotografo.id}/${data.id}/${uuid}.jpg`;
        const thumbPath = `${fotografo.id}/${data.id}/thumbs/${uuid}.jpg`;

        const { error: e1 } = await supabase.storage.from("galerias").upload(mainPath, processed.blob, { contentType: "image/jpeg", upsert: false });
        if (e1) throw new Error(e1.message);
        updateItem({ progresso: 65 });

        const { error: e2 } = await supabase.storage.from("galerias").upload(thumbPath, processed.thumbnail, { contentType: "image/jpeg", upsert: false });
        if (e2) throw new Error(e2.message);
        updateItem({ progresso: 80 });

        const { data: mainUrl }  = supabase.storage.from("galerias").getPublicUrl(mainPath);
        const { data: thumbUrl } = supabase.storage.from("galerias").getPublicUrl(thumbPath);

        const { error: e3 } = await supabase.from("galerias_selecao_fotos").insert({
          galeria_id: data.id, storage_path: mainPath,
          thumbnail_path: thumbUrl.publicUrl, url_publica: mainUrl.publicUrl,
          nome_arquivo: item.file.name, largura: processed.largura, altura: processed.altura,
          tamanho_bytes: processed.tamanho_bytes, resolucao: resolucaoUpload, ordem: 0,
        });
        if (e3) throw new Error(e3.message);

        updateItem({ status: "ok", progresso: 100 });
      } catch (err: any) {
        updateItem({ status: "erro", erro: err.message ?? "Erro no upload" });
      }

      concluidos++;
      setUploadAtual(concluidos);
    }

    async function worker() {
      while (filaIdx < fila.length) {
        const item = fila[filaIdx++];
        await processarItem(item);
      }
    }

    await Promise.all(Array.from({ length: Math.min(CONCORRENCIA, fila.length) }, worker));

    // Notifica cliente por email (fire-and-forget) — só se galeria ativa e tem cliente
    if (status === "ativa" && clienteId) {
      fetch("/api/email/galeria-criada", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ galeriaId: data.id }),
      }).catch(() => {});
    }

    setFila((filaAtual) => {
      const erros = filaAtual.filter((f) => f.status === "erro").length;
      const total = filaAtual.length;
      if (erros === 0) {
        setSuccessMsg(`✅ ${total} foto${total > 1 ? "s" : ""} enviada${total > 1 ? "s" : ""} com sucesso!`);
      }
      return filaAtual;
    });
  }

  // Fase de upload em andamento
  const emUpload = galeriaId !== null;
  const uploadPct = uploadTotal > 0 ? Math.round((uploadAtual / uploadTotal) * 100) : 0;

  // ─── Tela de progresso de upload ──
  if (emUpload) {
    return (
      <div style={{ padding: "40px 30px", maxWidth: 600, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: successMsg ? "#059669" : "var(--color-text-primary)", marginBottom: 6 }}>
            {successMsg ?? `Enviando fotos… ${uploadAtual}/${uploadTotal}`}
          </div>
          {successMsg ? (
            <button
              onClick={() => router.push(`/selecao/${galeriaId}`)}
              style={{ marginTop: 12, padding: "10px 28px", borderRadius: 8, border: "none", background: "#059669", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            >
              Ver galeria →
            </button>
          ) : (
            <>
              <div style={{ height: 6, background: "var(--color-background-secondary)", borderRadius: 3, marginBottom: 4 }}>
                <div style={{ height: "100%", background: "#2563EB", borderRadius: 3, width: `${uploadPct}%`, transition: "width 0.3s" }} />
              </div>
              <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{uploadPct}% concluído</div>
            </>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {fila.map((item) => (
            <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 8 }}>
              <img src={item.previewUrl} alt="" style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 4, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {item.file.name}
                </div>
                {item.status !== "aguardando" && item.status !== "ok" && item.status !== "erro" && (
                  <div style={{ height: 3, background: "var(--color-background-secondary)", borderRadius: 2, marginTop: 4 }}>
                    <div style={{ height: "100%", background: "#2563EB", borderRadius: 2, width: `${item.progresso}%`, transition: "width 0.3s" }} />
                  </div>
                )}
              </div>
              <div style={{ fontSize: 12, flexShrink: 0, color: item.status === "ok" ? "#059669" : item.status === "erro" ? "#EF4444" : "var(--color-text-secondary)" }}>
                {item.status === "aguardando" ? "—"
                  : item.status === "processando" ? "⏳ Processando"
                  : item.status === "enviando" ? `📤 ${item.progresso}%`
                  : item.status === "ok" ? "✓ Enviado"
                  : `⚠ ${item.erro}`}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "26px 30px", maxWidth: 740 }}>

      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => router.push("/selecao")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 13, padding: 0 }}>
            ← Seleções
          </button>
          <span style={{ color: "var(--color-border-secondary)" }}>/</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>Nova galeria de seleção</span>
        </div>
        <button
          onClick={() => handleSave("ativa")}
          disabled={saving || !titulo.trim()}
          style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: saving || !titulo.trim() ? "var(--color-background-secondary)" : "#2563EB", color: saving || !titulo.trim() ? "var(--color-text-secondary)" : "#fff", fontSize: 13, fontWeight: 600, cursor: saving || !titulo.trim() ? "default" : "pointer", flexShrink: 0 }}
        >
          {saving ? "Criando…" : fila.length > 0 ? `Criar e enviar ${fila.length} foto${fila.length !== 1 ? "s" : ""}` : "Criar e ativar"}
        </button>
      </div>

      {error && (
        <div style={{ background: "rgba(239,68,68,0.08)", border: "0.5px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "10px 16px", marginBottom: 16, fontSize: 13, color: "#EF4444" }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

        {/* ── 1. Informações básicas ── */}
        <Section title="Informações básicas">
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            <Field label="Nome da galeria *">
              <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Casamento Ana & Pedro" style={inputStyle} autoFocus />
            </Field>

            <Field label="Categorias de fotos">
              {fotografo && <CategoriaSelector fotografoId={fotografo.id} selecionadas={categorias} onChange={setCategorias} />}
              <p style={{ fontSize: 11, color: "var(--color-text-secondary)", margin: "5px 0 0" }}>
                Organizam as fotos para o cliente. Crie novas diretamente aqui ou em{" "}
                <a href="/config" target="_blank" style={{ color: "#2563EB" }}>Configurações</a>.
              </p>
            </Field>

            <Field label="Cliente">
              <ClienteSelect value={clienteId} onChange={(id) => setClienteId(id)} />
            </Field>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Field label="Data do evento">
                <input type="date" value={dataEvento} onChange={(e) => setDataEvento(e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Prazo de seleção">
                <input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} style={inputStyle} />
                <div style={{ display: "flex", gap: 6, marginTop: 7 }}>
                  {[{ label: "+1 mês", n: 1 }, { label: "+2 meses", n: 2 }, { label: "+3 meses", n: 3 }].map(({ label, n }) => (
                    <button key={n} type="button" onClick={() => setPrazo(addMonths(n))} style={{ flex: 1, padding: "5px 0", borderRadius: 6, fontSize: 11, fontWeight: 600, border: "0.5px solid var(--color-border-secondary)", background: prazo === addMonths(n) ? "var(--color-text-primary)" : "var(--color-background-secondary)", color: prazo === addMonths(n) ? "var(--color-background-primary)" : "var(--color-text-secondary)", cursor: "pointer", transition: "all 0.15s" }}>
                      {label}
                    </button>
                  ))}
                </div>
              </Field>
            </div>

            <Field label="Resolução de exibição das fotos">
              <div style={{ display: "flex", gap: 8 }}>
                {(["hd", "fullhd", "4k"] as ResolucaoExibicao[]).map((r) => {
                  const bloqueado = BETA_RESOLUCAO_MAXIMA && r !== "hd";
                  const ativo     = resolucao === r && !bloqueado;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => !bloqueado && setResolucao(r)}
                      title={bloqueado ? "Disponível após o beta" : undefined}
                      style={{
                        flex: 1, padding: "10px 8px", borderRadius: 8,
                        cursor: bloqueado ? "not-allowed" : "pointer",
                        border: `0.5px solid ${ativo ? "#2563EB" : "var(--color-border-tertiary)"}`,
                        background: bloqueado ? "var(--color-background-tertiary)" : ativo ? "rgba(37,99,235,0.07)" : "var(--color-background-secondary)",
                        color: bloqueado ? "var(--color-text-secondary)" : ativo ? "#2563EB" : "var(--color-text-secondary)",
                        fontSize: 12, fontWeight: ativo ? 700 : 400,
                        opacity: bloqueado ? 0.45 : 1,
                        transition: "all 0.15s",
                        position: "relative",
                      }}
                    >
                      {r === "hd" ? "HD" : r === "fullhd" ? "Full HD" : "4K"}
                      <div style={{ fontSize: 10, marginTop: 2, opacity: 0.7 }}>
                        {r === "hd" ? "1.280px" : r === "fullhd" ? "1.920px" : "3.840px"}
                      </div>
                      {bloqueado && (
                        <div style={{ fontSize: 9, marginTop: 3, color: "#F59E0B", fontWeight: 600 }}>
                          🔒 beta
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              {BETA_RESOLUCAO_MAXIMA && (
                <p style={{ fontSize: 11, color: "#B45309", margin: "6px 0 0", background: "rgba(245,158,11,0.08)", border: "0.5px solid rgba(245,158,11,0.25)", borderRadius: 6, padding: "6px 10px" }}>
                  🧪 <strong>Fase beta:</strong> uploads limitados a HD (1.280px) para economizar armazenamento. Full HD e 4K estarão disponíveis em breve.
                </p>
              )}
              {!BETA_RESOLUCAO_MAXIMA && (
                <p style={{ fontSize: 11, color: "var(--color-text-secondary)", margin: "5px 0 0" }}>As fotos são redimensionadas no navegador antes do upload. O sistema nunca aumenta o original.</p>
              )}
            </Field>
          </div>
        </Section>

        {/* ── 2. Regras de seleção ── */}
        <Section title="Regras de seleção">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", gap: 8 }}>
              {[{ val: true, label: "🆓 Seleção livre", desc: "Cliente escolhe quantas quiser" }, { val: false, label: "📏 Definir limites", desc: "Mínimo e/ou máximo de fotos" }].map((opt) => (
                <div key={String(opt.val)} onClick={() => setSelecaoLivre(opt.val)} style={{ flex: 1, padding: "12px 14px", borderRadius: 9, cursor: "pointer", border: `0.5px solid ${selecaoLivre === opt.val ? "#2563EB" : "var(--color-border-tertiary)"}`, background: selecaoLivre === opt.val ? "rgba(37,99,235,0.05)" : "var(--color-background-secondary)", transition: "all 0.15s" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: selecaoLivre === opt.val ? "#2563EB" : "var(--color-text-primary)" }}>{opt.label}</div>
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>{opt.desc}</div>
                </div>
              ))}
            </div>
            {!selecaoLivre && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, padding: 14, background: "var(--color-background-secondary)", borderRadius: 9 }}>
                <Field label="Mínimo de fotos *">
                  <input type="number" min={1} value={limiteMin} onChange={(e) => setLimiteMin(e.target.value)} placeholder="Ex: 30" style={inputStyle} />
                </Field>
                <Field label="Máximo de fotos (opcional)">
                  <input type="number" min={1} value={limiteMax} onChange={(e) => setLimiteMax(e.target.value)} placeholder="Sem limite" style={inputStyle} />
                  <p style={{ fontSize: 11, color: "var(--color-text-secondary)", margin: "4px 0 0" }}>Deixe vazio para sem limite.</p>
                </Field>
              </div>
            )}
          </div>
        </Section>

        {/* ── 3. Venda de fotos extras — só aparece se habilitado na config do fotógrafo ── */}
        {cfgVenda?.ativa && <Section title="Venda de fotos extras">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div onClick={() => setVendaAtiva((v) => !v)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderRadius: 9, cursor: "pointer", border: `0.5px solid ${vendaAtiva ? "rgba(37,99,235,0.3)" : "var(--color-border-tertiary)"}`, background: vendaAtiva ? "rgba(37,99,235,0.05)" : "var(--color-background-secondary)", transition: "all 0.2s" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>{vendaAtiva ? "💰 Venda ativada nesta galeria" : "Ativar venda de fotos extras"}</div>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>{vendaAtiva ? "O cliente poderá comprar fotos além do pacote" : "Desativada para esta galeria"}</div>
              </div>
              <div style={{ width: 40, height: 22, borderRadius: 11, flexShrink: 0, background: vendaAtiva ? "#2563EB" : "var(--color-border-secondary)", position: "relative", transition: "background 0.2s" }}>
                <div style={{ position: "absolute", top: 3, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s", left: vendaAtiva ? 21 : 3, boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
              </div>
            </div>
            {vendaAtiva && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, padding: 14, background: "var(--color-background-secondary)", borderRadius: 9 }}>
                <Field label="Preço por foto extra (R$) *">
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "var(--color-text-secondary)" }}>R$</span>
                    <input type="number" min={0} step={0.01} value={vendaPreco} onChange={(e) => setVendaPreco(e.target.value)} placeholder="0,00" style={{ ...inputStyle, paddingLeft: 32 }} />
                  </div>
                </Field>
                <Field label="Vender a partir de (nº fotos)">
                  <input type="number" min={1} value={vendaPacoteMin} onChange={(e) => setVendaPacoteMin(e.target.value)} placeholder="Ex: 30" style={inputStyle} />
                  <p style={{ fontSize: 11, color: "var(--color-text-secondary)", margin: "4px 0 0" }}>Deixe vazio para permitir sempre.</p>
                </Field>
                {cfgVenda?.descricao_checkout && (
                  <div style={{ gridColumn: "1 / -1", padding: "10px 14px", background: "rgba(37,99,235,0.05)", borderRadius: 7, fontSize: 12, color: "var(--color-text-secondary)" }}>
                    💬 Mensagem ao cliente: "<em>{cfgVenda.descricao_checkout}</em>"
                  </div>
                )}
              </div>
            )}
          </div>
        </Section>}

        {/* ── 4. Opções visuais ── */}
        <Section title="Opções visuais">
          <div onClick={() => setMarcaDagua((v) => !v)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderRadius: 9, cursor: "pointer", border: `0.5px solid ${marcaDagua ? "rgba(37,99,235,0.3)" : "var(--color-border-tertiary)"}`, background: marcaDagua ? "rgba(37,99,235,0.05)" : "var(--color-background-secondary)", transition: "all 0.2s" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>Aplicar marca d'água nas fotos</div>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>A marca d'água configurada na sua conta será aplicada ao exibir as fotos</div>
            </div>
            <div style={{ width: 40, height: 22, borderRadius: 11, flexShrink: 0, background: marcaDagua ? "#2563EB" : "var(--color-border-secondary)", position: "relative", transition: "background 0.2s" }}>
              <div style={{ position: "absolute", top: 3, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s", left: marcaDagua ? 21 : 3, boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
            </div>
          </div>
        </Section>

        {/* ── 5. Fotos (upload opcional) ── */}
        <Section title={`Fotos${fila.length > 0 ? ` (${fila.length} na fila)` : ""}`}>
          <div>
            {/* Zona de drop */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); adicionarArquivos(Array.from(e.dataTransfer.files)); }}
              onClick={() => inputRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? "#2563EB" : "var(--color-border-secondary)"}`,
                borderRadius: 10, padding: "24px", textAlign: "center", cursor: "pointer",
                background: dragOver ? "rgba(37,99,235,0.04)" : "var(--color-background-secondary)",
                transition: "all 0.2s",
              }}
            >
              <div style={{ fontSize: 24, marginBottom: 8 }}>📁</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 3 }}>
                Arraste fotos aqui ou clique para selecionar
              </div>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>
                JPEG, PNG ou WebP · O upload começa ao criar a galeria
              </div>
              <input ref={inputRef} type="file" multiple accept="image/jpeg,image/jpg,image/png,image/webp" style={{ display: "none" }}
                onChange={(e) => { adicionarArquivos(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
            </div>

            {/* Lista de arquivos na fila */}
            {fila.length > 0 && (
              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 5 }}>
                {fila.map((item) => (
                  <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", background: "var(--color-background-secondary)", borderRadius: 7, border: "0.5px solid var(--color-border-tertiary)" }}>
                    <img src={item.previewUrl} alt="" style={{ width: 32, height: 32, objectFit: "cover", borderRadius: 4, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.file.name}</div>
                      <div style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>{formatBytes(item.file.size)}</div>
                    </div>
                    <button onClick={() => removerArquivo(item.id)} title="Remover" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 16, padding: "0 4px", lineHeight: 1 }}>×</button>
                  </div>
                ))}

                <div style={{ fontSize: 11, color: "var(--color-text-secondary)", padding: "4px 2px" }}>
                  {fila.length} arquivo{fila.length !== 1 ? "s" : ""} · As fotos serão enviadas ao criar a galeria.
                </div>
              </div>
            )}
          </div>
        </Section>

      </div>

      {/* Ações */}
      <div style={{ display: "flex", gap: 10, marginTop: 20, flexWrap: "wrap" }}>
        <button onClick={() => handleSave("ativa")} disabled={saving} style={{ padding: "10px 24px", borderRadius: 8, background: saving ? "#93C5FD" : "#2563EB", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
          {saving ? "Criando…" : fila.length > 0 ? `✓ Criar e enviar ${fila.length} foto${fila.length !== 1 ? "s" : ""}` : "✓ Criar e ativar"}
        </button>
        <button onClick={() => handleSave("rascunho")} disabled={saving} style={{ padding: "10px 20px", borderRadius: 8, background: "transparent", color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-secondary)", fontSize: 13, cursor: saving ? "not-allowed" : "pointer" }}>
          Salvar rascunho
        </button>
        <button onClick={handleSairClick} style={{ padding: "10px 18px", borderRadius: 8, background: "transparent", color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-secondary)", fontSize: 13, cursor: "pointer", marginLeft: "auto" }}>
          Cancelar
        </button>
      </div>

      {/* Modal: dados não salvos */}
      {modalSair && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 70, padding: 20 }} onClick={() => setModalSair(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 14, padding: "26px 28px", width: 400, maxWidth: "100%", boxShadow: "0 8px 40px rgba(0,0,0,0.18)" }}>
            <h3 style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 700, color: "var(--color-text-primary)" }}>⚠️ Dados não salvos</h3>
            <p style={{ margin: "0 0 20px", fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
              Você preencheu informações{fila.length > 0 ? " e adicionou fotos" : ""} que serão perdidas se sair sem salvar. O que deseja fazer?
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button onClick={() => { setModalSair(false); handleSave("rascunho"); }} disabled={saving} style={{ padding: "10px", borderRadius: 8, border: "none", background: "var(--color-text-primary)", color: "var(--color-background-primary)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                💾 Salvar como rascunho e sair
              </button>
              <button onClick={() => irParaDestino("/selecao")} style={{ padding: "10px", borderRadius: 8, border: "0.5px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.05)", color: "#DC2626", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Descartar tudo e sair
              </button>
              <button onClick={() => setModalSair(false)} style={{ padding: "10px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "transparent", color: "var(--color-text-secondary)", fontSize: 13, cursor: "pointer" }}>
                Continuar editando
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function NovaSelecaoPage() {
  return (
    <Suspense>
      <NovaSelecaoConteudo />
    </Suspense>
  );
}
