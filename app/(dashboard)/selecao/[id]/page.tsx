"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import { processarImagem, formatBytes } from "@/lib/imageResize";
import { PLANOS, pctUso, corBarra, type PlanoId } from "@/lib/planos";
import type {
  GaleriaSelecao, GaleriaSelecaoFoto, Cliente, Categoria,
} from "@/lib/supabase/types";

// ─── tipos locais ─────────────────────────────────────────────────────────────
type FotoComStatus = GaleriaSelecaoFoto & {
  _uploading?: boolean;
  _progresso?: number;
  _erro?: string;
  _previewUrl?: string;
};

type EscolhaItem = {
  id: string;
  foto_id: string;
  comentario: string | null;
  created_at: string;
  fotos: { nome_arquivo: string | null; url_publica: string | null; thumbnail_path: string | null } | null;
};

type Tab = "fotos" | "andamento" | "selecoes" | "configuracoes";

type Evento = {
  id: string;
  tipo: string;
  descricao: string | null;
  foto_id: string | null;
  created_at: string;
};

// ─── Modal: Enviar acesso ao cliente ─────────────────────────────────────────
function ModalEnviarAcesso({
  galeria,
  cliente,
  onClose,
}: {
  galeria:  GaleriaSelecao;
  cliente:  Cliente | null;
  onClose:  () => void;
}) {
  const link   = typeof window !== "undefined" ? `${window.location.origin}/galeria/${galeria.id}` : `/galeria/${galeria.id}`;
  const senha  = cliente?.senha_acesso ?? "";
  const email  = cliente?.email ?? "";

  const mensagem = `Olá${cliente?.nome ? `, ${cliente.nome.split(" ")[0]}` : ""}! 🎉\n\nSua galeria de fotos está pronta para seleção!\n\n📸 ${galeria.titulo}\n\n🔗 Acesso: ${link}\n${email ? `📧 Email: ${email}\n` : ""}${senha ? `🔑 Senha: ${senha}\n` : ""}\nSelecione suas fotos favoritas até ${galeria.expira_em ? new Date(galeria.expira_em).toLocaleDateString("pt-BR") : "o prazo combinado"}. Qualquer dúvida, é só me chamar!`;

  const [copiado, setCopiado] = useState<"link" | "senha" | "msg" | null>(null);

  function copiar(texto: string, tipo: "link" | "senha" | "msg") {
    navigator.clipboard.writeText(texto);
    setCopiado(tipo);
    setTimeout(() => setCopiado(null), 2000);
  }

  const CopyBtn = ({ tipo, texto }: { tipo: "link" | "senha" | "msg"; texto: string }) => (
    <button
      onClick={() => copiar(texto, tipo)}
      style={{
        padding: "5px 11px", borderRadius: 6, flexShrink: 0,
        background: copiado === tipo ? "rgba(5,150,105,0.1)" : "var(--color-background-secondary)",
        border: "0.5px solid var(--color-border-secondary)",
        color: copiado === tipo ? "#059669" : "var(--color-text-secondary)",
        fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
        whiteSpace: "nowrap",
      }}
    >
      {copiado === tipo ? "✓ Copiado" : "Copiar"}
    </button>
  );

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 16, padding: "28px 32px", width: 500, maxWidth: "95vw", boxShadow: "0 24px 64px rgba(0,0,0,0.2)", maxHeight: "90vh", overflowY: "auto" }}>

        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 4 }}>
          📬 Enviar acesso ao cliente
        </div>
        <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 22 }}>
          Compartilhe as informações abaixo com{cliente?.nome ? ` ${cliente.nome}` : " seu cliente"}.
          {!email && " (cliente sem e-mail cadastrado)"}
        </div>

        {/* Link */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Link da galeria</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ flex: 1, padding: "9px 12px", background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 8, fontSize: 12, color: "var(--color-text-primary)", wordBreak: "break-all", fontFamily: "monospace" }}>
              {link}
            </div>
            <CopyBtn tipo="link" texto={link} />
          </div>
        </div>

        {/* Email */}
        {email && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>E-mail do cliente</div>
            <div style={{ padding: "9px 12px", background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 8, fontSize: 13, color: "var(--color-text-primary)" }}>
              {email}
            </div>
          </div>
        )}

        {/* Senha */}
        {senha ? (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Senha de acesso</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ flex: 1, padding: "9px 12px", background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 8, fontSize: 16, fontWeight: 700, color: "var(--color-text-primary)", fontFamily: "monospace", letterSpacing: "0.15em" }}>
                {senha}
              </div>
              <CopyBtn tipo="senha" texto={senha} />
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: 20, padding: "10px 12px", background: "rgba(245,158,11,0.08)", border: "0.5px solid rgba(245,158,11,0.3)", borderRadius: 8, fontSize: 12, color: "#92400E" }}>
            ⚠️ Este cliente não tem senha cadastrada. Acesso à galeria é público para quem tiver o link.
          </div>
        )}

        {/* Mensagem pronta */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
            Mensagem pronta para enviar
          </div>
          <div style={{ padding: "12px 14px", background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 8, fontSize: 12, color: "var(--color-text-primary)", whiteSpace: "pre-wrap", lineHeight: 1.6, marginBottom: 8 }}>
            {mensagem}
          </div>
          <button
            onClick={() => copiar(mensagem, "msg")}
            style={{ width: "100%", padding: "10px", borderRadius: 8, background: copiado === "msg" ? "rgba(5,150,105,0.1)" : "var(--color-background-secondary)", border: `0.5px solid ${copiado === "msg" ? "rgba(5,150,105,0.4)" : "var(--color-border-secondary)"}`, color: copiado === "msg" ? "#059669" : "var(--color-text-primary)", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}
          >
            {copiado === "msg" ? "✓ Mensagem copiada!" : "📋 Copiar mensagem completa"}
          </button>
        </div>

        {/* Nota sobre e-mail */}
        <div style={{ padding: "10px 12px", background: "rgba(37,99,235,0.05)", border: "0.5px solid rgba(37,99,235,0.15)", borderRadius: 8, fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 20 }}>
          ✉️ <strong>Envio por e-mail automático</strong> será implementado em breve. Por enquanto, copie a mensagem acima e envie pelo canal de sua preferência (WhatsApp, e-mail, etc).
        </div>

        <button onClick={onClose} style={{ width: "100%", padding: "10px", borderRadius: 8, background: "var(--color-text-primary)", color: "var(--color-background-primary)", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          Fechar
        </button>
      </div>
    </div>
  );
}

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

// ─── FotoCard — com seletor de capa ──────────────────────────────────────────
function FotoCard({
  foto,
  isCapa,
  onDelete,
  onSetarCapa,
}: {
  foto: FotoComStatus;
  isCapa: boolean;
  onDelete: (id: string) => void;
  onSetarCapa: (id: string | null) => void;
}) {
  const [hover, setHover] = useState(false);
  const src = foto._previewUrl ?? foto.url_publica ?? foto.thumbnail_path ?? "";

  return (
    <div
      style={{
        position: "relative", borderRadius: 8, overflow: "hidden",
        aspectRatio: "1", background: "var(--color-background-secondary)",
        border: isCapa
          ? "2px solid #F59E0B"
          : "0.5px solid var(--color-border-tertiary)",
        transition: "border 0.15s",
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {src && (
        <img
          src={src}
          alt={foto.nome_arquivo ?? "foto"}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          loading="lazy"
        />
      )}

      {/* Badge de capa */}
      {isCapa && (
        <div style={{
          position: "absolute", top: 6, left: 6,
          background: "#F59E0B", color: "#000",
          fontSize: 9, fontWeight: 800, padding: "2px 7px",
          borderRadius: 20, letterSpacing: "0.05em",
        }}>
          CAPA
        </div>
      )}

      {/* Overlay de upload */}
      {foto._uploading && (
        <div style={{
          position: "absolute", inset: 0,
          background: "rgba(0,0,0,0.55)",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          <div style={{ fontSize: 11, color: "#fff", fontWeight: 600 }}>
            {foto._progresso ?? 0}%
          </div>
          <div style={{ width: "70%", height: 4, background: "rgba(255,255,255,0.2)", borderRadius: 2 }}>
            <div style={{ width: `${foto._progresso ?? 0}%`, height: "100%", background: "#2563EB", borderRadius: 2, transition: "width 0.3s" }} />
          </div>
        </div>
      )}

      {/* Erro */}
      {foto._erro && (
        <div style={{
          position: "absolute", inset: 0,
          background: "rgba(239,68,68,0.85)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 10, color: "#fff", padding: 4, textAlign: "center",
        }}>
          ⚠️ {foto._erro}
        </div>
      )}

      {/* Hover: info + ações */}
      {hover && !foto._uploading && !foto._erro && (
        <div style={{
          position: "absolute", inset: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex", flexDirection: "column",
          justifyContent: "space-between",
          padding: 8,
        }}>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.8)", lineHeight: 1.4 }}>
            {foto.largura && foto.altura ? `${foto.largura}×${foto.altura}` : ""}
            {foto.tamanho_bytes ? ` · ${formatBytes(foto.tamanho_bytes)}` : ""}
          </div>
          <div style={{ display: "flex", gap: 4, justifyContent: "space-between", alignItems: "flex-end" }}>
            {/* Botão de capa */}
            <button
              onClick={() => onSetarCapa(isCapa ? null : foto.id)}
              title={isCapa ? "Remover como capa" : "Definir como capa"}
              style={{
                background: isCapa ? "rgba(245,158,11,0.9)" : "rgba(255,255,255,0.15)",
                border: "none", borderRadius: 5, padding: "3px 7px",
                fontSize: 11, color: "#fff", cursor: "pointer", fontWeight: 600,
              }}
            >
              {isCapa ? "★ Capa" : "☆ Capa"}
            </button>
            <button
              onClick={() => onDelete(foto.id)}
              style={{
                background: "rgba(239,68,68,0.85)", border: "none",
                borderRadius: 5, padding: "3px 7px",
                fontSize: 11, color: "#fff", cursor: "pointer", fontWeight: 600,
              }}
            >
              🗑
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Zona de upload ───────────────────────────────────────────────────────────
function UploadZone({ onFiles }: { onFiles: (files: File[]) => void }) {
  const [drag, setDrag] = useState(false);
  const inputRef        = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
    if (files.length) onFiles(files);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      style={{
        border: `2px dashed ${drag ? "#2563EB" : "var(--color-border-secondary)"}`,
        borderRadius: 12, padding: "32px 24px",
        textAlign: "center", cursor: "pointer",
        background: drag ? "rgba(37,99,235,0.04)" : "var(--color-background-secondary)",
        transition: "all 0.2s", marginBottom: 20,
      }}
    >
      <div style={{ fontSize: 32, marginBottom: 10 }}>📁</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 4 }}>
        Arraste as fotos aqui ou clique para selecionar
      </div>
      <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
        JPEG, PNG ou WebP · Máximo 50 MB por arquivo
      </div>
      <input
        ref={inputRef}
        type="file" multiple accept="image/jpeg,image/jpg,image/png,image/webp"
        style={{ display: "none" }}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) onFiles(files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function GaleriaSelecaoPage() {
  const { id }        = useParams<{ id: string }>();
  const router        = useRouter();
  const { fotografo, reload } = useFotografo();

  const [galeria, setGaleria]       = useState<GaleriaSelecao | null>(null);
  const [cliente, setCliente]       = useState<Cliente | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [fotos, setFotos]           = useState<FotoComStatus[]>([]);
  const [escolhas, setEscolhas]     = useState<EscolhaItem[]>([]);
  const [eventos, setEventos]       = useState<Evento[]>([]);
  const [loading, setLoading]       = useState(true);
  const [tab, setTab]               = useState<Tab>("fotos"); // ajustado após load
  const [catFiltro, setCatFiltro]   = useState<string>("todas");
  const [enviando, setEnviando]     = useState(0);
  const [copiado, setCopiado]       = useState(false);
  const [modalAcesso, setModalAcesso] = useState(false);
  const [avisoLimite, setAvisoLimite] = useState(false);

  // ── Carrega galeria ──
  useEffect(() => {
    async function load() {
      const supabase = createClient();

      const [{ data: gal }, { data: fts }, { data: cats }, { data: esc }, { data: evs }] = await Promise.all([
        supabase.from("galerias_selecao").select("*").eq("id", id).single(),
        supabase.from("galerias_selecao_fotos").select("*").eq("galeria_id", id).order("ordem").order("created_at"),
        supabase.from("galeria_selecao_categorias").select("categorias(*)").eq("galeria_id", id),
        supabase.from("galerias_selecao_escolhas")
          .select("id, foto_id, comentario, created_at, fotos:galerias_selecao_fotos(nome_arquivo, url_publica, thumbnail_path)")
          .eq("galeria_id", id)
          .order("created_at"),
        supabase.from("galeria_selecao_eventos")
          .select("id, tipo, descricao, foto_id, created_at")
          .eq("galeria_id", id)
          .order("created_at", { ascending: false }),
      ]);

      if (gal) {
        setGaleria(gal);
        setFotos((fts ?? []) as FotoComStatus[]);
        const catList = (cats ?? []).map((r: any) => r.categorias).filter(Boolean) as Categoria[];
        setCategorias(catList);
        setEscolhas((esc ?? []) as unknown as EscolhaItem[]);
        setEventos((evs ?? []) as Evento[]);
        // Se aguardando revisão, abre direto na aba de seleção do cliente
        if (gal.status === "aguardando_revisao") setTab("selecoes");
        if (gal.cliente_id) {
          const { data: cli } = await supabase.from("clientes").select("*").eq("id", gal.cliente_id).single();
          setCliente(cli);
        }
      }
      setLoading(false);
    }
    load();
  }, [id]);

  // ── Upload ──
  const handleFiles = useCallback(async (files: File[]) => {
    if (!fotografo || !galeria) return;

    // Verifica limite do plano (avisa mas não bloqueia — comportamento beta)
    const plano = PLANOS[fotografo.plano as PlanoId] ?? PLANOS.gratuito;
    const usadas = fotografo.total_fotos_usadas ?? 0;
    if (plano.limite_fotos !== null && usadas >= plano.limite_fotos) {
      setAvisoLimite(true);
    }

    setEnviando((n) => n + files.length);

    const placeholders: FotoComStatus[] = files.map((file) => ({
      id:            crypto.randomUUID(),
      galeria_id:    galeria.id,
      categoria_id:  null,
      storage_path:  "",
      thumbnail_path: null,
      url_publica:   null,
      nome_arquivo:  file.name,
      largura:       null,
      altura:        null,
      tamanho_bytes: null,
      resolucao:     null,
      ordem:         0,
      created_at:    new Date().toISOString(),
      _uploading:    true,
      _progresso:    0,
      _previewUrl:   URL.createObjectURL(file),
    }));

    setFotos((prev) => [...placeholders, ...prev]);
    const supabase = createClient();

    await Promise.all(
      files.map(async (file, idx) => {
        const placeholderId = placeholders[idx].id;
        const setP = (p: number) =>
          setFotos((prev) => prev.map((f) => f.id === placeholderId ? { ...f, _progresso: p } : f));

        try {
          setP(10);
          const processed = await processarImagem(file, galeria.resolucao_exibicao);
          setP(40);

          const uuid      = crypto.randomUUID();
          const mainPath  = `${fotografo.id}/${galeria.id}/${uuid}.jpg`;
          const thumbPath = `${fotografo.id}/${galeria.id}/thumbs/${uuid}.jpg`;

          const { error: e1 } = await supabase.storage.from("galerias").upload(mainPath, processed.blob, { contentType: "image/jpeg", upsert: false });
          if (e1) throw new Error(e1.message);
          setP(70);

          const { error: e2 } = await supabase.storage.from("galerias").upload(thumbPath, processed.thumbnail, { contentType: "image/jpeg", upsert: false });
          if (e2) throw new Error(e2.message);
          setP(85);

          const { data: mainUrl }  = supabase.storage.from("galerias").getPublicUrl(mainPath);
          const { data: thumbUrl } = supabase.storage.from("galerias").getPublicUrl(thumbPath);

          const { data: fotoSalva, error: e3 } = await supabase
            .from("galerias_selecao_fotos")
            .insert({
              galeria_id:    galeria.id,
              storage_path:  mainPath,
              thumbnail_path: thumbUrl.publicUrl,
              url_publica:   mainUrl.publicUrl,
              nome_arquivo:  file.name,
              largura:       processed.largura,
              altura:        processed.altura,
              tamanho_bytes: processed.tamanho_bytes,
              resolucao:     galeria.resolucao_exibicao,
              ordem:         0,
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
          // Atualiza contador global do fotógrafo no contexto (o trigger já atualizou o DB)
          reload();

        } catch (err: any) {
          setFotos((prev) => prev.map((f) =>
            f.id === placeholderId ? { ...f, _uploading: false, _erro: err.message ?? "Erro no upload" } : f
          ));
        }
        setEnviando((n) => n - 1);
      })
    );
  }, [fotografo, galeria]);

  // ── Deletar foto ──
  const handleDelete = useCallback(async (fotoId: string) => {
    const foto = fotos.find((f) => f.id === fotoId);
    if (!foto || foto._uploading) return;
    const supabase = createClient();
    await supabase.from("galerias_selecao_fotos").delete().eq("id", fotoId);
    if (foto.storage_path)   supabase.storage.from("galerias").remove([foto.storage_path]);
    if (foto.thumbnail_path) supabase.storage.from("galerias").remove([foto.thumbnail_path]);
    setFotos((prev) => prev.filter((f) => f.id !== fotoId));
    setGaleria((g) => g ? { ...g, total_fotos: Math.max(0, g.total_fotos - 1) } : g);
    // Se era a capa, limpa
    if (galeria?.foto_capa_id === fotoId) setGaleria((g) => g ? { ...g, foto_capa_id: null } : g);
  }, [fotos, galeria]);

  // ── Setar capa ──
  const handleSetarCapa = useCallback(async (fotoId: string | null) => {
    const supabase = createClient();
    await supabase.rpc("fotografo_setar_capa", { p_galeria_id: id, p_foto_id: fotoId });
    setGaleria((g) => g ? { ...g, foto_capa_id: fotoId } : g);
  }, [id]);

  // ── Mudar status (via RPC — também reseta selecao_enviada ao reativar) ──
  async function mudarStatus(novoStatus: GaleriaSelecao["status"]) {
    const supabase = createClient();
    await supabase.rpc("fotografo_mudar_status", { p_galeria_id: id, p_status: novoStatus });
    setGaleria((g) => g ? {
      ...g,
      status:             novoStatus,
      // Ao reativar: limpa o flag de seleção enviada para o cliente ter acesso novamente
      selecao_enviada:    novoStatus === "ativa" ? false : g.selecao_enviada,
      selecao_enviada_em: novoStatus === "ativa" ? null  : g.selecao_enviada_em,
    } : g);
    // Atualiza eventos
    const { data } = await supabase.from("galeria_selecao_eventos")
      .select("id, tipo, descricao, foto_id, created_at")
      .eq("galeria_id", id).order("created_at", { ascending: false });
    if (data) setEventos(data as Evento[]);
  }

  // ── Reabrir para reedição (de aguardando_revisao → ativa) ──
  async function reativarGaleria() {
    const supabase = createClient();
    await supabase.rpc("fotografo_reativar_galeria", { p_galeria_id: id });
    setGaleria((g) => g ? { ...g, status: "ativa", selecao_enviada: false, selecao_enviada_em: null } : g);
    const { data } = await supabase.from("galeria_selecao_eventos")
      .select("id, tipo, descricao, foto_id, created_at")
      .eq("galeria_id", id).order("created_at", { ascending: false });
    if (data) setEventos(data as Evento[]);
  }

  // ── Copiar link ──
  const linkCliente = `${typeof window !== "undefined" ? window.location.origin : ""}/galeria/${id}`;
  async function copiarLink() {
    await navigator.clipboard.writeText(linkCliente);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  }

  const fotosFiltradas = catFiltro === "todas" ? fotos : fotos.filter((f) => f.categoria_id === catFiltro);

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

      {/* Header */}
      <div style={{
        background: "var(--color-background-primary)",
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: 12, padding: "18px 22px",
        display: "flex", alignItems: "flex-start", gap: 16,
        marginBottom: 16, flexWrap: "wrap",
      }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--color-text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
              {galeria.titulo}
            </h1>
            <span style={{
              padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
              background: STATUS_COLOR[galeria.status],
              color: STATUS_TEXT[galeria.status],
            }}>
              {STATUS_LABEL[galeria.status]}
            </span>
            {galeria.selecao_enviada && (
              <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: "rgba(37,99,235,0.1)", color: "#2563EB" }}>
                ✓ Seleção recebida
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {cliente && <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>👤 {cliente.nome}</span>}
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
          {/* Enviar acesso */}
          {galeria.status === "ativa" && (
            <button
              onClick={() => setModalAcesso(true)}
              style={{ padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600, border: "0.5px solid rgba(37,99,235,0.4)", background: "rgba(37,99,235,0.07)", color: "#2563EB", transition: "all 0.15s" }}
            >
              📬 Enviar acesso
            </button>
          )}
          <button
            onClick={copiarLink}
            style={{
              padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600,
              border: "0.5px solid var(--color-border-secondary)",
              background: copiado ? "rgba(16,185,129,0.1)" : "var(--color-background-secondary)",
              color: copiado ? "#059669" : "var(--color-text-secondary)",
              transition: "all 0.15s",
            }}
          >
            {copiado ? "✓ Link copiado!" : "🔗 Copiar link"}
          </button>
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
            marginBottom: -1,
            position: "relative",
          }}>
            {t.label}
            {/* Badge de notificação quando seleção enviada */}
            {t.id === "selecoes" && galeria.selecao_enviada && tab !== "selecoes" && (
              <span style={{ display: "inline-block", width: 6, height: 6, background: "#2563EB", borderRadius: "50%", marginLeft: 5, verticalAlign: "middle", marginTop: -2 }} />
            )}
          </button>
        ))}
      </div>

      {/* ── Tab: Fotos ── */}
      {tab === "fotos" && (
        <div>
          {/* Banner de aviso de limite (beta — sem bloqueio) */}
          {avisoLimite && fotografo && (() => {
            const plano = PLANOS[fotografo.plano as PlanoId] ?? PLANOS.gratuito;
            return (
              <div style={{ background: "rgba(245,158,11,0.08)", border: "0.5px solid rgba(245,158,11,0.4)", borderRadius: 10, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 18 }}>⚠️</span>
                <div style={{ flex: 1, fontSize: 13, color: "#92400E" }}>
                  <strong>Limite do plano {plano.nome} atingido</strong> ({plano.limite_fotos?.toLocaleString("pt-BR")} fotos).
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

          {/* Dica de capa */}
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
                    transition: "all 0.15s",
                  }}
                >
                  {cat.nome}
                </button>
              ))}
            </div>
          )}

          {fotosFiltradas.length === 0 ? (
            <div style={{
              border: "0.5px dashed var(--color-border-secondary)",
              borderRadius: 10, padding: "52px 24px",
              textAlign: "center", fontSize: 13,
              color: "var(--color-text-secondary)",
            }}>
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
          <button
            onClick={() => mudarStatus("ativa")}
            style={{ padding: "7px 16px", borderRadius: 8, background: "#059669", color: "#fff", border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}
          >
            ▶ Ativar agora
          </button>
        </div>
      )}

      {/* Modal enviar acesso */}
      {modalAcesso && galeria && (
        <ModalEnviarAcesso galeria={galeria} cliente={cliente} onClose={() => setModalAcesso(false)} />
      )}

      {/* ── Tab: Andamento ── */}
      {tab === "andamento" && (
        <AbaAndamento eventos={eventos} />
      )}

      {/* ── Tab: Seleções do cliente ── */}
      {tab === "selecoes" && (
        <AbaSelecoes
          galeria={galeria}
          cliente={cliente}
          escolhas={escolhas}
        />
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

// ─── Aba Andamento ───────────────────────────────────────────────────────────
const EVENTO_CONFIG: Record<string, { icon: string; cor: string; label: string }> = {
  acesso:            { icon: "👁",  cor: "#6B7280", label: "Cliente acessou a galeria"     },
  foto_selecionada:  { icon: "✅",  cor: "#059669", label: "Foto selecionada"               },
  foto_desmarcada:   { icon: "↩",  cor: "#9CA3AF", label: "Foto desmarcada"               },
  comentario:        { icon: "💬",  cor: "#2563EB", label: "Comentário adicionado"         },
  selecao_enviada:   { icon: "🏁",  cor: "#B45309", label: "Seleção finalizada"            },
  galeria_ativada:   { icon: "▶",   cor: "#059669", label: "Galeria ativada"               },
  galeria_reativada: { icon: "↩",  cor: "#B45309", label: "Galeria reaberta para reedição" },
  galeria_encerrada: { icon: "⏹",  cor: "#EF4444", label: "Galeria encerrada"             },
  status_alterado:   { icon: "⚙",  cor: "#6B7280", label: "Status alterado"               },
};

function AbaAndamento({ eventos }: { eventos: Evento[] }) {
  if (eventos.length === 0) {
    return (
      <div style={{ border: "0.5px dashed var(--color-border-secondary)", borderRadius: 10, padding: "52px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 6 }}>Nenhuma atividade registrada</div>
        <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>O histórico aparecerá quando o cliente acessar a galeria.</div>
      </div>
    );
  }

  // Agrupa eventos por dia
  type Grupo = { dia: string; itens: Evento[] };
  const grupos: Grupo[] = [];
  for (const ev of [...eventos].reverse()) {
    const dia = new Date(ev.created_at).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.dia === dia) ultimo.itens.push(ev);
    else grupos.push({ dia, itens: [ev] });
  }

  return (
    <div style={{ maxWidth: 620 }}>
      {grupos.map((grupo, gi) => (
        <div key={gi} style={{ marginBottom: 28 }}>
          {/* Cabeçalho do dia */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
              {grupo.dia}
            </div>
            <div style={{ flex: 1, height: "0.5px", background: "var(--color-border-tertiary)" }} />
          </div>

          {/* Linha do tempo */}
          <div style={{ position: "relative", paddingLeft: 28 }}>
            {/* Linha vertical */}
            <div style={{ position: "absolute", left: 9, top: 0, bottom: 0, width: 1, background: "var(--color-border-tertiary)" }} />

            {grupo.itens.map((ev, i) => {
              const cfg = EVENTO_CONFIG[ev.tipo] ?? { icon: "•", cor: "#9CA3AF", label: ev.tipo };
              const hora = new Date(ev.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
              const isLast = gi === grupos.length - 1 && i === grupo.itens.length - 1;

              return (
                <div key={ev.id} style={{ display: "flex", gap: 12, marginBottom: isLast ? 0 : 12, alignItems: "flex-start" }}>
                  {/* Bolinha */}
                  <div style={{
                    position: "absolute", left: 0,
                    width: 20, height: 20, borderRadius: "50%",
                    background: "var(--color-background-primary)",
                    border: `1.5px solid ${cfg.cor}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, flexShrink: 0,
                    marginTop: 1,
                    zIndex: 1,
                  }}>
                    {cfg.icon}
                  </div>

                  {/* Conteúdo */}
                  <div style={{ paddingBottom: 2 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>
                        {ev.descricao ?? cfg.label}
                      </span>
                      <span style={{ fontSize: 11, color: "var(--color-text-secondary)", flexShrink: 0 }}>
                        {hora}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Aba Seleções do cliente ──────────────────────────────────────────────────
const STORAGE_BASE = "https://fhsoqlttxggjpgrupjse.supabase.co/storage/v1/object/public/galerias/";

function thumbUrl(raw: string | null | undefined, fallback: string | null | undefined): string {
  if (!raw) return fallback ?? "";
  return raw.startsWith("http") ? raw : STORAGE_BASE + raw;
}

function AbaSelecoes({
  galeria,
  cliente,
  escolhas,
}: {
  galeria:  GaleriaSelecao;
  cliente:  Cliente | null;
  escolhas: EscolhaItem[];
}) {
  const [copiadoGrid, setCopiadoGrid]   = useState(false);
  const [copiadoCsv, setCopiadoCsv]     = useState(false);
  const [tooltipId, setTooltipId]       = useState<string | null>(null);

  if (!galeria.selecao_enviada) {
    return (
      <div style={{ border: "0.5px dashed var(--color-border-secondary)", borderRadius: 10, padding: "52px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 6 }}>
          Aguardando seleção do cliente
        </div>
        <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
          {cliente ? `${cliente.nome} ainda não enviou a seleção.` : "Nenhuma seleção enviada ainda."}
        </div>
      </div>
    );
  }

  // Lista CSV (separado por vírgula, só nomes)
  const listaCsv  = escolhas.map((e) => e.fotos?.nome_arquivo ?? e.foto_id).join(", ");
  // Lista numerada com comentários (para copiar completa)
  const listaFull = escolhas.map((e, i) => {
    const nome  = e.fotos?.nome_arquivo ?? e.foto_id;
    return e.comentario ? `${i + 1}. ${nome}\n   💬 ${e.comentario}` : `${i + 1}. ${nome}`;
  }).join("\n");

  function copiarCsv() {
    navigator.clipboard.writeText(listaCsv);
    setCopiadoCsv(true);
    setTimeout(() => setCopiadoCsv(false), 2000);
  }
  function copiarFull() {
    navigator.clipboard.writeText(listaFull);
    setCopiadoGrid(true);
    setTimeout(() => setCopiadoGrid(false), 2000);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Resumo */}
      <div style={{ background: "rgba(245,158,11,0.07)", border: "0.5px solid rgba(245,158,11,0.35)", borderRadius: 10, padding: "14px 18px", display: "flex", gap: 14, alignItems: "center" }}>
        <div style={{ fontSize: 22 }}>✅</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)" }}>
            Seleção enviada por {cliente?.nome ?? "cliente"}
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
            {galeria.selecao_enviada_em ? new Date(galeria.selecao_enviada_em).toLocaleString("pt-BR") : ""}
            {" · "}{escolhas.length} foto{escolhas.length !== 1 ? "s" : ""} selecionada{escolhas.length !== 1 ? "s" : ""}
            {escolhas.filter((e) => e.comentario).length > 0 && ` · ${escolhas.filter((e) => e.comentario).length} com comentário`}
          </div>
        </div>
      </div>

      {/* Grid de fotos selecionadas */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Fotos selecionadas ({escolhas.length})
          </div>
          <button onClick={copiarFull} style={{ padding: "5px 12px", borderRadius: 7, background: copiadoGrid ? "rgba(5,150,105,0.1)" : "var(--color-background-secondary)", border: "0.5px solid var(--color-border-secondary)", color: copiadoGrid ? "#059669" : "var(--color-text-secondary)", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
            {copiadoGrid ? "✓ Copiado" : "📋 Copiar lista completa"}
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 6 }}>
          {escolhas.map((esc) => {
            const src     = thumbUrl(esc.fotos?.thumbnail_path, esc.fotos?.url_publica);
            const temComt = !!esc.comentario;
            const aberto  = tooltipId === esc.id;
            return (
              <div
                key={esc.id}
                style={{ position: "relative", aspectRatio: "1", borderRadius: 7, overflow: "visible", cursor: temComt ? "pointer" : "default" }}
                onClick={() => temComt && setTooltipId(aberto ? null : esc.id)}
              >
                {/* Imagem */}
                <div style={{ width: "100%", height: "100%", borderRadius: 7, overflow: "hidden", border: temComt ? "2px solid #F59E0B" : "0.5px solid var(--color-border-tertiary)" }}>
                  {src
                    ? <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} loading="lazy" />
                    : <div style={{ width: "100%", height: "100%", background: "var(--color-background-secondary)" }} />
                  }
                </div>

                {/* Badge de comentário */}
                {temComt && (
                  <div style={{ position: "absolute", top: -5, right: -5, width: 18, height: 18, borderRadius: "50%", background: "#F59E0B", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.2)" }}>
                    💬
                  </div>
                )}

                {/* Tooltip do comentário */}
                {aberto && temComt && (
                  <div style={{ position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)", zIndex: 50, background: "var(--color-text-primary)", color: "var(--color-background-primary)", fontSize: 11, padding: "8px 10px", borderRadius: 7, width: 200, lineHeight: 1.4, boxShadow: "0 4px 16px rgba(0,0,0,0.2)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    {esc.comentario}
                    <div style={{ position: "absolute", bottom: -5, left: "50%", transform: "translateX(-50%)", width: 10, height: 10, background: "var(--color-text-primary)", clipPath: "polygon(0 0, 100% 0, 50% 100%)" }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Lista de nomes — CSV para busca no Explorer/Lightroom */}
      <div style={{ background: "var(--color-background-secondary)", borderRadius: 10, padding: "16px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Nomes dos arquivos
            </div>
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>
              Separados por vírgula — cole no Explorer, Lightroom ou Bridge
            </div>
          </div>
          <button onClick={copiarCsv} style={{ padding: "6px 14px", borderRadius: 8, flexShrink: 0, background: copiadoCsv ? "rgba(5,150,105,0.1)" : "var(--color-background-primary)", border: `0.5px solid ${copiadoCsv ? "rgba(5,150,105,0.4)" : "var(--color-border-secondary)"}`, color: copiadoCsv ? "#059669" : "var(--color-text-primary)", fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 0.15s" }}>
            {copiadoCsv ? "✓ Copiado!" : "📋 Copiar"}
          </button>
        </div>
        <textarea
          readOnly
          value={listaCsv}
          rows={4}
          onClick={(e) => (e.target as HTMLTextAreaElement).select()}
          style={{ width: "100%", padding: "10px 12px", borderRadius: 8, background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", color: "var(--color-text-primary)", fontSize: 12, fontFamily: "monospace", lineHeight: 1.5, resize: "vertical", boxSizing: "border-box", cursor: "text" }}
        />
      </div>
    </div>
  );
}

// ─── Aba Configurações (editável) ────────────────────────────────────────────
function ConfiguracaoGaleria({
  galeria, cliente, categorias, onUpdate,
}: {
  galeria:    GaleriaSelecao;
  cliente:    Cliente | null;
  categorias: Categoria[];
  onUpdate:   (patch: Partial<GaleriaSelecao>, novoCliente: Cliente | null) => void;
}) {
  // Estado local do formulário
  const [titulo,        setTitulo]        = useState(galeria.titulo);
  const [descricao,     setDescricao]     = useState(galeria.descricao ?? "");
  const [dataEvento,    setDataEvento]    = useState(galeria.data_evento ?? "");
  const [expiraEm,      setExpiraEm]      = useState(galeria.expira_em ? galeria.expira_em.slice(0, 10) : "");
  const [selecaoLivre,  setSelecaoLivre]  = useState(galeria.selecao_livre);
  const [limiteMin,     setLimiteMin]     = useState(galeria.limite_minimo?.toString() ?? "");
  const [limiteMax,     setLimiteMax]     = useState(galeria.limite_maximo?.toString() ?? "");
  const [clienteId,     setClienteId]     = useState(galeria.cliente_id ?? "");

  // Lista de clientes disponíveis para troca
  const [clientes,      setClientes]      = useState<{ id: string; nome: string; email: string | null }[]>([]);
  const [clientesLoad,  setClientesLoad]  = useState(false);
  const [salvando,      setSalvando]      = useState(false);
  const [erro,          setErro]          = useState("");
  const [salvo,         setSalvo]         = useState(false);

  // Carrega clientes ao montar
  useEffect(() => {
    setClientesLoad(true);
    createClient()
      .from("clientes")
      .select("id, nome, email")
      .order("nome")
      .then(({ data }) => {
        setClientes((data ?? []) as { id: string; nome: string; email: string | null }[]);
        setClientesLoad(false);
      });
  }, []);

  async function salvar() {
    if (!titulo.trim()) { setErro("O título é obrigatório."); return; }
    setSalvando(true);
    setErro("");

    const patch: Record<string, unknown> = {
      titulo:        titulo.trim(),
      descricao:     descricao.trim() || null,
      data_evento:   dataEvento || null,
      expira_em:     expiraEm   || null,
      selecao_livre: selecaoLivre,
      limite_minimo: selecaoLivre ? null : (limiteMin ? parseInt(limiteMin) : null),
      limite_maximo: selecaoLivre ? null : (limiteMax ? parseInt(limiteMax) : null),
      cliente_id:    clienteId   || null,
      updated_at:    new Date().toISOString(),
    };

    const { error } = await createClient()
      .from("galerias_selecao")
      .update(patch)
      .eq("id", galeria.id);

    setSalvando(false);
    if (error) { setErro(error.message); return; }

    // Busca dados do novo cliente (se mudou)
    let novoCliente: Cliente | null = null;
    if (clienteId && clienteId !== galeria.cliente_id) {
      const { data } = await createClient()
        .from("clientes").select("*").eq("id", clienteId).single();
      novoCliente = data as Cliente | null;
    } else if (!clienteId) {
      novoCliente = null;
    } else {
      novoCliente = cliente;
    }

    onUpdate(patch as Partial<GaleriaSelecao>, novoCliente);
    setSalvo(true);
    setTimeout(() => setSalvo(false), 2500);
  }

  const inp: React.CSSProperties = {
    width: "100%", padding: "9px 12px", borderRadius: 8,
    background: "var(--color-background-secondary)",
    border: "0.5px solid var(--color-border-secondary)",
    color: "var(--color-text-primary)", fontSize: 13,
    outline: "none", boxSizing: "border-box", fontFamily: "inherit",
  };
  const label: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)",
    textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6, display: "block",
  };
  const field: React.CSSProperties = { marginBottom: 18 };

  return (
    <div style={{ maxWidth: 600 }}>

      {/* Título */}
      <div style={field}>
        <label style={label}>Título da galeria</label>
        <input style={inp} value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Casamento João e Maria" />
      </div>

      {/* Descrição */}
      <div style={field}>
        <label style={label}>Descrição (opcional)</label>
        <textarea
          style={{ ...inp, resize: "vertical", lineHeight: 1.5 }}
          rows={2}
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Mensagem exibida na capa da galeria…"
        />
      </div>

      {/* Cliente */}
      <div style={field}>
        <label style={label}>Cliente vinculado</label>
        {clientesLoad ? (
          <div style={{ fontSize: 12, color: "var(--color-text-secondary)", padding: "8px 0" }}>Carregando clientes…</div>
        ) : (
          <select
            style={{ ...inp, cursor: "pointer" }}
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
          >
            <option value="">— Sem cliente (acesso público pelo link) —</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}{c.email ? ` — ${c.email}` : ""}
              </option>
            ))}
          </select>
        )}
        {!clienteId && (
          <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 5 }}>
            ℹ️ Sem cliente vinculado, qualquer pessoa com o link pode acessar a galeria sem senha.
          </div>
        )}
      </div>

      {/* Datas */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18 }}>
        <div>
          <label style={label}>Data do evento</label>
          <input style={inp} type="date" value={dataEvento} onChange={(e) => setDataEvento(e.target.value)} />
        </div>
        <div>
          <label style={label}>Prazo de seleção</label>
          <input style={inp} type="date" value={expiraEm} onChange={(e) => setExpiraEm(e.target.value)} />
        </div>
      </div>

      {/* Regra de seleção */}
      <div style={field}>
        <label style={label}>Regra de seleção</label>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          {[
            { val: true,  label: "Livre (sem limite)" },
            { val: false, label: "Com limites" },
          ].map((op) => (
            <button
              key={String(op.val)}
              onClick={() => setSelecaoLivre(op.val)}
              style={{
                padding: "7px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                border: "0.5px solid",
                borderColor: selecaoLivre === op.val ? "var(--color-text-primary)" : "var(--color-border-secondary)",
                background: selecaoLivre === op.val ? "var(--color-text-primary)" : "transparent",
                color: selecaoLivre === op.val ? "var(--color-background-primary)" : "var(--color-text-secondary)",
                cursor: "pointer", transition: "all 0.15s",
              }}
            >
              {op.label}
            </button>
          ))}
        </div>
        {!selecaoLivre && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={{ ...label, textTransform: "none", letterSpacing: 0, fontSize: 12 }}>Mínimo de fotos</label>
              <input style={inp} type="number" min={1} value={limiteMin} onChange={(e) => setLimiteMin(e.target.value)} placeholder="Sem mínimo" />
            </div>
            <div>
              <label style={{ ...label, textTransform: "none", letterSpacing: 0, fontSize: 12 }}>Máximo de fotos</label>
              <input style={inp} type="number" min={1} value={limiteMax} onChange={(e) => setLimiteMax(e.target.value)} placeholder="Sem máximo" />
            </div>
          </div>
        )}
      </div>

      {/* Info somente leitura */}
      <div style={{ background: "var(--color-background-secondary)", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 20 }}>
        Resolução: <strong>{galeria.resolucao_exibicao === "fullhd" ? "Full HD" : galeria.resolucao_exibicao.toUpperCase()}</strong>
        {categorias.length > 0 && <> · Categorias: <strong>{categorias.map((c) => c.nome).join(", ")}</strong></>}
        {" · "}Criada em <strong>{new Date(galeria.created_at).toLocaleDateString("pt-BR")}</strong>
      </div>

      {/* Erro */}
      {erro && (
        <div style={{ background: "rgba(239,68,68,0.08)", border: "0.5px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#DC2626", marginBottom: 14 }}>
          ⚠️ {erro}
        </div>
      )}

      {/* Salvar */}
      <button
        onClick={salvar}
        disabled={salvando}
        style={{
          padding: "10px 28px", borderRadius: 9,
          background: salvo ? "rgba(5,150,105,0.1)" : "var(--color-text-primary)",
          color: salvo ? "#059669" : "var(--color-background-primary)",
          border: salvo ? "0.5px solid rgba(5,150,105,0.4)" : "none",
          fontSize: 13, fontWeight: 700, cursor: salvando ? "not-allowed" : "pointer",
          transition: "all 0.2s",
        }}
      >
        {salvando ? "Salvando…" : salvo ? "✓ Salvo!" : "Salvar alterações"}
      </button>
    </div>
  );
}
