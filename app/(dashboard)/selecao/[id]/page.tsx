"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import { processarImagem } from "@/lib/imageResize";
import { uploadFileClient } from "@/lib/storage/uploadClient";
import { deleteFilesClient } from "@/lib/storage/deleteClient";
import { fetchAllRows } from "@/lib/supabase/fetchAll";
import exifr from "exifr";
import { PLANOS, BETA_RESOLUCAO_MAXIMA, limiteEfetivo, type PlanoId } from "@/lib/planos";
import type { GaleriaSelecao, GaleriaSelecaoFoto, Cliente, Categoria } from "@/lib/supabase/types";

import type { FotoComStatus, EscolhaItem, Tab, Evento } from "./_components/types";
import { ModalEnviarAcesso }   from "./_components/ModalEnviarAcesso";
import { FotoCard }            from "./_components/FotoCard";
import { UploadZone }          from "./_components/UploadZone";
import { AbaAndamento }        from "./_components/AbaAndamento";
import { AbaSelecoes }         from "./_components/AbaSelecoes";
import { ConfiguracaoGaleria } from "./_components/ConfiguracaoGaleria";
import { BotaoDownload }       from "./_components/BotaoDownload";
import { useDownloadFotos }    from "./_components/useDownloadFotos";

// ─── Status labels/colors ─────────────────────────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
  rascunho:           "rgba(107,114,128,0.12)",
  ativa:              "rgba(16,185,129,0.12)",
  encerrada:          "rgba(239,68,68,0.10)",
  aguardando_revisao: "rgba(245,158,11,0.12)",
};
const STATUS_TEXT: Record<string, string> = {
  rascunho:           "var(--color-text-secondary)",
  ativa:              "#059669",
  encerrada:          "#EF4444",
  aguardando_revisao: "#B45309",
};
const STATUS_LABEL: Record<string, string> = {
  rascunho:           "Rascunho",
  ativa:              "Ativa",
  encerrada:          "Encerrada",
  aguardando_revisao: "Aguardando revisão",
};

