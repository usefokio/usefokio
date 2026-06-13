"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchAllRows } from "@/lib/supabase/fetchAll";
import { processarImagemEntrega, formatBytes } from "@/lib/imageResize";
import type { GaleriaEntregaFoto } from "@/lib/supabase/types";

type FotoFila = {
  id: string;
  file: File;
  previewUrl: string;
  status: "aguardando" | "processando" | "enviando" | "ok" | "erro";
  progresso: number;
  erro?: string;
};

type Props = {
  galeriaId: string | null;
  fotografoId: string;
  ensureGaleriaId?: () => Promise<string | null>;
  onFotosChange?: (fotos: GaleriaEntregaFoto[]) => void;
  /**
   * Quando true, selecionar arquivos apenas enfileira — sem upload imediato.
   * Chame ref.current.flushFila(onProgress?) para disparar o upload.
   */
  deferred?: boolean;
};

export type FotosEntregaUploadHandle = {
  flushFila: (onProgress?: (atual: number, total: number) => void) => Promise<void>;
  filaLength: () => number;
};

export const FotosEntregaUpload = forwardRef<FotosEntregaUploadHandle, Props>(function FotosEntregaUpload(
  { galeriaId, fotografoId, ensureGaleriaId, onFotosChange, deferred = false },
  ref,
) {
  const [fila,               setFila]               = useState<FotoFila[]>([]);
  const [fotos,              setFotos]              = useState<GaleriaEntregaFoto[]>([]);
  const [carregando,         setCarregando]         = useState(galeriaId !== null);
  const [dragOver,           setDragOver]           = useState(false);
  const [pagina,             setPagina]             = useState(0);
  const [modoSelecao,        setModoSelecao]        = useState(false);
  const [selecionadas,       setSelecionadas]       = useState<Set<string>>(new Set());
  const [excluindo,          setExcluindo]          = useState(false);
  const [confirmarTodas,     setConfirmarTodas]     = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const galeriaIdRef = useRef<string | null>(galeriaId);
  galeriaIdRef.current = galeriaIdRef.current ?? galeriaId;

  const filaRef = useRef<FotoFila[]>([]);

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

  const atualizarFotos = useCallback((novas: GaleriaEntregaFoto[]) => {
    setFotos(novas);
    onFotosChange?.(novas);
  }, [onFotosChange]);

  // Mantém filaRef em sync com o state para uso em flushFila
  const setFilaSync = (updater: (prev: FotoFila[]) => FotoFila[]) => {
    setFila((prev) => {
      const next = updater(prev);
      filaRef.current = next;
      return next;
    });
  };

  async function processarEEnviar(
    item: FotoFila,
    galeriaIdOverride?: string,
    onDone?: () => void,
  ) {
    const gId = galeriaIdOverride ?? galeriaIdRef.current;
    if (!gId) return;

    const atualizar = (patch: Partial<FotoFila>) =>
      setFilaSync((prev) => prev.map((f) => f.id === item.id ? { ...f, ...patch } : f));

    try {
      atualizar({ status: "processando", progresso: 15 });
      const processed = await processarImagemEntrega(item.file, 1200);
      atualizar({ status: "enviando", progresso: 50 });

      const supabase = createClient();
      const uuid = crypto.randomUUID();
      const path = `entrega/${fotografoId}/${gId}/${uuid}.jpg`;

      const { error: uploadErr } = await supabase.storage
        .from("galerias")
        .upload(path, processed.blob, { contentType: "image/jpeg", upsert: false });
      if (uploadErr) throw new Error(uploadErr.message);
      atualizar({ progresso: 80 });

      const { data: urlData } = supabase.storage.from("galerias").getPublicUrl(path);

      const { data: foto, error: dbErr } = await supabase
        .from("galerias_entrega_fotos")
        .insert({
          galeria_id:    gId,
          storage_path:  path,
          url_publica:   urlData.publicUrl,
          nome_arquivo:  item.file.name,
          tamanho_bytes: processed.tamanho_bytes,
          largura:       processed.largura,
          altura:        processed.altura,
          ordem:         0,
        })
        .select()
        .single();
      if (dbErr) throw new Error(dbErr.message);

      atualizar({ status: "ok", progresso: 100 });
      setFotos((prev) => {
        const novas = [...prev, foto as GaleriaEntregaFoto];
        onFotosChange?.(novas);
        return novas;
      });
    } catch (err: any) {
      atualizar({ status: "erro", erro: err.message ?? "Erro no upload", progresso: 0 });
    } finally {
      onDone?.();
    }
  }

  async function adicionarArquivos(files: FileList | File[]) {
    const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (arr.length === 0) return;

    if (!deferred) {
      // Modo imediato: cria galeria se necessário, sobe na hora
      if (!galeriaIdRef.current && ensureGaleriaId) {
        galeriaIdRef.current = await ensureGaleriaId();
      }
      if (!galeriaIdRef.current) return;
    }

    // Dedup: ignora arquivos já presentes na fila ou na galeria salva
    const nomesFilaExist = new Set(filaRef.current.map((f) => f.file.name + "_" + f.file.size));
    const nomesFotosExist = new Set(fotos.map((f) => f.nome_arquivo).filter(Boolean));
    const filtrados = arr.filter(
      (f) => !nomesFilaExist.has(f.name + "_" + f.size) && !nomesFotosExist.has(f.name)
    );
    if (filtrados.length === 0) return;

    const novos: FotoFila[] = filtrados.map((f) => ({
      id: crypto.randomUUID(),
      file: f,
      previewUrl: URL.createObjectURL(f),
      status: "aguardando",
      progresso: 0,
    }));

    setFilaSync((prev) => [...prev, ...novos]);

    if (!deferred) {
      novos.forEach((item) => processarEEnviar(item));
    }
  }

  useImperativeHandle(ref, () => ({
    filaLength: () => filaRef.current.filter((f) => f.status === "aguardando" || f.status === "erro").length,

    async flushFila(onProgress) {
      const pendentes = filaRef.current.filter((f) => f.status === "aguardando" || f.status === "erro");
      if (pendentes.length === 0) return;

      if (!galeriaIdRef.current && ensureGaleriaId) {
        galeriaIdRef.current = await ensureGaleriaId();
      }
      const gId = galeriaIdRef.current;
      if (!gId) return;

      // Semáforo: máximo 3 uploads simultâneos
      const CONCORRENCIA = 3;
      let slots = CONCORRENCIA;
      let concluidos = 0;
      const total = pendentes.length;

      await new Promise<void>((done) => {
        let iniciados = 0;
        let finalizados = 0;

        const proximo = () => {
          while (slots > 0 && iniciados < total) {
            slots--;
            const item = pendentes[iniciados++];
            processarEEnviar(item, gId, () => {
              slots++;
              concluidos++;
              onProgress?.(concluidos, total);
              finalizados++;
              if (finalizados === total) done();
              else proximo();
            });
          }
        };

        proximo();
      });
    },
  }));

  async function removerFoto(foto: GaleriaEntregaFoto) {
    const supabase = createClient();
    await supabase.storage.from("galerias").remove([foto.storage_path]);
    await supabase.from("galerias_entrega_fotos").delete().eq("id", foto.id);
    const novas = fotos.filter((f) => f.id !== foto.id);
    atualizarFotos(novas);
  }

  async function removerFotosSelecionadas(ids: Set<string>) {
    if (ids.size === 0) return;
    setExcluindo(true);
    const supabase = createClient();
    const alvo = fotos.filter((f) => ids.has(f.id));
    const paths = alvo.map((f) => f.storage_path);
    for (let i = 0; i < paths.length; i += 100)
      await supabase.storage.from("galerias").remove(paths.slice(i, i + 100));
    for (const f of alvo)
      await supabase.from("galerias_entrega_fotos").delete().eq("id", f.id);
    atualizarFotos(fotos.filter((f) => !ids.has(f.id)));
    setSelecionadas(new Set());
    setModoSelecao(false);
    setExcluindo(false);
  }

  async function removerTodasFotos() {
    setExcluindo(true);
    const supabase = createClient();
    const paths = fotos.map((f) => f.storage_path);
    for (let i = 0; i < paths.length; i += 100)
      await supabase.storage.from("galerias").remove(paths.slice(i, i + 100));
    const gid = galeriaIdRef.current;
    if (gid) await supabase.from("galerias_entrega_fotos").delete().eq("galeria_id", gid);
    atualizarFotos([]);
    setSelecionadas(new Set());
    setModoSelecao(false);
    setConfirmarTodas(false);
    setExcluindo(false);
  }

  function removerDaFila(id: string) {
    setFilaSync((prev) => {
      const item = prev.find((f) => f.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
  }

  const emAndamento = fila.filter((f) => f.status === "processando" || f.status === "enviando").length;
  const erros       = fila.filter((f) => f.status === "erro").length;
  const total       = fotos.length;
  const filaPendente = fila.filter((f) => f.status === "aguardando").length;

  return (
    <div>
      {/* Cabeçalho */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 8, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Galeria de fotos
          </div>
          <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>
            {total > 0 ? `${total} foto${total !== 1 ? "s" : ""} na galeria` : "Nenhuma foto adicionada"}
            {emAndamento > 0 && <span style={{ color: "#2563EB" }}> · {emAndamento} enviando…</span>}
            {filaPendente > 0 && deferred && <span style={{ color: "#B45309" }}> · {filaPendente} na fila (serão enviadas ao salvar)</span>}
            {erros > 0 && <span style={{ color: "#EF4444" }}> · {erros} com erro</span>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {!modoSelecao ? (
            <>
              {total > 0 && (
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
                onClick={() => setSelecionadas(selecionadas.size === fotos.length ? new Set() : new Set(fotos.map((f) => f.id)))}
                style={{ padding: "7px 14px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "transparent", fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)", cursor: "pointer" }}>
                {selecionadas.size === fotos.length ? "Desmarcar todas" : "Selecionar todas"}
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

      {/* Modal confirmação excluir todas */}
      {confirmarTodas && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "var(--color-background-primary)", borderRadius: 14, padding: "24px 28px", maxWidth: 380, width: "100%", boxShadow: "0 8px 40px rgba(0,0,0,0.18)" }}>
            <h3 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 700, color: "#EF4444" }}>Excluir todas as fotos?</h3>
            <p style={{ margin: "0 0 22px", fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
              Todas as <strong>{total} foto{total !== 1 ? "s" : ""}</strong> serão removidas permanentemente. Esta ação não pode ser desfeita.
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

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); adicionarArquivos(e.dataTransfer.files); }}
        onClick={() => total === 0 && fila.length === 0 && inputRef.current?.click()}
        style={{
          border: `1.5px dashed ${dragOver ? "#2563EB" : "var(--color-border-secondary)"}`,
          borderRadius: 12,
          background: dragOver ? "rgba(37,99,235,0.04)" : "var(--color-background-secondary)",
          transition: "all 0.15s",
          minHeight: total === 0 && fila.length === 0 ? 120 : "auto",
          padding: total === 0 && fila.length === 0 ? "32px 20px" : 10,
          display: "flex",
          flexDirection: "column",
          alignItems: total === 0 && fila.length === 0 ? "center" : "stretch",
          justifyContent: total === 0 && fila.length === 0 ? "center" : "flex-start",
          cursor: total === 0 && fila.length === 0 ? "pointer" : "default",
          gap: 8,
        }}
      >
        {total === 0 && fila.length === 0 ? (
          <div style={{ textAlign: "center" }}>
            {carregando ? (
              <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Carregando fotos…</div>
            ) : (
              <>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🖼</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>Arraste fotos ou clique para selecionar</div>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 4 }}>
                  JPG, PNG, WEBP · Máximo de 2.000 fotos · As fotos serão reduzidas para baixa resolução
                </div>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Grid de fotos já salvas — paginado */}
            {fotos.length > 0 && (() => {
              const totalPaginas = Math.ceil(fotos.length / FOTOS_POR_PAGINA);
              const pagAtual = Math.min(pagina, totalPaginas - 1);
              const visiveis = fotos.slice(pagAtual * FOTOS_POR_PAGINA, (pagAtual + 1) * FOTOS_POR_PAGINA);
              return (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))", gap: 6 }}>
                    {visiveis.map((foto) => {
                      const sel = selecionadas.has(foto.id);
                      return (
                        <div
                          key={foto.id}
                          onClick={() => {
                            if (modoSelecao) {
                              setSelecionadas((prev) => { const n = new Set(prev); sel ? n.delete(foto.id) : n.add(foto.id); return n; });
                            }
                          }}
                          style={{ position: "relative", aspectRatio: "1", borderRadius: 7, overflow: "hidden", background: "var(--color-border-tertiary)", cursor: modoSelecao ? "pointer" : "default", outline: sel ? "2.5px solid #2563EB" : "none" }}
                        >
                          <img
                            src={foto.url_publica}
                            alt={foto.nome_arquivo ?? ""}
                            loading="lazy"
                            style={{ width: "100%", height: "100%", objectFit: "cover", opacity: modoSelecao && !sel ? 0.6 : 1, transition: "opacity 0.1s" }}
                          />
                          {modoSelecao && (
                            <div style={{ position: "absolute", top: 4, left: 4, width: 18, height: 18, borderRadius: 4, border: sel ? "none" : "1.5px solid #fff", background: sel ? "#2563EB" : "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              {sel && <span style={{ color: "#fff", fontSize: 10, fontWeight: 800 }}>✓</span>}
                            </div>
                          )}
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
                  {totalPaginas > 1 && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "8px 0 2px" }}>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setPagina(Math.max(0, pagAtual - 1)); }}
                        disabled={pagAtual === 0}
                        style={{ padding: "5px 14px", borderRadius: 7, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", fontSize: 12, fontWeight: 600, color: pagAtual === 0 ? "var(--color-border-secondary)" : "var(--color-text-primary)", cursor: pagAtual === 0 ? "default" : "pointer" }}
                      >← Anterior</button>
                      <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                        Página {pagAtual + 1} de {totalPaginas}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setPagina(Math.min(totalPaginas - 1, pagAtual + 1)); }}
                        disabled={pagAtual >= totalPaginas - 1}
                        style={{ padding: "5px 14px", borderRadius: 7, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", fontSize: 12, fontWeight: 600, color: pagAtual >= totalPaginas - 1 ? "var(--color-border-secondary)" : "var(--color-text-primary)", cursor: pagAtual >= totalPaginas - 1 ? "default" : "pointer" }}
                      >Próxima →</button>
                    </div>
                  )}
                </>
              );
            })()}

            {/* Fila de upload */}
            {fila.filter((f) => f.status !== "ok").length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 340, overflowY: "auto", paddingRight: 2 }}>
                {fila.filter((f) => f.status !== "ok").map((item) => (
                  <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 8, background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)" }}>
                    <img src={item.previewUrl} alt="" style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 5, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.file.name}</div>
                      {item.status === "erro" ? (
                        <div style={{ fontSize: 10, color: "#EF4444" }}>{item.erro}</div>
                      ) : item.status === "aguardando" ? (
                        <div style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>
                          {deferred ? "Na fila — será enviada ao salvar" : "Aguardando…"}
                        </div>
                      ) : (
                        <div style={{ height: 3, background: "var(--color-border-tertiary)", borderRadius: 2, marginTop: 4 }}>
                          <div style={{ height: "100%", borderRadius: 2, background: "#2563EB", width: `${item.progresso}%`, transition: "width 0.3s" }} />
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--color-text-secondary)", flexShrink: 0 }}>
                      {item.status === "aguardando" ? (deferred ? "Pendente" : "Aguardando") :
                       item.status === "processando" ? "Processando…" :
                       item.status === "enviando" ? "Enviando…" :
                       item.status === "erro" ? "Erro" : "✓"}
                    </div>
                    {(item.status === "aguardando" || item.status === "erro") && (
                      <button type="button" onClick={() => removerDaFila(item.id)} style={{ background: "none", border: "none", color: "var(--color-text-secondary)", cursor: "pointer", fontSize: 12 }}>✕</button>
                    )}
                  </div>
                ))}
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

      {total > 0 && !deferred && (
        <div style={{ marginTop: 8, fontSize: 11, color: "var(--color-text-secondary)" }}>
          As fotos são salvas imediatamente ao fazer upload. Clique no ✕ sobre uma foto para removê-la.
        </div>
      )}
    </div>
  );
});
