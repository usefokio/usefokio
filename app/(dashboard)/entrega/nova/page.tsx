"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import { Field } from "@/components/ui/Field";
import { inputStyle } from "@/lib/styles";
import { ClienteSelect } from "../_components/ClienteSelect";
import { processarImagemEntrega, formatBytes } from "@/lib/imageResize";
import { uploadFileClient } from "@/lib/storage/uploadClient";
import type { Cliente, Categoria } from "@/lib/supabase/types";
import { mascaraMoeda, parseMoeda, formatarMoeda } from "@/lib/moeda";

const PRAZOS_FIXOS = [15, 30, 60, 120];

type ArquivoFila = {
  id: string;
  file: File;
  previewUrl: string;
  status: "aguardando" | "processando" | "enviando" | "ok" | "erro";
  progresso: number;
  erro?: string;
};

function addDias(n: number): Date {
  const d = new Date(); d.setDate(d.getDate() + n); return d;
}

function formatarData(d: Date): string {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

export default function NovaEntregaPage() {
  const router = useRouter();
  const { fotografo } = useFotografo();

  const hoje = new Date().toISOString().split("T")[0];

  const [titulo,      setTitulo]      = useState("");
  const [clienteId,   setClienteId]   = useState("");
  const [cliente,     setCliente]     = useState<Cliente | null>(null);
  const [dataEvento,  setDataEvento]  = useState(hoje);
  const [driveLink,   setDriveLink]   = useState("");
  const [prazoFixo,   setPrazoFixo]   = useState<number | "custom">(0);
  const [prazoCustom, setPrazoCustom] = useState("");
  const [renovacao,          setRenovacao]          = useState("");
  const [renovacaoDias,      setRenovacaoDias]      = useState("30");
  const [mensagem,           setMensagem]           = useState("");
  const [apenaZip,           setApenaZip]           = useState(false);
  const [ordenacaoFotos,     setOrdenacaoFotos]     = useState<"envio" | "nome" | "nome_desc" | "data">("nome");
  const [identificacaoObrig, setIdentificacaoObrig] = useState(false);
  const [driveApenasIdentif, setDriveApenasIdentif] = useState(false);
  const [categoriaId,        setCategoriaId]        = useState<string>("");
  const [categorias,         setCategorias]         = useState<Categoria[]>([]);
  const [saving,             setSaving]             = useState(false);
  const [initialized,        setInitialized]        = useState(false);

  const [fila,        setFila]        = useState<ArquivoFila[]>([]);
  const [dragOver,    setDragOver]    = useState(false);
  const [uploadTotal, setUploadTotal] = useState(0);
  const [uploadAtual, setUploadAtual] = useState(0);
  const inputFotosRef = useRef<HTMLInputElement>(null);
  const proximoRef   = useRef<(() => void) | null>(null);
  const canceladoRef = useRef(false);

  const [capaFile,    setCapaFile]    = useState<File | null>(null);
  const [capaPreview, setCapaPreview] = useState<string | null>(null);
  const inputCapaRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === "visible" && proximoRef.current) {
        proximoRef.current();
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  useEffect(() => {
    if (!fotografo || initialized) return;
    if (fotografo.mensagem_padrao_entrega) setMensagem(fotografo.mensagem_padrao_entrega);
    if (fotografo.renewal_fee_padrao != null) setRenovacao(formatarMoeda(fotografo.renewal_fee_padrao));
    // Carrega categorias do fotógrafo
    createClient()
      .from("categorias")
      .select("*")
      .eq("fotografo_id", fotografo.id)
      .order("ordem")
      .order("created_at")
      .then(({ data }) => setCategorias(data ?? []));
    setInitialized(true);
  }, [fotografo]);

  function adicionarArquivos(files: FileList | File[]) {
    const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
    setFila((prev) => {
      const existentes = new Set(prev.map((f) => f.file.name + "_" + f.file.size));
      const novos: ArquivoFila[] = arr
        .filter((f) => !existentes.has(f.name + "_" + f.size))
        .map((f) => ({
          id: crypto.randomUUID(),
          file: f,
          previewUrl: URL.createObjectURL(f),
          status: "aguardando",
          progresso: 0,
        }));
      return [...prev, ...novos];
    });
  }

  function removerArquivo(id: string) {
    setFila((prev) => {
      const item = prev.find((f) => f.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
  }

  function cancelarUpload() {
    canceladoRef.current = true;
    setUploadTotal(0);
    setUploadAtual(0);
  }

  async function enviarFila(idGaleria: string) {
    if (fila.length === 0 || !fotografo) return;
    canceladoRef.current = false;
    setUploadTotal(fila.length);
    setUploadAtual(0);
    let concluidos = 0;
    const supabase = createClient();
    const fotoId = fotografo.id;

    // Semáforo: máximo 3 uploads simultâneos
    const CONCORRENCIA = 3;
    let slots = CONCORRENCIA;
    const pendentes = [...fila];

    await new Promise<void>((done) => {
      let iniciados = 0;
      let finalizados = 0;
      const total = pendentes.length;

      const proximo = () => {
        if (canceladoRef.current) { done(); return; }
        while (slots > 0 && iniciados < total) {
          if (canceladoRef.current) { done(); return; }
          slots--;
          const item = pendentes[iniciados++];
          const upd = (patch: Partial<ArquivoFila>) =>
            setFila((prev) => prev.map((f) => f.id === item.id ? { ...f, ...patch } : f));

          (async () => {
            try {
              upd({ status: "processando", progresso: 15 });
              const processed = await processarImagemEntrega(item.file, 1200);
              upd({ status: "enviando", progresso: 50 });

              const path = `entrega/${fotoId}/${idGaleria}/${crypto.randomUUID()}.jpg`;
              const { storage_path, url_publica } = await uploadFileClient(path, processed.blob, processed.blob.type || "image/jpeg");
              upd({ progresso: 80 });

              const { error: dbErr } = await supabase.from("galerias_entrega_fotos").insert({
                galeria_id:    idGaleria,
                storage_path,
                url_publica,
                nome_arquivo:  item.file.name,
                tamanho_bytes: processed.tamanho_bytes,
                largura:       processed.largura,
                altura:        processed.altura,
                ordem:         0,
              });
              if (dbErr) throw new Error(dbErr.message);
              upd({ status: "ok", progresso: 100 });
            } catch (e) {
              upd({ status: "erro", erro: e instanceof Error ? e.message : "Erro no upload", progresso: 0 });
            } finally {
              slots++;
              concluidos++;
              setUploadAtual(concluidos);
              finalizados++;
              if (finalizados === total) done();
              else proximo();
            }
          })();
        }
      };

      proximoRef.current = proximo;
      proximo();
    });
    proximoRef.current = null;
  }

  const diasEfetivos = prazoFixo === "custom" ? (parseInt(prazoCustom) || 0) : prazoFixo;
  const dataExpiracao = diasEfetivos > 0 ? addDias(diasEfetivos) : null;

  async function handlePublicar() {
    if (!titulo.trim() || !fotografo) return;
    setSaving(true);
    const supabase = createClient();
    try {

    const expires_at = dataExpiracao ? dataExpiracao.toISOString() : null;
    const { data, error } = await supabase.from("galerias_entrega")
      .insert({
        fotografo_id: fotografo.id,
        cliente_id:   clienteId || null,
        categoria_id: categoriaId || null,
        titulo:       titulo.trim(),
        data_evento:  dataEvento || null,
        drive_link:   driveLink.trim() || null,
        expires_at,
        renewal_fee:  parseMoeda(renovacao),
        renovacao_dias: parseInt(renovacaoDias) || 30,
        mensagem:     mensagem.trim() || null,
        apenas_zip:   apenaZip,
        identificacao_obrigatoria: identificacaoObrig,
        drive_apenas_identificado: driveApenasIdentif,
        ordenacao_fotos: ordenacaoFotos,
        rascunho: false,
      })
      .select("id")
      .single();

    if (error || !data) { setSaving(false); return; }

    if (capaFile && fotografo) {
      const processed = await processarImagemEntrega(capaFile, 1920);
      const capaPath = `entrega/${fotografo.id}/${data.id}/capa.jpg`;
      const { url_publica: capaUrlPublica, storage_path: capaStoragePath } = await uploadFileClient(capaPath, processed.blob, "image/jpeg");
      await supabase.from("galerias_entrega").update({ foto_capa_url: capaUrlPublica, foto_capa_storage_path: capaStoragePath }).eq("id", data.id);
    }

      await enviarFila(data.id);
      router.push(`/entrega/${data.id}`);
    } catch (e) {
      console.error("Erro ao publicar galeria:", e);
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: "26px 30px", maxWidth: 640 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 10 }}>
          <button
            onClick={() => router.push("/entrega")}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--color-text-secondary)", padding: 0 }}
          >
            ← Voltar
          </button>
          <button
            onClick={handlePublicar}
            disabled={saving || !titulo.trim()}
            style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: saving || !titulo.trim() ? "var(--color-background-secondary)" : "var(--color-text-primary)", color: saving || !titulo.trim() ? "var(--color-text-secondary)" : "var(--color-background-primary)", fontSize: 13, fontWeight: 600, cursor: saving || !titulo.trim() ? "default" : "pointer", flexShrink: 0 }}
          >
            {saving ? "Publicando…" : fila.length > 0 ? `Publicar e enviar ${fila.length} foto${fila.length !== 1 ? "s" : ""}` : "Publicar galeria"}
          </button>
        </div>
        <h1 style={{ fontSize: 19, fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 3px", letterSpacing: "-0.02em" }}>
          Nova galeria de entrega
        </h1>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
          Entregue as fotos via link do Google Drive, galeria online, ou ambos
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        <Field label="Título da galeria" tooltip="Nome que identifica esta galeria. O cliente verá este nome ao acessar o link de entrega.">
          <input
            type="text"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ex: Casamento Ana & Pedro"
            style={inputStyle}
          />
        </Field>

        <Field label="Foto de capa" hint="Opcional — aparece como destaque na galeria do cliente" tooltip="Imagem exibida no topo da galeria do cliente. Recomendado: foto horizontal com boa composição.">
          <input
            ref={inputCapaRef}
            type="file" accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setCapaFile(f);
              setCapaPreview(URL.createObjectURL(f));
              e.target.value = "";
            }}
          />
          {capaPreview ? (
            <div style={{ position: "relative", width: "100%", aspectRatio: "16/7", borderRadius: 10, overflow: "hidden", background: "var(--color-border-tertiary)" }}>
              <img src={capaPreview} alt="Capa" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <button
                type="button"
                onClick={() => { setCapaFile(null); setCapaPreview(null); }}
                style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.55)", border: "none", borderRadius: 6, color: "#fff", fontSize: 11, fontWeight: 600, padding: "4px 10px", cursor: "pointer" }}
              >
                Remover
              </button>
              <button
                type="button"
                onClick={() => inputCapaRef.current?.click()}
                style={{ position: "absolute", top: 8, left: 8, background: "rgba(0,0,0,0.55)", border: "none", borderRadius: 6, color: "#fff", fontSize: 11, fontWeight: 600, padding: "4px 10px", cursor: "pointer" }}
              >
                Trocar
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => inputCapaRef.current?.click()}
              style={{ width: "100%", padding: "18px 0", border: "1.5px dashed var(--color-border-secondary)", borderRadius: 10, background: "var(--color-background-primary)", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 13 }}
            >
              🖼 Selecionar foto de capa
            </button>
          )}
        </Field>

        <Field label="Cliente" tooltip="Vincule esta galeria a um cliente cadastrado. Necessário para enviar o link por e-mail automaticamente.">
          <ClienteSelect
            value={clienteId}
            onChange={(id, c) => { setClienteId(id); setCliente(c); }}
          />
        </Field>

        <Field label="Data do evento" tooltip="Data em que o evento ocorreu. Usada para organizar e filtrar galerias.">
          <input
            type="date"
            value={dataEvento}
            onChange={(e) => setDataEvento(e.target.value)}
            style={inputStyle}
          />
        </Field>

        {categorias.length > 0 && (
          <Field label="Categoria" hint="Preenche a taxa de renovação automaticamente" tooltip="Categoria do serviço prestado. Ao selecionar, a taxa de renovação padrão da categoria é preenchida automaticamente.">
            <select
              value={categoriaId}
              onChange={(e) => {
                const id = e.target.value;
                setCategoriaId(id);
                const cat = categorias.find((c) => c.id === id);
                if (cat?.taxa_renovacao_padrao != null) {
                  setRenovacao(formatarMoeda(cat.taxa_renovacao_padrao));
                }
              }}
              style={inputStyle}
            >
              <option value="">— Sem categoria —</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </Field>
        )}

        <Field label="Link do Google Drive" hint="Opcional — deixe em branco para usar somente a galeria online" tooltip="Link de uma pasta do Google Drive com os arquivos originais. O cliente verá um botão para acessar. Configure o Drive como 'qualquer pessoa com o link pode visualizar'.">
          <input
            type="url"
            value={driveLink}
            onChange={(e) => setDriveLink(e.target.value)}
            placeholder="https://drive.google.com/drive/folders/…"
            style={inputStyle}
          />
          {driveLink.trim() && (
            <div style={{
              marginTop: 7,
              background: "rgba(245,158,11,0.08)",
              border: "0.5px solid rgba(245,158,11,0.3)",
              borderRadius: 7, padding: "8px 12px",
              fontSize: 12, color: "#92400E", lineHeight: 1.5,
            }}>
              ℹ️ Certifique-se de que o link esteja configurado como <strong>"Qualquer pessoa com o link pode visualizar"</strong> no Google Drive.
            </div>
          )}
        </Field>

        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 7, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Prazo de acesso
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button type="button" onClick={() => setPrazoFixo(0)} style={{
              padding: "9px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
              border: `0.5px solid ${prazoFixo === 0 ? "var(--color-text-primary)" : "var(--color-border-secondary)"}`,
              background: prazoFixo === 0 ? "var(--color-text-primary)" : "var(--color-background-secondary)",
              color: prazoFixo === 0 ? "var(--color-background-primary)" : "var(--color-text-secondary)",
              transition: "all 0.15s",
            }}>
              Sem prazo
            </button>
            {PRAZOS_FIXOS.map((d) => (
              <button key={d} type="button" onClick={() => setPrazoFixo(d)} style={{
                padding: "9px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
                border: `0.5px solid ${prazoFixo === d ? "var(--color-text-primary)" : "var(--color-border-secondary)"}`,
                background: prazoFixo === d ? "var(--color-text-primary)" : "var(--color-background-secondary)",
                color: prazoFixo === d ? "var(--color-background-primary)" : "var(--color-text-secondary)",
                transition: "all 0.15s",
              }}>
                {d} dias
              </button>
            ))}
            <button type="button" onClick={() => setPrazoFixo("custom")} style={{
              padding: "9px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
              border: `0.5px solid ${prazoFixo === "custom" ? "var(--color-text-primary)" : "var(--color-border-secondary)"}`,
              background: prazoFixo === "custom" ? "var(--color-text-primary)" : "var(--color-background-secondary)",
              color: prazoFixo === "custom" ? "var(--color-background-primary)" : "var(--color-text-secondary)",
              transition: "all 0.15s",
            }}>
              Personalizado
            </button>
          </div>
          {prazoFixo === "custom" && (
            <input
              type="number" min={1} placeholder="Número de dias"
              value={prazoCustom} onChange={(e) => setPrazoCustom(e.target.value)}
              style={{ ...inputStyle, marginTop: 8, width: 180 }}
            />
          )}
          {dataExpiracao && (
            <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--color-text-secondary)" }}>
              <span>📅</span>
              <span>
                Expira em <strong style={{ color: "var(--color-text-primary)" }}>{formatarData(dataExpiracao)}</strong>
                <span style={{ fontSize: 11, marginLeft: 6 }}>({diasEfetivos} dias a partir de hoje)</span>
              </span>
            </div>
          )}
        </div>

        <Field label="Taxa de renovação" tooltip="Valor cobrado do cliente para reabrir o acesso à galeria após o prazo expirar. Deixe em branco para não cobrar renovação.">
          <div style={{ position: "relative", width: 200 }}>
            <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "var(--color-text-secondary)", pointerEvents: "none" }}>R$</span>
            <input
              type="text" inputMode="numeric"
              value={renovacao} onChange={(e) => setRenovacao(mascaraMoeda(e.target.value))}
              placeholder="0,00"
              style={{ ...inputStyle, width: "100%", paddingLeft: 34 }}
            />
          </div>
          <p style={{ fontSize: 11, color: "var(--color-text-secondary)", margin: "4px 0 0" }}>
            Valor cobrado do cliente para reabrir o acesso após expirar.
          </p>
          {renovacao.trim() !== "" && (
            <div style={{ marginTop: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", display: "block", marginBottom: 6 }}>
                Dias liberados após o pagamento
              </label>
              <input
                type="number" min={1}
                value={renovacaoDias}
                onChange={(e) => setRenovacaoDias(e.target.value)}
                style={{ ...inputStyle, width: 120 }}
              />
            </div>
          )}
        </Field>

        <Field label="Mensagem para o cliente" tooltip="Texto enviado por e-mail ao cliente junto com o link da galeria. Você pode personalizar por galeria ou usar a mensagem padrão configurada em Configurações.">
          <textarea
            value={mensagem} onChange={(e) => setMensagem(e.target.value)}
            placeholder="Olá! Suas fotos estão prontas 🎉 Acesse o link abaixo para baixar…"
            rows={4}
            style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
          />
          {fotografo?.mensagem_padrao_entrega && mensagem !== fotografo.mensagem_padrao_entrega && (
            <button
              type="button"
              onClick={() => setMensagem(fotografo.mensagem_padrao_entrega!)}
              style={{
                marginTop: 6, background: "none", border: "none", padding: 0,
                fontSize: 11, color: "var(--color-text-secondary)", cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              ↺ Restaurar mensagem padrão
            </button>
          )}
        </Field>

        <div style={{ background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "18px 22px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 16 }}>
            Opções de acesso e download
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer" }}>
              <input type="checkbox" checked={identificacaoObrig} onChange={(e) => setIdentificacaoObrig(e.target.checked)} style={{ marginTop: 2, width: 16, height: 16, accentColor: "var(--color-text-primary)", cursor: "pointer", flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 3 }}>Exigir identificação</div>
                <div style={{ fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>O cliente precisa informar nome e e-mail antes de acessar.</div>
              </div>
            </label>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer" }}>
              <input type="checkbox" checked={apenaZip} onChange={(e) => setApenaZip(e.target.checked)} style={{ marginTop: 2, width: 16, height: 16, accentColor: "var(--color-text-primary)", cursor: "pointer", flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 3 }}>Galeria somente visualização</div>
                <div style={{ fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>Desativa o download individual de fotos.</div>
              </div>
            </label>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer" }}>
              <input type="checkbox" checked={driveApenasIdentif} onChange={(e) => setDriveApenasIdentif(e.target.checked)} style={{ marginTop: 2, width: 16, height: 16, accentColor: "var(--color-text-primary)", cursor: "pointer", flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 3 }}>Link do Drive somente após identificação</div>
                <div style={{ fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>Oculta o botão "Baixar todas" até o cliente se identificar.</div>
              </div>
            </label>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 6 }}>Ordem das fotos na galeria</div>
              <select
                value={ordenacaoFotos}
                onChange={(e) => setOrdenacaoFotos(e.target.value as "envio" | "nome" | "data")}
                style={{ ...inputStyle, width: 240 }}
              >
                <option value="nome">Nome do arquivo (A–Z)</option>
                <option value="nome_desc">Nome do arquivo (Z–A)</option>
                <option value="envio">Ordem de envio</option>
                <option value="data">Data de envio (mais recente primeiro)</option>
              </select>
            </div>
          </div>
        </div>

        <div style={{ background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "18px 22px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
            Fotos da galeria
          </div>
          <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "0 0 14px", lineHeight: 1.5 }}>
            Selecione as fotos agora — elas serão enviadas quando você publicar a galeria.
          </p>

          <input
            ref={inputFotosRef}
            type="file" accept="image/*" multiple
            style={{ display: "none" }}
            onChange={(e) => { if (e.target.files) adicionarArquivos(e.target.files); e.target.value = ""; }}
          />

          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); adicionarArquivos(e.dataTransfer.files); }}
            onClick={() => inputFotosRef.current?.click()}
            style={{
              border: `1.5px dashed ${dragOver ? "#2563EB" : "var(--color-border-secondary)"}`,
              borderRadius: 10,
              background: dragOver ? "rgba(37,99,235,0.04)" : "var(--color-background-primary)",
              padding: fila.length === 0 ? "28px 20px" : "14px 16px",
              textAlign: "center", cursor: "pointer", transition: "all 0.15s",
            }}
          >
            <div style={{ fontSize: fila.length === 0 ? 26 : 18, marginBottom: 6 }}>🖼</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>
              {fila.length === 0 ? "Arraste fotos ou clique para selecionar" : "+ Adicionar mais fotos"}
            </div>
            {fila.length === 0 && (
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 4 }}>
                JPG, PNG, WEBP · As fotos serão reduzidas para baixa resolução
              </div>
            )}
          </div>

          {fila.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))", gap: 6, maxHeight: 260, overflowY: "auto" }}>
                {fila.map((item) => (
                  <div key={item.id} style={{ position: "relative", aspectRatio: "1", borderRadius: 7, overflow: "hidden", background: "var(--color-border-tertiary)" }}>
                    <img src={item.previewUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: item.status === "erro" ? 0.4 : 1 }} />
                    {item.status === "erro" && (
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>⚠️</div>
                    )}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removerArquivo(item.id); }}
                      style={{ position: "absolute", top: 3, right: 3, width: 18, height: 18, borderRadius: "50%", background: "rgba(0,0,0,0.6)", border: "none", color: "#fff", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}
                    >✕</button>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 8 }}>
                {fila.length} foto{fila.length !== 1 ? "s" : ""} na fila ({formatBytes(fila.reduce((s, f) => s + f.file.size, 0))}) · serão enviadas ao publicar
              </div>
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 10, paddingTop: 8 }}>
          <button
            onClick={handlePublicar}
            disabled={saving || !titulo.trim()}
            style={{
              padding: "10px 24px", borderRadius: 9, border: "none",
              background: saving || !titulo.trim() ? "var(--color-background-secondary)" : "var(--color-text-primary)",
              color: saving || !titulo.trim() ? "var(--color-text-secondary)" : "var(--color-background-primary)",
              fontSize: 13, fontWeight: 600, cursor: saving || !titulo.trim() ? "default" : "pointer",
            }}
          >
            {saving ? "Publicando…" : fila.length > 0 ? `Publicar e enviar ${fila.length} foto${fila.length !== 1 ? "s" : ""}` : "Publicar galeria"}
          </button>
          <button
            onClick={() => router.push("/entrega")}
            style={{
              padding: "10px 18px", borderRadius: 9,
              border: "0.5px solid var(--color-border-secondary)",
              background: "transparent", fontSize: 13,
              color: "var(--color-text-secondary)", cursor: "pointer",
            }}
          >
            Cancelar
          </button>
        </div>
      </div>

      {uploadTotal > 0 && uploadAtual < uploadTotal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 90 }}>
          <div style={{ background: "var(--color-background-primary)", borderRadius: 14, padding: "30px 36px", width: 360, textAlign: "center", boxShadow: "0 8px 40px rgba(0,0,0,0.25)" }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>📤</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 6 }}>Enviando fotos…</div>
            <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 16 }}>{uploadAtual} de {uploadTotal}</div>
            <div style={{ height: 8, background: "var(--color-background-secondary)", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 4, background: "#2563EB", width: `${Math.round((uploadAtual / uploadTotal) * 100)}%`, transition: "width 0.3s" }} />
            </div>
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 12 }}>Não feche esta janela até concluir.</div>
            <button
              onClick={cancelarUpload}
              style={{ marginTop: 16, padding: "7px 18px", borderRadius: 7, border: "0.5px solid var(--color-border-secondary)", background: "transparent", fontSize: 13, color: "var(--color-text-secondary)", cursor: "pointer" }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
