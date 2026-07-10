"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { processarImagemEntrega, formatBytes } from "@/lib/imageResize";
import { uploadFileClient } from "@/lib/storage/uploadClient";
import { deleteFilesClient } from "@/lib/storage/deleteClient";
import type { AlbumLamina } from "@/lib/supabase/types";

type FilaItem = {
  id: string;
  file: File;
  previewUrl: string;
  status: "aguardando" | "processando" | "enviando" | "ok" | "erro";
  progresso: number;
  erro?: string;
};

type Props = {
  /** Pode ser null quando o álbum ainda não existe (criação preguiçosa) */
  selecaoId: string | null;
  fotografoId: string;
  /** Versão corrente do álbum — só as lâminas desta versão são carregadas/enviadas aqui */
  versao?: number;
  /** Chamado antes do primeiro upload quando selecaoId é null — deve criar o álbum e retornar o id */
  ensureSelecaoId?: () => Promise<string | null>;
  onLaminasChange?: (laminas: AlbumLamina[]) => void;
};

export function LaminasUpload({ selecaoId, fotografoId, versao = 1, ensureSelecaoId, onLaminasChange }: Props) {
  const [fila,       setFila]       = useState<FilaItem[]>([]);
  const [laminas,    setLaminas]    = useState<AlbumLamina[]>([]);
  const [carregando, setCarregando] = useState(selecaoId !== null);
  const [dragOver,   setDragOver]   = useState(false);
  const inputRef  = useRef<HTMLInputElement>(null);
  // garante que apenas um upload rode por vez
  const processandoRef = useRef(false);
  const filaRef        = useRef<FilaItem[]>([]);
  // contador síncrono de lâminas (evita race condition com React state)
  const proximaOrdemRef = useRef(0);
  const selecaoIdRef = useRef<string | null>(selecaoId);
  selecaoIdRef.current = selecaoIdRef.current ?? selecaoId;

  useEffect(() => {
    if (!selecaoId) { setCarregando(false); return; }
    const supabase = createClient();
    supabase
      .from("album_laminas")
      .select("*")
      .eq("selecao_id", selecaoId)
      .eq("versao", versao)
      .order("ordem")
      .order("created_at")
      .then(({ data }) => {
        const lista = (data as AlbumLamina[]) ?? [];
        setLaminas(lista);
        proximaOrdemRef.current = lista.length;
        setCarregando(false);
      });
  }, [selecaoId, versao]);

  async function adicionarArquivos(files: FileList | File[]) {
    const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (arr.length === 0) return;

    // Cria o álbum de trabalho só agora, no primeiro upload
    if (!selecaoIdRef.current && ensureSelecaoId) {
      selecaoIdRef.current = await ensureSelecaoId();
    }
    if (!selecaoIdRef.current) return;

    const novos: FilaItem[] = arr.map((f) => ({
      id: crypto.randomUUID(),
      file: f,
      previewUrl: URL.createObjectURL(f),
      status: "aguardando" as const,
      progresso: 0,
    }));
    filaRef.current = [...filaRef.current, ...novos];
    setFila((prev) => [...prev, ...novos]);
    processarProximo();
  }

  async function processarProximo() {
    if (processandoRef.current) return;
    const proximo = filaRef.current.find((f) => f.status === "aguardando");
    if (!proximo) return;

    processandoRef.current = true;
    await processarEEnviar(proximo);
    processandoRef.current = false;
    processarProximo();
  }

  function atualizarItem(id: string, patch: Partial<FilaItem>) {
    filaRef.current = filaRef.current.map((f) => f.id === id ? { ...f, ...patch } : f);
    setFila((prev) => prev.map((f) => f.id === id ? { ...f, ...patch } : f));
  }

  async function processarEEnviar(item: FilaItem) {
    try {
      atualizarItem(item.id, { status: "processando", progresso: 15 });
      // Redimensiona para máx 1800px lado longo, qualidade 0.85
      const processed = await processarImagemEntrega(item.file, 1800, 0.85);
      atualizarItem(item.id, { status: "enviando", progresso: 50 });

      const supabase = createClient();
      const uuid = crypto.randomUUID();
      const path = `album/${fotografoId}/${selecaoIdRef.current}/${uuid}.jpg`;

      const { url_publica } = await uploadFileClient(path, processed.blob);
      atualizarItem(item.id, { progresso: 80 });

      const ordem = proximaOrdemRef.current;
      proximaOrdemRef.current++;

      const { data: lamina, error: dbErr } = await supabase
        .from("album_laminas")
        .insert({
          selecao_id:    selecaoIdRef.current,
          tipo:          "spread",
          storage_path:  path,
          url_publica:   url_publica,
          nome_arquivo:  item.file.name,
          tamanho_bytes: processed.tamanho_bytes,
          largura:       processed.largura,
          altura:        processed.altura,
          ordem,
          versao,
        })
        .select()
        .single();
      if (dbErr) throw new Error(dbErr.message);

      atualizarItem(item.id, { status: "ok", progresso: 100 });
      setLaminas((prev) => {
        const novas = [...prev, lamina as AlbumLamina];
        onLaminasChange?.(novas);
        return novas;
      });
    } catch (err: any) {
      atualizarItem(item.id, { status: "erro", erro: err.message ?? "Erro no upload", progresso: 0 });
    }
  }

  async function removerLamina(lamina: AlbumLamina) {
    const supabase = createClient();
    deleteFilesClient([{ storage_path: lamina.storage_path, url_publica: (lamina as any).url_publica ?? null }]);
    await supabase.from("album_laminas").delete().eq("id", lamina.id);
    const novas = laminas.filter((l) => l.id !== lamina.id);
    setLaminas(novas);
    onLaminasChange?.(novas);
  }

  function removerDaFila(id: string) {
    filaRef.current = filaRef.current.filter((f) => f.id !== id);
    setFila((prev) => {
      const item = prev.find((f) => f.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
  }

  const emAndamento = fila.filter((f) => f.status === "processando" || f.status === "enviando").length;
  const erros       = fila.filter((f) => f.status === "erro").length;
  const total       = laminas.length;

  return (
    <div>
      {/* Cabeçalho */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Lâminas
          </div>
          <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>
            {carregando
              ? "Carregando…"
              : total > 0
                ? `${total} lâmina${total !== 1 ? "s" : ""} (capa e contracapa são geradas automaticamente)`
                : "Nenhuma lâmina adicionada"}
            {emAndamento > 0 && <span style={{ color: "#2563EB" }}> · enviando {emAndamento}…</span>}
            {erros > 0 && <span style={{ color: "#EF4444" }}> · {erros} com erro</span>}
          </div>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={emAndamento > 0}
          style={{
            padding: "7px 14px", borderRadius: 8,
            border: "0.5px solid var(--color-border-secondary)",
            background: emAndamento > 0 ? "var(--color-background-tertiary)" : "var(--color-background-secondary)",
            fontSize: 12, fontWeight: 600,
            color: emAndamento > 0 ? "var(--color-text-secondary)" : "var(--color-text-primary)",
            cursor: emAndamento > 0 ? "not-allowed" : "pointer",
          }}
        >
          + Adicionar lâminas
        </button>
      </div>

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
              <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Carregando lâminas…</div>
            ) : (
              <>
                <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>
                  Arraste as lâminas ou clique para selecionar
                </div>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 4 }}>
                  JPG, PNG, WEBP · As imagens são redimensionadas automaticamente
                </div>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Lista de lâminas salvas */}
            {laminas.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {laminas.map((lamina, idx) => (
                  <div key={lamina.id} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 10px", borderRadius: 8,
                    background: "var(--color-background-primary)",
                    border: "0.5px solid var(--color-border-tertiary)",
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", width: 22, textAlign: "center", flexShrink: 0 }}>
                      {idx + 1}
                    </div>
                    <img
                      src={lamina.url_publica}
                      alt=""
                      style={{ width: 56, height: 32, objectFit: "cover", borderRadius: 5, flexShrink: 0, background: "var(--color-border-tertiary)" }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {lamina.nome_arquivo ?? `Lâmina ${idx + 1}`}
                      </div>
                      {lamina.largura && lamina.altura && (
                        <div style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>
                          {lamina.largura}×{lamina.altura}px
                          {lamina.tamanho_bytes ? ` · ${formatBytes(lamina.tamanho_bytes)}` : ""}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removerLamina(lamina)}
                      style={{ background: "none", border: "none", color: "var(--color-text-secondary)", cursor: "pointer", fontSize: 13, padding: "3px 8px", borderRadius: 5, flexShrink: 0, opacity: 0.5 }}
                      title="Remover"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Fila de upload */}
            {fila.filter((f) => f.status !== "ok").length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {fila.filter((f) => f.status !== "ok").map((item) => (
                  <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 8, background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)" }}>
                    <img src={item.previewUrl} alt="" style={{ width: 46, height: 26, objectFit: "cover", borderRadius: 5, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.file.name}</div>
                      {item.status === "erro" ? (
                        <div style={{ fontSize: 10, color: "#EF4444" }}>{item.erro}</div>
                      ) : item.status === "aguardando" ? (
                        <div style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>Na fila…</div>
                      ) : (
                        <div style={{ height: 3, background: "var(--color-border-tertiary)", borderRadius: 2, marginTop: 4 }}>
                          <div style={{ height: "100%", borderRadius: 2, background: "#2563EB", width: `${item.progresso}%`, transition: "width 0.3s" }} />
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--color-text-secondary)", flexShrink: 0, minWidth: 70, textAlign: "right" }}>
                      {item.status === "aguardando" ? "Aguardando" :
                       item.status === "processando" ? "Processando…" :
                       item.status === "enviando" ? "Enviando…" :
                       item.status === "erro" ? "Erro" : "✓"}
                    </div>
                    {item.status === "erro" && (
                      <button type="button" onClick={() => removerDaFila(item.id)} style={{ background: "none", border: "none", color: "var(--color-text-secondary)", cursor: "pointer", fontSize: 12, flexShrink: 0 }}>✕</button>
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

      {total > 0 && (
        <div style={{ marginTop: 8, fontSize: 11, color: "var(--color-text-secondary)" }}>
          A capa e contracapa são geradas automaticamente. Envie aqui apenas as páginas internas do álbum em ordem.
          Clique no ✕ de uma lâmina para removê-la.
        </div>
      )}
    </div>
  );
}