// ─── Página principal ─────────────────────────────────────────────────────────
function GaleriaSelecaoConteudo() {
  const { id }        = useParams<{ id: string }>();
  const router        = useRouter();
  const searchParams  = useSearchParams();
  const { fotografo, reload } = useFotografo();

  const [galeria, setGaleria]       = useState<GaleriaSelecao | null>(null);
  const [cliente, setCliente]       = useState<Cliente | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [fotos, setFotos]           = useState<FotoComStatus[]>([]);
  const [escolhas, setEscolhas]     = useState<EscolhaItem[]>([]);
  const [eventos, setEventos]       = useState<Evento[]>([]);
  const [loading, setLoading]       = useState(true);
  const tabParam = searchParams.get("tab") as Tab | null;
  const [tab, setTab]               = useState<Tab>(tabParam ?? "fotos");
  const [catFiltro, setCatFiltro]   = useState<string>("todas");
  const [ordemCampo, setOrdemCampo] = useState<"nome" | "data" | "rating">("data");
  const [ordemDir, setOrdemDir]     = useState<"asc" | "desc">("asc");
  const [enviando, setEnviando]     = useState(0);
  const [copiado, setCopiado]       = useState(false);
  const [modalAcesso, setModalAcesso]     = useState(false);
  const [avisoLimite, setAvisoLimite]     = useState(false);
  const [modoSelecao, setModoSelecao]     = useState(false);
  const [selecionados, setSelecionados]   = useState<Set<string>>(new Set());
  const [deletandoLote, setDeletandoLote] = useState(false);
  const [deleteProgresso, setDeleteProgresso] = useState({ atual: 0, total: 0 });

  // ── Download ─────────────────────────────────────────────────────────────────
  const dlGaleria  = useDownloadFotos();
  const dlSelecao  = useDownloadFotos();

  function baixarGaleria() {
    const lista = fotos
      .filter((f) => f.url_publica && !f._uploading)
      .map((f, i) => ({
        url:  f.url_publica!,
        nome: f.nome_arquivo ?? `foto-${String(i + 1).padStart(3, "0")}.jpg`,
      }));
    dlGaleria.baixar(lista, `${galeria?.titulo ?? "galeria"} — completa`);
  }

  function baixarSelecao() {
    const lista = escolhas
      .filter((e) => e.fotos?.url_publica)
      .map((e, i) => ({
        url:  e.fotos!.url_publica!,
        nome: e.fotos!.nome_arquivo ?? `foto-${String(i + 1).padStart(3, "0")}.jpg`,
      }));
    dlSelecao.baixar(lista, `${galeria?.titulo ?? "galeria"} — seleção`);
  }

  // ── Carrega galeria ──────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const [
          { data: gal,  error: eGal },
          fts,
          { data: cats },
          { data: esc },
          { data: evs },
        ] = await Promise.all([
          supabase.from("galerias_selecao").select("*").eq("id", id).single(),
          fetchAllRows<GaleriaSelecaoFoto>((sb, from, to) => sb.from("galerias_selecao_fotos").select("*").eq("galeria_id", id).order("ordem").order("created_at").range(from, to), supabase),
          supabase.from("galeria_selecao_categorias").select("categorias(*)").eq("galeria_id", id),
          supabase.from("galerias_selecao_escolhas")
            .select("id, foto_id, comentario, created_at, fotos:galerias_selecao_fotos(nome_arquivo, url_publica, thumbnail_path)")
            .eq("galeria_id", id).order("created_at"),
          supabase.from("galeria_selecao_eventos")
            .select("id, tipo, descricao, foto_id, created_at")
            .eq("galeria_id", id).order("created_at", { ascending: false }),
        ]);

        if (eGal || !gal) { setLoading(false); return; }

        setGaleria(gal);
        setFotos((fts ?? []) as unknown as FotoComStatus[]);
        setCategorias(((cats ?? []) as any[]).map((r) => r.categorias).filter(Boolean) as Categoria[]);
        setEscolhas((esc ?? []) as unknown as EscolhaItem[]);
        setEventos((evs ?? []) as Evento[]);
        if (gal.status === "aguardando_revisao") setTab("selecoes");
        if (gal.cliente_id) {
          const { data: cli } = await supabase.from("clientes").select("*").eq("id", gal.cliente_id).single();
          setCliente(cli);
        }
      } catch (err) {
        console.error("Erro ao carregar galeria:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  // ── Upload com fila de concorrência limitada ──────────────────────────────────
  const handleFiles = useCallback(async (files: File[]) => {
    if (!fotografo || !galeria) return;

    const MAX_BYTES = 6 * 1024 * 1024;
    const validos: File[] = [];
    const rejeitados: string[] = [];
    for (const file of files) {
      if (file.type !== "image/jpeg" && file.type !== "image/jpg") {
        rejeitados.push(`${file.name} (apenas JPEG)`);
      } else if (file.size > MAX_BYTES) {
        rejeitados.push(`${file.name} (máx 6 MB)`);
      } else {
        validos.push(file);
      }
    }
    if (rejeitados.length > 0) alert(`${rejeitados.length} arquivo(s) ignorado(s):\n${rejeitados.join("\n")}`);
    if (validos.length === 0) return;

    const plano = PLANOS[fotografo.plano as PlanoId] ?? PLANOS.gratuito;
    const limite = limiteEfetivo(plano, fotografo.limite_fotos_custom);
    if (limite !== null && (fotografo.total_fotos_usadas ?? 0) >= limite) {
      setAvisoLimite(true);
    }

    setEnviando((n) => n + validos.length);

    const placeholders: FotoComStatus[] = validos.map((file) => ({
      id: crypto.randomUUID(), galeria_id: galeria.id, categoria_id: null,
      storage_path: "", thumbnail_path: null, url_publica: null,
      nome_arquivo: file.name, largura: null, altura: null, tamanho_bytes: null,
      resolucao: null, ordem: 0, created_at: new Date().toISOString(), rating: 0,
      _uploading: true, _progresso: 0, _previewUrl: URL.createObjectURL(file),
    }));
    setFotos((prev) => [...placeholders, ...prev]);

    const supabase = createClient();
    const CONCORRENCIA = 3;
    const fila = validos.map((file, idx) => ({ file, placeholderId: placeholders[idx].id }));
    let cursor = 0;

    async function processarProximo(): Promise<void> {
      if (cursor >= fila.length) return;
      const { file, placeholderId } = fila[cursor++];
      const setP = (p: number) =>
        setFotos((prev) => prev.map((f) => f.id === placeholderId ? { ...f, _progresso: p } : f));

      try {
        setP(5);
        let rating = 0;
        try {
          const exif = await exifr.parse(file, { xmp: true, tiff: false, exif: false, gps: false, interop: false });
          const raw = exif?.Rating ?? exif?.rating ?? 0;
          rating = Math.min(5, Math.max(0, Number(raw) || 0));
        } catch { /* sem EXIF */ }

        setP(10);
        if (!galeria || !fotografo) throw new Error("Galeria ou fotógrafo não carregado");
        // Beta: forçar HD independente da configuração da galeria
        const resolucaoUpload = BETA_RESOLUCAO_MAXIMA ? "hd" : galeria.resolucao_exibicao;
        const processed = await processarImagem(file, resolucaoUpload);
        setP(40);

        const uuid      = crypto.randomUUID();
        const mainPath  = `${fotografo.id}/${galeria.id}/${uuid}.jpg`;
        const thumbPath = `${fotografo.id}/${galeria.id}/thumbs/${uuid}.jpg`;

        const { url_publica: mainUrlPublica } = await uploadFileClient(mainPath, processed.blob);
        setP(70);

        const { url_publica: thumbUrlPublica } = await uploadFileClient(thumbPath, processed.thumbnail);
        setP(85);

        const { data: fotoSalva, error: e3 } = await supabase
          .from("galerias_selecao_fotos")
          .insert({
            galeria_id: galeria.id, storage_path: mainPath,
            thumbnail_path: thumbUrlPublica, url_publica: mainUrlPublica,
            nome_arquivo: file.name, largura: processed.largura, altura: processed.altura,
            tamanho_bytes: processed.tamanho_bytes, resolucao: resolucaoUpload,
            rating, ordem: 0,
          })
          .select().single();
        if (e3) throw new Error(e3.message);
        setP(100);

        setFotos((prev) => prev.map((f) => {
          if (f.id !== placeholderId) return f;
          URL.revokeObjectURL(f._previewUrl!);
          return { ...(fotoSalva as GaleriaSelecaoFoto), _uploading: false };
        }));
        setGaleria((g) => g ? { ...g, total_fotos: g.total_fotos + 1 } : g);
        reload();
      } catch (err: any) {
        setFotos((prev) => prev.map((f) =>
          f.id === placeholderId ? { ...f, _uploading: false, _erro: err.message ?? "Erro no upload" } : f
        ));
      }
      setEnviando((n) => n - 1);
      await processarProximo();
    }

    await Promise.all(Array.from({ length: Math.min(CONCORRENCIA, fila.length) }, processarProximo));
  }, [fotografo, galeria]);

  // ── Handlers de fotos ────────────────────────────────────────────────────────
  const handleDelete = useCallback(async (fotoId: string) => {
    const foto = fotos.find((f) => f.id === fotoId);
    if (!foto || foto._uploading) return;
    const supabase = createClient();
    await supabase.from("galerias_selecao_fotos").delete().eq("id", fotoId);
    const storagItems = [
      foto.storage_path   ? { storage_path: foto.storage_path,   url_publica: foto.url_publica }           : null,
      foto.thumbnail_path ? { storage_path: foto.thumbnail_path, url_publica: foto.url_publica } : null,
    ].filter(Boolean) as { storage_path: string; url_publica: string | null }[];
    deleteFilesClient(storagItems);
    setFotos((prev) => prev.filter((f) => f.id !== fotoId));
    setGaleria((g) => g ? { ...g, total_fotos: Math.max(0, g.total_fotos - 1) } : g);
    if (galeria?.foto_capa_id === fotoId) setGaleria((g) => g ? { ...g, foto_capa_id: null } : g);
  }, [fotos, galeria]);

  const handleSetarCapa = useCallback(async (fotoId: string | null) => {
    const supabase = createClient();
    await supabase.rpc("fotografo_setar_capa", { p_galeria_id: id, p_foto_id: fotoId });
    setGaleria((g) => g ? { ...g, foto_capa_id: fotoId } : g);
  }, [id]);

  const handleRate = useCallback(async (fotoId: string, rating: number) => {
    setFotos((prev) => prev.map((f) => f.id === fotoId ? { ...f, rating } : f));
    await createClient().from("galerias_selecao_fotos").update({ rating }).eq("id", fotoId);
  }, []);

  // ── Seleção múltipla ─────────────────────────────────────────────────────────
  const toggleSelecionar = useCallback((fotoId: string) => {
    setSelecionados((prev) => {
      const next = new Set(prev);
      next.has(fotoId) ? next.delete(fotoId) : next.add(fotoId);
      return next;
    });
  }, []);

  const fotosFiltradas = [...(catFiltro === "todas" ? fotos : fotos.filter((f) => f.categoria_id === catFiltro))]
    .sort((a, b) => {
      let cmp = 0;
      if (ordemCampo === "nome")   cmp = (a.nome_arquivo ?? "").localeCompare(b.nome_arquivo ?? "", "pt-BR", { numeric: true });
      if (ordemCampo === "data")   cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (ordemCampo === "rating") cmp = (a.rating ?? 0) - (b.rating ?? 0);
      return ordemDir === "asc" ? cmp : -cmp;
    });

  const selecionarTodas = useCallback(() => {
    setSelecionados(new Set(fotosFiltradas.map((f) => f.id)));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fotos, catFiltro]);

  const handleDeleteLote = useCallback(async () => {
    if (selecionados.size === 0) return;
    if (!confirm(`Excluir ${selecionados.size} foto${selecionados.size !== 1 ? "s" : ""}? Esta ação não pode ser desfeita.`)) return;
    const ids = Array.from(selecionados);
    const fotosParaDeletar = fotos.filter((f) => ids.includes(f.id));
    const storageItems = fotosParaDeletar.flatMap((f) => [
      f.storage_path   ? { storage_path: f.storage_path,   url_publica: f.url_publica } : null,
      f.thumbnail_path ? { storage_path: f.thumbnail_path, url_publica: f.url_publica } : null,
    ].filter(Boolean)) as { storage_path: string; url_publica: string | null }[];

    setDeletandoLote(true);
    setDeleteProgresso({ atual: 0, total: 1 });

    const BATCH = 50;
    const supabase = createClient();

    // 1. Deletar escolhas do cliente que referenciam essas fotos (FK constraint)
    const escolhaBatches: string[][] = [];
    for (let i = 0; i < ids.length; i += BATCH) escolhaBatches.push(ids.slice(i, i + BATCH));
    await Promise.allSettled(
      escolhaBatches.map((batch) => supabase.from("galerias_selecao_escolhas").delete().in("foto_id", batch))
    );

    // 2. Deletar as fotos
    const fotoBatches: string[][] = [];
    for (let i = 0; i < ids.length; i += BATCH) fotoBatches.push(ids.slice(i, i + BATCH));
    await Promise.allSettled(
      fotoBatches.map((batch) => supabase.from("galerias_selecao_fotos").delete().in("id", batch))
    );

    setDeleteProgresso({ atual: 1, total: 1 });

    // Storage: fire-and-forget em lotes de 100
    for (let i = 0; i < storageItems.length; i += 100)
      deleteFilesClient(storageItems.slice(i, i + 100));

    setFotos((prev) => prev.filter((f) => !ids.includes(f.id)));
    setGaleria((g) => g ? { ...g, total_fotos: Math.max(0, g.total_fotos - ids.length) } : g);
    setSelecionados(new Set());
    setModoSelecao(false);
    setDeletandoLote(false);
    setDeleteProgresso({ atual: 0, total: 0 });
    reload();
  }, [selecionados, fotos, id]);

  // ── Status ───────────────────────────────────────────────────────────────────
  async function mudarStatus(novoStatus: GaleriaSelecao["status"]) {
    const supabase = createClient();
    await supabase.rpc("fotografo_mudar_status", { p_galeria_id: id, p_status: novoStatus });

    // Ao ativar, notifica o cliente por email (se galeria tem cliente vinculado)
    if (novoStatus === "ativa" && galeria?.cliente_id) {
      fetch("/api/email/galeria-criada", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ galeriaId: id }),
      }).catch(() => {});
    }

    setGaleria((g) => g ? {
      ...g, status: novoStatus,
      selecao_enviada:    novoStatus === "ativa" ? false : g.selecao_enviada,
      selecao_enviada_em: novoStatus === "ativa" ? null  : g.selecao_enviada_em,
    } : g);
    const { data } = await createClient().from("galeria_selecao_eventos")
      .select("id, tipo, descricao, foto_id, created_at")
      .eq("galeria_id", id).order("created_at", { ascending: false });
    if (data) setEventos(data as Evento[]);
  }

  async function reativarGaleria() {
    await createClient().rpc("fotografo_reativar_galeria", { p_galeria_id: id });
    setGaleria((g) => g ? { ...g, status: "ativa", selecao_enviada: false, selecao_enviada_em: null } : g);
    const { data } = await createClient().from("galeria_selecao_eventos")
      .select("id, tipo, descricao, foto_id, created_at")
      .eq("galeria_id", id).order("created_at", { ascending: false });
    if (data) setEventos(data as Evento[]);
  }

  const linkCliente = `${typeof window !== "undefined" ? window.location.origin : ""}/galeria/${id}`;
  async function copiarLink() {
    await navigator.clipboard.writeText(linkCliente);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  }

  // ── Render guards ────────────────────────────────────────────────────────────
  if (loading) return <div style={{ padding: "40px 30px", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>;
  if (!galeria) return (
    <div style={{ padding: "40px 30px", fontSize: 13, color: "var(--color-text-secondary)" }}>
      Galeria não encontrada. <button onClick={() => router.push("/selecao")} style={{ color: "#2563EB", background: "none", border: "none", cursor: "pointer" }}>Voltar</button>
    </div>
  );

  const TABS: { id: Tab; label: string }[] = [
    { id: "fotos",         label: `Fotos (${galeria.total_fotos})` },
    { id: "andamento",     label: `Andamento${eventos.length > 0 ? ` (${eventos.length})` : ""}` },
    { id: "selecoes",      label: `Seleção do cliente${escolhas.length > 0 ? ` (${escolhas.length})` : ""}` },
    { id: "configuracoes", label: "Configurações" },
  ];

  return (
    <div style={{ padding: "26px 30px", maxWidth: 1100 }}>

      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <button onClick={() => router.push("/selecao")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 13, padding: 0 }}>
          ← Seleções
        </button>
        <span style={{ color: "var(--color-border-secondary)" }}>/</span>
        <span style={{ fontSize: 13, color: "var(--color-text-primary)", fontWeight: 500 }}>{galeria.titulo}</span>
      </div>

      {/* Header card */}
      <div style={{
        background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: 12, padding: "18px 22px", display: "flex", alignItems: "flex-start", gap: 16,
        marginBottom: 16, flexWrap: "wrap",
      }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--color-text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
              {galeria.titulo}
            </h1>
            <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: STATUS_COLOR[galeria.status], color: STATUS_TEXT[galeria.status] }}>
              {STATUS_LABEL[galeria.status]}
            </span>
            {galeria.selecao_enviada && (
              <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: "rgba(37,99,235,0.1)", color: "#2563EB" }}>
                ✓ Seleção recebida
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {cliente && <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>👤 <Link href={`/clientes/${cliente.id}`} style={{ color: "inherit", textDecoration: "none" }} onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")} onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}>{cliente.nome}</Link></span>}
            {galeria.data_evento && <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>📅 {new Date(galeria.data_evento + "T12:00:00").toLocaleDateString("pt-BR")}</span>}
            {galeria.expira_em && (
              <span style={{ fontSize: 12, color: new Date(galeria.expira_em) < new Date() ? "#EF4444" : "var(--color-text-secondary)" }}>
                ⏰ Prazo: {new Date(galeria.expira_em).toLocaleDateString("pt-BR")}
              </span>
            )}
            <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>🖼 {galeria.total_fotos} foto{galeria.total_fotos !== 1 ? "s" : ""}</span>
            <span style={{ fontSize: 12, color: "var(--color-text-secondary)", textTransform: "uppercase" }}>
              📺 {galeria.resolucao_exibicao === "fullhd" ? "Full HD" : galeria.resolucao_exibicao.toUpperCase()}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
          {galeria.status === "ativa" && (
            <button onClick={() => setModalAcesso(true)} style={{ padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600, border: "0.5px solid rgba(37,99,235,0.4)", background: "rgba(37,99,235,0.07)", color: "#2563EB" }}>
              📬 Enviar acesso
            </button>
          )}
          <button onClick={copiarLink} style={{ padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600, border: "0.5px solid var(--color-border-secondary)", background: copiado ? "rgba(16,185,129,0.1)" : "var(--color-background-secondary)", color: copiado ? "#059669" : "var(--color-text-secondary)" }}>
            {copiado ? "✓ Link copiado!" : "🔗 Copiar link"}
          </button>
          <BotaoDownload
            label="Baixar galeria"
            icone="⬇"
            status={dlGaleria.status}
            progresso={dlGaleria.progresso}
            total={fotos.filter((f) => f.url_publica && !f._uploading).length}
            onClick={baixarGaleria}
          />
          {galeria.selecao_enviada && escolhas.length > 0 && (
            <BotaoDownload
              label={`Baixar seleção (${escolhas.length})`}
              icone="⬇"
              status={dlSelecao.status}
              progresso={dlSelecao.progresso}
              total={escolhas.filter((e) => e.fotos?.url_publica).length}
              onClick={baixarSelecao}
              variante="primario"
            />
          )}
          {galeria.status === "rascunho" && (
            <button onClick={() => mudarStatus("ativa")} style={{ padding: "8px 16px", borderRadius: 8, background: "#059669", color: "#fff", border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              ▶ Ativar galeria
            </button>
          )}
          {(galeria.status === "ativa" || galeria.status === "aguardando_revisao") && (
            <button onClick={() => mudarStatus("encerrada")} style={{ padding: "8px 16px", borderRadius: 8, background: "rgba(239,68,68,0.1)", color: "#EF4444", border: "0.5px solid rgba(239,68,68,0.3)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              ⏹ Encerrar
            </button>
          )}
          {galeria.status === "aguardando_revisao" && (
            <button onClick={reativarGaleria} style={{ padding: "8px 16px", borderRadius: 8, background: "#B45309", color: "#fff", border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              ↩ Reabrir para reedição
            </button>
          )}
          {galeria.status === "encerrada" && (
            <button onClick={() => mudarStatus("ativa")} style={{ padding: "8px 16px", borderRadius: 8, background: "var(--color-background-secondary)", color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-secondary)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              Reativar
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 2, borderBottom: "0.5px solid var(--color-border-tertiary)", marginBottom: 20 }}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "8px 16px", background: "none", border: "none", cursor: "pointer",
            fontSize: 13, fontWeight: tab === t.id ? 600 : 400,
            color: tab === t.id ? "var(--color-text-primary)" : "var(--color-text-secondary)",
            borderBottom: tab === t.id ? "2px solid var(--color-text-primary)" : "2px solid transparent",
            marginBottom: -1, position: "relative",
          }}>
            {t.label}
            {t.id === "selecoes" && galeria.selecao_enviada && tab !== "selecoes" && (
              <span style={{ display: "inline-block", width: 6, height: 6, background: "#2563EB", borderRadius: "50%", marginLeft: 5, verticalAlign: "middle", marginTop: -2 }} />
            )}
          </button>
        ))}
      </div>

      {/* ── Tab: Fotos ── */}
      {tab === "fotos" && (
        <div>
          {/* Banner limite plano */}
          {avisoLimite && fotografo && (() => {
            const plano = PLANOS[fotografo.plano as PlanoId] ?? PLANOS.gratuito;
            return (
              <div style={{ background: "rgba(245,158,11,0.08)", border: "0.5px solid rgba(245,158,11,0.4)", borderRadius: 10, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 18 }}>⚠️</span>
                <div style={{ flex: 1, fontSize: 13, color: "#92400E" }}>
                  <strong>Limite do plano {plano.nome} atingido</strong> ({limiteEfetivo(plano, fotografo.limite_fotos_custom)?.toLocaleString("pt-BR")} fotos).
                  O upload continua durante o período beta, mas considere fazer upgrade.
                </div>
                <a href="/conta/plano" style={{ fontSize: 12, fontWeight: 700, color: "#B45309", whiteSpace: "nowrap", padding: "5px 12px", borderRadius: 8, border: "0.5px solid rgba(245,158,11,0.5)", background: "rgba(245,158,11,0.1)", textDecoration: "none" }}>
                  Ver planos →
                </a>
              </div>
            );
          })()}

          {galeria.status !== "encerrada" && <UploadZone onFiles={handleFiles} />}

          {enviando > 0 && (
            <div style={{ fontSize: 12, color: "#2563EB", marginBottom: 12, fontWeight: 500 }}>
              ⏳ Enviando {enviando} foto{enviando !== 1 ? "s" : ""}…
            </div>
          )}

          {fotos.length > 0 && (
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 12 }}>
              💡 Passe o mouse sobre uma foto e clique em <strong>☆ Capa</strong> para definir a foto de capa da galeria.
              {!galeria.foto_capa_id && " Sem seleção manual, a primeira foto será usada automaticamente."}
            </div>
          )}

          {/* Filtro de categorias */}
          {categorias.length > 0 && (
            <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
              {[{ id: "todas", nome: `Todas (${fotos.length})` }, ...categorias.map((c) => ({
                id: c.id,
                nome: `${c.nome} (${fotos.filter((f) => f.categoria_id === c.id).length})`,
              }))].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCatFiltro(cat.id)}
                  style={{
                    padding: "4px 12px", borderRadius: 20, fontSize: 12, cursor: "pointer",
                    border: "0.5px solid",
                    borderColor: catFiltro === cat.id ? "var(--color-text-primary)" : "var(--color-border-tertiary)",
                    background: catFiltro === cat.id ? "var(--color-text-primary)" : "transparent",
                    color: catFiltro === cat.id ? "var(--color-background-primary)" : "var(--color-text-secondary)",
                    fontWeight: catFiltro === cat.id ? 600 : 400,
                  }}
                >
                  {cat.nome}
                </button>
              ))}
            </div>
          )}

          {/* Ordenação + botão de seleção múltipla */}
          {fotos.length > 1 && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14, flexWrap: "wrap", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11, color: "var(--color-text-secondary)", fontWeight: 500, marginRight: 2 }}>Ordenar:</span>
              {([["nome", "Nome"], ["data", "Data"], ["rating", "★ Classificação"]] as const).map(([campo, label]) => (
                <button
                  key={campo}
                  onClick={() => {
                    if (ordemCampo === campo) setOrdemDir((d) => d === "asc" ? "desc" : "asc");
                    else { setOrdemCampo(campo); setOrdemDir("asc"); }
                  }}
                  style={{
                    padding: "4px 11px", borderRadius: 20, fontSize: 11, cursor: "pointer",
                    border: "0.5px solid",
                    borderColor: ordemCampo === campo ? "var(--color-text-primary)" : "var(--color-border-tertiary)",
                    background: ordemCampo === campo ? "var(--color-text-primary)" : "transparent",
                    color: ordemCampo === campo ? "var(--color-background-primary)" : "var(--color-text-secondary)",
                    fontWeight: ordemCampo === campo ? 600 : 400,
                    display: "flex", alignItems: "center", gap: 4,
                  }}
                >
                  {label}
                  {ordemCampo === campo && <span style={{ fontSize: 9, opacity: 0.8 }}>{ordemDir === "asc" ? "↑" : "↓"}</span>}
                </button>
              ))}
              <button
                onClick={() => { setModoSelecao((v) => !v); setSelecionados(new Set()); }}
                style={{
                  marginLeft: "auto", padding: "4px 11px", borderRadius: 20, fontSize: 11, cursor: "pointer",
                  border: "0.5px solid",
                  borderColor: modoSelecao ? "#2563EB" : "var(--color-border-tertiary)",
                  background: modoSelecao ? "rgba(37,99,235,0.08)" : "transparent",
                  color: modoSelecao ? "#2563EB" : "var(--color-text-secondary)",
                  fontWeight: modoSelecao ? 600 : 400,
                }}
              >
                {modoSelecao ? "✕ Cancelar seleção" : "☑ Selecionar"}
              </button>
            </div>
          )}

          {/* Toolbar de ações em lote */}
          {modoSelecao && (
            <div style={{
              position: "sticky", top: 8, zIndex: 50, marginBottom: 12,
              background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-secondary)",
              borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10,
              boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
            }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)", flex: 1 }}>
                {selecionados.size === 0
                  ? "Clique nas fotos para selecionar"
                  : `${selecionados.size} foto${selecionados.size !== 1 ? "s" : ""} selecionada${selecionados.size !== 1 ? "s" : ""}`}
              </span>
              <button onClick={selecionarTodas} style={{ padding: "5px 12px", borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: "pointer", background: "transparent", border: "0.5px solid var(--color-border-secondary)", color: "var(--color-text-secondary)" }}>
                Selecionar todas ({fotosFiltradas.length})
              </button>
              {selecionados.size > 0 && (
                <button onClick={() => setSelecionados(new Set())} style={{ padding: "5px 12px", borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: "pointer", background: "transparent", border: "0.5px solid var(--color-border-secondary)", color: "var(--color-text-secondary)" }}>
                  Limpar
                </button>
              )}
              <button
                onClick={handleDeleteLote}
                disabled={selecionados.size === 0 || deletandoLote}
                style={{
                  padding: "5px 14px", borderRadius: 7, fontSize: 11, fontWeight: 700,
                  cursor: selecionados.size === 0 ? "not-allowed" : "pointer",
                  background: selecionados.size > 0 ? "rgba(239,68,68,0.9)" : "var(--color-background-secondary)",
                  border: "none", color: selecionados.size > 0 ? "#fff" : "var(--color-text-secondary)",
                  opacity: deletandoLote ? 0.6 : 1,
                }}
              >
                {deletandoLote ? "Excluindo…" : `🗑 Excluir${selecionados.size > 0 ? ` (${selecionados.size})` : ""}`}
              </button>
            </div>
          )}

          {/* Grid de fotos */}
          {fotosFiltradas.length === 0 ? (
            <div style={{ border: "0.5px dashed var(--color-border-secondary)", borderRadius: 10, padding: "52px 24px", textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>
              {fotos.length === 0
                ? "Nenhuma foto ainda. Arraste ou clique acima para começar o upload."
                : "Nenhuma foto nesta categoria."}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 8 }}>
              {fotosFiltradas.map((foto) => (
                <FotoCard
                  key={foto.id}
                  foto={foto}
                  isCapa={galeria.foto_capa_id === foto.id}
                  onDelete={handleDelete}
                  onSetarCapa={handleSetarCapa}
                  onRate={handleRate}
                  modoSelecao={modoSelecao}
                  selecionado={selecionados.has(foto.id)}
                  onToggleSelect={toggleSelecionar}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Aviso: galeria em rascunho */}
      {galeria.status === "rascunho" && (
        <div style={{ background: "rgba(245,158,11,0.07)", border: "0.5px solid rgba(245,158,11,0.35)", borderRadius: 10, padding: "12px 18px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#92400E" }}>Galeria em rascunho — </span>
            <span style={{ fontSize: 13, color: "#B45309" }}>o link de acesso só funciona após ativar a galeria.</span>
          </div>
          <button onClick={() => mudarStatus("ativa")} style={{ padding: "7px 16px", borderRadius: 8, background: "#059669", color: "#fff", border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
            ▶ Ativar agora
          </button>
        </div>
      )}

      {/* Modal enviar acesso */}
      {modalAcesso && galeria && (
        <ModalEnviarAcesso galeria={galeria} cliente={cliente} onClose={() => setModalAcesso(false)} />
      )}

      {/* Popup de progresso do delete em lote */}
      {deletandoLote && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--color-background-primary)", borderRadius: 16, padding: "32px 40px", minWidth: 320, textAlign: "center", boxShadow: "0 8px 40px rgba(0,0,0,0.2)" }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>🗑</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 6 }}>
              Excluindo fotos…
            </div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 20 }}>
              Lote {deleteProgresso.atual} de {deleteProgresso.total}
            </div>
            <div style={{ width: "100%", height: 6, background: "var(--color-border-tertiary)", borderRadius: 3, overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 3, background: "#EF4444",
                width: deleteProgresso.total > 0 ? `${Math.round((deleteProgresso.atual / deleteProgresso.total) * 100)}%` : "0%",
                transition: "width 0.3s",
              }} />
            </div>
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 8 }}>
              {deleteProgresso.total > 0 ? `${Math.round((deleteProgresso.atual / deleteProgresso.total) * 100)}%` : "0%"}
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Andamento ── */}
      {tab === "andamento" && <AbaAndamento eventos={eventos} />}

      {/* ── Tab: Seleções do cliente ── */}
      {tab === "selecoes" && (
        <AbaSelecoes galeria={galeria} cliente={cliente} escolhas={escolhas} />
      )}

      {/* ── Tab: Configurações ── */}
      {tab === "configuracoes" && (
        <ConfiguracaoGaleria
          galeria={galeria}
          cliente={cliente}
          categorias={categorias}
          onUpdate={(patch, novoCliente) => {
            setGaleria((g) => g ? { ...g, ...patch } : g);
            setCliente(novoCliente);
          }}
        />
      )}
    </div>
  );
}

export default function GaleriaSelecaoPage() {
  return (
    <Suspense>
      <GaleriaSelecaoConteudo />
    </Suspense>
  );
}
