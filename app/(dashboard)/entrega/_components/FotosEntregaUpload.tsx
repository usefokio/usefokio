"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchAllRows } from "@/lib/supabase/fetchAll";
import { processarImagemEntrega } from "@/lib/imageResize";
import { uploadFileClient } from "@/lib/storage/uploadClient";
import { deleteFilesClient } from "@/lib/storage/deleteClient";
import type { GaleriaEntregaFoto } from "@/lib/supabase/types";

// Foto com estado de upload inline (igual ao padrão da seleção)
type FotoComStatus = GaleriaEntregaFoto & {
  _uploading?: boolean;
  _progresso?: number;
  _previewUrl?: string;
  _erro?: string;
};

type Props = {
  galeriaId: string | null;
  fotografoId: string;
  ensureGaleriaId?: () => Promise<string | null>;
  onFotosChange?: (fotos: GaleriaEntregaFoto[]) => void;
  deferred?: boolean;
};

export type FotosEntregaUploadHandle = {
  flushFila: (onProgress?: (atual: number, total: number) => void) => Promise<void>;
  filaLength: () => number;
  cancelarUpload: () => void;
};

export const FotosEntregaUpload = forwardRef<FotosEntregaUploadHandle, Props>(function FotosEntregaUpload(
  { galeriaId, fotografoId, ensureGaleriaId, onFotosChange, deferred = false },
  ref,
) {
  const canceladoRef = useRef(false);
  const [fotos,          setFotos]          = useState<FotoComStatus[]>([]);
  const [carregando,     setCarregando]     = useState(galeriaId !== null);
  const [dragOver,       setDragOver]       = useState(false);
  const [pagina,         setPagina]         = useState(0);
  const [modoSelecao,    setModoSelecao]    = useState(false);
  const [selecionadas,   setSelecionadas]   = useState<Set<string>>(new Set());
  const [excluindo,      setExcluindo]      = useState(false);
  const [confirmarTodas, setConfirmarTodas] = useState(false);

  const inputRef      = useRef<HTMLInputElement>(null);
  const galeriaIdRef  = useRef<string | null>(galeriaId);
  galeriaIdRef.current = galeriaIdRef.current ?? galeriaId;

  // IDs dos placeholders pendentes (deferred) para o flushFila saber quais subir
  const pendentesRef = useRef<string[]>([]);

  const FOTOS_POR_PAGINA = 48;

  useEffect(() => {
    if (!galeriaId) { setCarregando(false); return; }
    const supabase = createClient();
    fetchAllRows<GaleriaEntregaFoto>(
      (sb, from, to) => sb.from("galerias_entrega_fotos").select("*").eq("galeria_id", galeriaId).order("ordem").order("created_at").range(from, to),
      supabase,
    ).then((data) => {
      setFotos(data);
      setCarregando(false);
    });
  }, [galeriaId]);

  const notificar = useCallback((lista: FotoComStatus[]) => {
    const salvas = lista.filter((f) => !f._uploading) as GaleriaEntregaFoto[];
    onFotosChange?.(salvas);
  }, [onFotosChange]);

  async function processarEEnviar(placeholderId: string, file: File, galeriaIdOverride?: string) {
    const gId = galeriaIdOverride ?? galeriaIdRef.current;
    if (!gId) return;

    const setP = (p: number) =>
      setFotos((prev) => prev.map((f) => f.id === placeholderId ? { ...f, _progresso: p } : f));

    try {
      setP(10);
      const processed = await processarImagemEntrega(file, 1200);
      setP(45);

      const uuid = crypto.randomUUID();
      const path = `entrega/${fotografoId}/${gId}/${uuid}.jpg`;
      const { url_publica } = await uploadFileClient(path, processed.blob);
      setP(80);

      const supabase = createClient();
      const { data: foto, error: dbErr } = await supabase
        .from("galerias_entrega_fotos")
        .insert({
          galeria_id:    gId,
          storage_path:  path,
          url_publica,
          nome_arquivo:  file.name,
          tamanho_bytes: processed.tamanho_bytes,
          largura:       processed.largura,
          altura:        processed.altura,
          ordem:         0,
        })
        .select()
        .single();
      if (dbErr) throw new Error(dbErr.message);

      setFotos((prev) => {
        const next = prev.map((f) => {
          if (f.id !== placeholderId) return f;
          if (f._previewUrl) URL.revokeObjectURL(f._previewUrl);
          return { ...(foto as GaleriaEntregaFoto) };
        });
        notificar(next);
        return next;
      });
    } catch (err: any) {
      setFotos((prev) => prev.map((f) =>
        f.id === placeholderId ? { ...f, _uploading: false, _erro: err.message ?? "Erro no upload" } : f
      ));
    }
  }

  async function adicionarArquivos(files: FileList | File[]) {
    const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (arr.length === 0) return;

    if (!deferred) {
      if (!galeriaIdRef.current && ensureGaleriaId) {
        galeriaIdRef.current = await ensureGaleriaId();
      }
      if (!galeriaIdRef.current) return;
    }

    // Dedup por nome+tamanho
    const nomesFotos = new Set(fotos.filter((f) => !f._uploading).map((f) => f.nome_arquivo).filter(Boolean));
    const nomesPend  = new Set(fotos.filter((f) =>  f._uploading).map((f) => f.nome_arquivo ?? ""));
    const filtrados  = arr.filter((f) => !nomesFotos.has(f.name) && !nomesPend.has(f.name));
    if (filtrados.length === 0) return;

    // Criar placeholders e inserir no topo da grade
    const placeholders: FotoComStatus[] = filtrados.map((file) => ({
      id: crypto.randomUUID(),
      galeria_id: galeriaIdRef.current ?? "",
      storage_path: "", url_publica: "", nome_arquivo: file.name,
      largura: null, altura: null, tamanho_bytes: null, ordem: 0,
      created_at: new Date().toISOString(),
      _uploading: true, _progresso: 0, _previewUrl: URL.createObjectURL(file),
    }));

    setFotos((prev) => [...placeholders, ...prev]);

    if (deferred) {
      // Apenas enfileira — flushFila vai subir depois
      pendentesRef.current = [
        ...pendentesRef.current,
        ...placeholders.map((p) => p.id),
      ];
      // Guarda o File associado ao placeholder para uso no flush
      placeholders.forEach((p, i) => {
        (p as any)._file = filtrados[i];
      });
      // Atualiza fotos com o _file salvo
      setFotos((prev) => prev.map((f) => {
        const ph = placeholders.find((p) => p.id === f.id);
        return ph ? { ...f, _file: (ph as any)._file } : f;
      }));
      return;
    }

    // Modo imediato: upload com semáforo de 3 simultâneos
    const CONCORRENCIA = 3;
    const fila = filtrados.map((file, i) => ({ file, placeholderId: placeholders[i].id }));
    let cursor = 0;

    async function proximo(): Promise<void> {
      if (cursor >= fila.length) return;
      const { file, placeholderId } = fila[cursor++];
      await processarEEnviar(placeholderId, file);
      await proximo();
    }

    await Promise.all(Array.from({ length: Math.min(CONCORRENCIA, fila.length) }, proximo));
  }

  useImperativeHandle(ref, () => ({
    filaLength: () => fotos.filter((f) => f._uploading).length,
    cancelarUpload: () => { canceladoRef.current = true; },

    async flushFila(onProgress) {
      canceladoRef.current = false;
      const pendentes = fotos.filter((f) => f._uploading && (f as any)._file);
      if (pendentes.length === 0) return;

      if (!galeriaIdRef.current && ensureGaleriaId) {
        galeriaIdRef.current = await ensureGaleriaId();
      }
      const gId = galeriaIdRef.current;
      if (!gId) return;

      const CONCORRENCIA = 3;
      let concluidos = 0;
      const total = pendentes.length;
      let cursor = 0;

      async function proximo(): Promise<void> {
        if (canceladoRef.current || cursor >= pendentes.length) return;
        const foto = pendentes[cursor++];
        await processarEEnviar(foto.id, (foto as any)._file, gId ?? undefined);
        concluidos++;
        onProgress?.(concluidos, total);
        await proximo();
      }

      await Promise.all(Array.from({ length: Math.min(CONCORRENCIA, pendentes.length) }, proximo));
    },
  }));

  async function removerFoto(foto: FotoComStatus) {
    if (foto._uploading) {
      if (foto._previewUrl) URL.revokeObjectURL(foto._previewUrl);
      setFotos((prev) => {
        const next = prev.filter((f) => f.id !== foto.id);
        notificar(next);
        return next;
      });
      return;
    }
    const supabase = createClient();
    void deleteFilesClient([{ storage_path: foto.storage_path, url_publica: foto.url_publica }]);
    await supabase.from("galerias_entrega_fotos").delete().eq("id", foto.id);
    setFotos((prev) => { const next = prev.filter((f) => f.id !== foto.id); notificar(next); return next; });
  }

  async function removerFotosSelecionadas(ids: Set<string>) {
    if (ids.size === 0) return;
    setExcluindo(true);
    const supabase = createClient();
    const alvo = fotos.filter((f) => ids.has(f.id) && !f._uploading);
    const storageItems = alvo.map((f) => ({ storage_path: f.storage_path, url_publica: f.url_publica }));
    for (let i = 0; i < storageItems.length; i += 100)
      await deleteFilesClient(storageItems.slice(i, i + 100));
    const alvIds = alvo.map((f) => f.id);
    for (let i = 0; i < alvIds.length; i += 100)
      await supabase.from("galerias_entrega_fotos").delete().in("id", alvIds.slice(i, i + 100));
    setFotos((prev) => { const next = prev.filter((f) => !ids.has(f.id)); notificar(next); return next; });
    setSelecionadas(new Set());
    setModoSelecao(false);
    setExcluindo(false);
  }

  async function removerTodasFotos() {
    setExcluindo(true);
    const supabase = createClient();
    const salvas = fotos.filter((f) => !f._uploading);
    const storageItems = salvas.map((f) => ({ storage_path: f.storage_path, url_publica: f.url_publica }));
    for (let i = 0; i < storageItems.length; i += 100)
      await deleteFilesClient(storageItems.slice(i, i + 100));
    const gid = galeriaIdRef.current;
    if (gid) await supabase.from("galerias_entrega_fotos").delete().eq("galeria_id", gid);
    fotos.filter((f) => f._uploading && f._previewUrl).forEach((f) => URL.revokeObjectURL(f._previewUrl!));
    setFotos([]);
    onFotosChange?.([]);
    setSelecionadas(new Set());
    setModoSelecao(false);
    setConfirmarTodas(false);
    setExcluindo(false);
  }

  const totalSalvas   = fotos.filter((f) => !f._uploading).length;
  const emAndamento   = fotos.filter((f) => f._uploading && !f._erro).length;
  const comErro       = fotos.filter((f) => !!f._erro).length;
  const totalPaginas  = Math.ceil(fotos.length / FOTOS_POR_PAGINA);
  const pagAtual      = Math.min(pagina, Math.max(0, totalPaginas - 1));
  const visiveis      = fotos.slice(pagAtual * FOTOS_POR_PAGINA, (pagAtual + 1) * FOTOS_POR_PAGINA);

  return (
    <div>
      {/* Cabeçalho */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 8, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Galeria de fotos
          </div>
          <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>
            {totalSalvas > 0 ? `${totalSalvas} foto${totalSalvas !== 1 ? "s" : ""} na galeria` : "Nenhuma foto adicionada"}
            {emAndamento > 0 && <span style={{ color: "#2563EB" }}> · {emAndamento} enviando…</span>}
            {comErro > 0 && <span style={{ color: "#EF4444" }}> · {comErro} com erro</span>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {!modoSelecao ? (
            <>
              {totalSalvas > 0 && (
                <>
                  <button type="button" onClick={() => { setModoSelecao(true); setSelecionadas(new Set()); }}
                    style={{ padding: "7px 14px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "transparent", fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)", cursor: "pointer" }}>
                    Selecionar
                  </button>
                  <button type="button" onClick={() => setConfirmarTodas(true)}
                    style={{ padding: "7px 14px", borderRadius: 8, border: "0.5px solid rgba(239,68,68,0.35)", background: "rgba(239,68,68,0.07)", fontSize: 12, fontWeight: 600, color: "#DC2626", cursor: "pointer" }}>
                    Excluir todas
                  </button>
                </>
              )}
              <button type="button" onClick={() => inputRef.current?.click()}
                style={{ padding: "7px 14px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)", cursor: "pointer" }}>
                + Adicionar fotos
              </button>
            </>
          ) : (
            <>
              <span style={{ fontSize: 12, color: "var(--color-text-secondary)", alignSelf: "center" }}>
                {selecionadas.size} selecionada{selecionadas.size !== 1 ? "s" : ""}
              </span>
              <button type="button"
                onClick={() => setSelecionadas(selecionadas.size === totalSalvas ? new Set() : new Set(fotos.filter((f) => !f._uploading).map((f) => f.id)))}
                style={{ padding: "7px 14px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "transparent", fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)", cursor: "pointer" }}>
                {selecionadas.size === totalSalvas ? "Desmarcar todas" : "Selecionar todas"}
              </button>
              {selecionadas.size > 0 && (
                <button type="button" onClick={() => removerFotosSelecionadas(selecionadas)} disabled={excluindo}
                  style={{ padding: "7px 14px", borderRadius: 8, border: "0.5px solid rgba(239,68,68,0.35)", background: "rgba(239,68,68,0.07)", fontSize: 12, fontWeight: 600, color: "#DC2626", cursor: excluindo ? "not-allowed" : "pointer" }}>
                  {excluindo ? "Excluindo…" : `Excluir ${selecionadas.size}`}
                </button>
              )}
              <button type="button" onClick={() => { setModoSelecao(false); setSelecionadas(new Set()); }}
                style={{ padding: "7px 14px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "transparent", fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", cursor: "pointer" }}>
                Cancelar
              </button>
            </>
          )}
        </div>
      </div>

      {/* Modal confirmar excluir todas */}
      {confirmarTodas && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "var(--color-background-primary)", borderRadius: 14, padding: "24px 28px", maxWidth: 380, width: "100%", boxShadow: "0 8px 40px rgba(0,0,0,0.18)" }}>
            <h3 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 700, color: "#EF4444" }}>Excluir todas as fotos?</h3>
            <p style={{ margin: "0 0 22px", fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
              Todas as <strong>{totalSalvas} foto{totalSalvas !== 1 ? "s" : ""}</strong> serão removidas permanentemente.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={() => setConfirmarTodas(false)}
                style={{ flex: 1, padding: "10px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "transparent", fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", cursor: "pointer" }}>
                Cancelar
              </button>
              <button type="button" onClick={removerTodasFotos} disabled={excluindo}
                style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: "#EF4444", color: "#fff", fontSize: 13, fontWeight: 700, cursor: excluindo ? "not-allowed" : "pointer" }}>
                {excluindo ? "Excluindo…" : "Excluir todas"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drop zone / Grade */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); adicionarArquivos(e.dataTransfer.files); }}
        onClick={() => fotos.length === 0 && inputRef.current?.click()}
        style={{
          border: `1.5px dashed ${dragOver ? "#2563EB" : "var(--color-border-secondary)"}`,
          borderRadius: 12,
          background: dragOver ? "rgba(37,99,235,0.04)" : "var(--color-background-secondary)",
          transition: "all 0.15s",
          minHeight: fotos.length === 0 ? 140 : "auto",
          padding: fotos.length === 0 ? "36px 20px" : 10,
          display: "flex",
          flexDirection: "column",
          alignItems: fotos.length === 0 ? "center" : "stretch",
          justifyContent: fotos.length === 0 ? "center" : "flex-start",
          cursor: fotos.length === 0 ? "pointer" : "default",
        }}
      >
        {fotos.length === 0 ? (
          carregando ? (
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Carregando fotos…</div>
          ) : (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🖼</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>Arraste fotos ou clique para selecionar</div>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 4 }}>JPG, PNG, WEBP · As fotos serão reduzidas para entrega online</div>
            </div>
          )
        ) : (
          <>
            {/* Grade com placeholders inline */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))", gap: 6 }}>
              {visiveis.map((foto) => {
                const sel        = selecionadas.has(foto.id);
                const uploading  = !!foto._uploading;
                const progresso  = foto._progresso ?? 0;
                const previewSrc = foto._previewUrl ?? foto.url_publica;
                const erro       = foto._erro;

                return (
                  <div
                    key={foto.id}
                    onClick={() => {
                      if (modoSelecao && !uploading)
                        setSelecionadas((prev) => { const n = new Set(prev); sel ? n.delete(foto.id) : n.add(foto.id); return n; });
                    }}
                    style={{ position: "relative", aspectRatio: "1", borderRadius: 7, overflow: "hidden", background: "var(--color-border-tertiary)", cursor: modoSelecao && !uploading ? "pointer" : "default", outline: sel ? "2.5px solid #2563EB" : "none" }}
                  >
                    {/* Preview / foto */}
                    <img
                      src={previewSrc}
                      alt={foto.nome_arquivo ?? ""}
                      loading="lazy"
                      style={{ width: "100%", height: "100%", objectFit: "cover", opacity: uploading ? 0.5 : modoSelecao && !sel ? 0.6 : 1, transition: "opacity 0.15s" }}
                    />

                    {/* Overlay de upload */}
                    {uploading && !erro && (
                      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
                        <div style={{ width: "72%", height: 3, background: "rgba(255,255,255,0.3)", borderRadius: 2 }}>
                          <div style={{ height: "100%", borderRadius: 2, background: "#2563EB", width: `${progresso}%`, transition: "width 0.3s" }} />
                        </div>
                        <div style={{ fontSize: 9, color: "#fff", fontWeight: 700, textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}>{progresso}%</div>
                      </div>
                    )}

                    {/* Overlay de erro */}
                    {erro && (
                      <div style={{ position: "absolute", inset: 0, background: "rgba(239,68,68,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: 4 }}>
                        <div style={{ fontSize: 9, color: "#fff", textAlign: "center", fontWeight: 600, lineHeight: 1.3 }}>Erro</div>
                      </div>
                    )}

                    {/* Checkbox seleção */}
                    {modoSelecao && !uploading && (
                      <div style={{ position: "absolute", top: 4, left: 4, width: 18, height: 18, borderRadius: 4, border: sel ? "none" : "1.5px solid #fff", background: sel ? "#2563EB" : "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {sel && <span style={{ color: "#fff", fontSize: 10, fontWeight: 800 }}>✓</span>}
                      </div>
                    )}

                    {/* Botão remover */}
                    {!modoSelecao && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removerFoto(foto); }}
                        style={{ position: "absolute", top: 3, right: 3, width: 20, height: 20, borderRadius: "50%", background: "rgba(0,0,0,0.6)", border: "none", color: "#fff", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}
                      >✕</button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Paginação */}
            {totalPaginas > 1 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "10px 0 2px" }}>
                <button type="button" onClick={(e) => { e.stopPropagation(); setPagina(Math.max(0, pagAtual - 1)); }} disabled={pagAtual === 0}
                  style={{ padding: "5px 14px", borderRadius: 7, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", fontSize: 12, fontWeight: 600, color: pagAtual === 0 ? "var(--color-border-secondary)" : "var(--color-text-primary)", cursor: pagAtual === 0 ? "default" : "pointer" }}>
                  ← Anterior
                </button>
                <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Página {pagAtual + 1} de {totalPaginas}</span>
                <button type="button" onClick={(e) => { e.stopPropagation(); setPagina(Math.min(totalPaginas - 1, pagAtual + 1)); }} disabled={pagAtual >= totalPaginas - 1}
                  style={{ padding: "5px 14px", borderRadius: 7, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", fontSize: 12, fontWeight: 600, color: pagAtual >= totalPaginas - 1 ? "var(--color-border-secondary)" : "var(--color-text-primary)", cursor: pagAtual >= totalPaginas - 1 ? "default" : "pointer" }}>
                  Próxima →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: "none" }}
        onChange={(e) => e.target.files && adicionarArquivos(e.target.files)}
      />

      {totalSalvas > 0 && !deferred && (
        <div style={{ marginTop: 8, fontSize: 11, color: "var(--color-text-secondary)" }}>
          Clique no ✕ sobre uma foto para removê-la.
        </div>
      )}
    </div>
  );
});
