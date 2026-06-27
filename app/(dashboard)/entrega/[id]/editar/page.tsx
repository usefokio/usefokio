"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import { useUnsavedGuard } from "@/lib/hooks/useUnsavedGuard";
import { uploadFileClient } from "@/lib/storage/uploadClient";
import { Field } from "@/components/ui/Field";
import { inputStyle } from "@/lib/styles";
import { ClienteSelect } from "../../_components/ClienteSelect";
import { FotosEntregaUpload, type FotosEntregaUploadHandle } from "../../_components/FotosEntregaUpload";
import type { Cliente, Categoria, GaleriaEntrega } from "@/lib/supabase/types";
import { mascaraMoeda, parseMoeda, formatarMoeda } from "@/lib/moeda";

const PRAZOS_FIXOS = [15, 30, 60, 120];

function addDias(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}
function formatarData(d: Date): string {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

// Modal de confirmação de exclusão
function ModalExcluir({ nome, onConfirmar, onFechar, deletando }: { nome: string; onConfirmar: () => void; onFechar: () => void; deletando: boolean }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60 }} onClick={onFechar}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 14, padding: "28px 30px", width: 380, boxShadow: "0 8px 40px rgba(0,0,0,0.18)" }}>
        <h3 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 700, color: "#EF4444" }}>Excluir galeria</h3>
        <p style={{ margin: "0 0 22px", fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
          Tem certeza que deseja excluir <strong style={{ color: "var(--color-text-primary)" }}>{nome}</strong>?<br />Esta ação não pode ser desfeita.
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onFechar} style={{ flex: 1, padding: "9px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "transparent", fontSize: 13, color: "var(--color-text-secondary)", cursor: "pointer" }}>Cancelar</button>
          <button onClick={onConfirmar} disabled={deletando} style={{ flex: 1, padding: "9px", borderRadius: 8, border: "none", background: "#EF4444", color: "#fff", fontSize: 13, fontWeight: 600, cursor: deletando ? "default" : "pointer" }}>
            {deletando ? "Excluindo…" : "Excluir"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EditarEntregaPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { fotografo } = useFotografo();

  const [original,     setOriginal]     = useState<GaleriaEntrega | null>(null);
  const [notFound,     setNotFound]     = useState(false);
  const [loadingPage,  setLoadingPage]  = useState(true);

  const hoje = new Date().toISOString().split("T")[0];

  const [titulo,      setTitulo]     = useState("");
  const [clienteId,   setClienteId]  = useState("");
  const [cliente,     setCliente]    = useState<Cliente | null>(null);
  const [dataEvento,  setDataEvento] = useState(hoje);
  const [driveLink,   setDriveLink]  = useState("");
  const [renovacao,   setRenovacao]  = useState("");
  const [renovacaoDias, setRenovacaoDias] = useState("30");
  const [mensagem,    setMensagem]   = useState("");
  const [apenaZip,              setApenaZip]              = useState(false);
  const [ordenacaoFotos,        setOrdenacaoFotos]        = useState<"envio" | "nome" | "nome_desc" | "data">("nome");
  const [identificacaoObrig,    setIdentificacaoObrig]    = useState(false);
  const [driveApenasIdentif,    setDriveApenasIdentif]    = useState(false);
  const [categoriaId,  setCategoriaId]  = useState<string>("");
  const [categorias,   setCategorias]   = useState<Categoria[]>([]);
  const [saving,      setSaving]     = useState(false);
  const [modalExcluir, setModalExcluir] = useState(false);
  const [deletando,    setDeletando]   = useState(false);
  const [carregado,    setCarregado]   = useState(false);
  const [saiu,         setSaiu]        = useState(false);
  const [acessos,      setAcessos]     = useState<{ id: string; nome: string; email: string; acessado_em: string }[]>([]);
  const [uploadTotal,  setUploadTotal] = useState(0);
  const [uploadAtual,  setUploadAtual] = useState(0);
  const fotosRef = useRef<FotosEntregaUploadHandle>(null);

  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [prorogarDias,   setProrogarDias]   = useState<number | "custom" | null>(null);

  const [capaUrl,     setCapaUrl]     = useState<string | null>(null);
  const [capaFile,    setCapaFile]    = useState<File | null>(null);
  const [capaPreview, setCapaPreview] = useState<string | null>(null);
  const [uploadandoCapa, setUploadandoCapa] = useState(false);
  const inputCapaRef = useRef<HTMLInputElement>(null);
  const [prorogarCustom, setProrogarCustom] = useState("");

  const diasProrrogar  = prorogarDias === "custom" ? (parseInt(prorogarCustom) || 0) : (prorogarDias ?? 0);
  const baseParaProrrogar  = expiresAt ?? new Date();
  const novaDataProrrogada = diasProrrogar > 0 ? addDias(baseParaProrrogar, diasProrrogar) : null;

  // Carregar dados do Supabase
  useEffect(() => {
    if (!fotografo) return;
    const supabase = createClient();
    supabase
      .from("galerias_entrega")
      .select("*, clientes(nome, email, telefone, whatsapp)")
      .eq("id", id)
      .eq("fotografo_id", fotografo.id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { setNotFound(true); setLoadingPage(false); return; }
        const g = data as GaleriaEntrega;
        setOriginal(g);
        setExpiresAt(g.expires_at ? new Date(g.expires_at) : null);
        setApenaZip(g.apenas_zip ?? false);
        setRenovacaoDias(String(g.renovacao_dias ?? 30));
        setOrdenacaoFotos(g.ordenacao_fotos ?? "envio");
        setIdentificacaoObrig(g.identificacao_obrigatoria ?? false);
        setDriveApenasIdentif(g.drive_apenas_identificado ?? false);

        setTitulo(g.titulo);
        setClienteId(g.cliente_id ?? "");
        setDataEvento(g.data_evento ?? hoje);
        setDriveLink(g.drive_link ?? "");
        setRenovacao(g.renewal_fee != null ? formatarMoeda(g.renewal_fee) : "");
        setMensagem(g.mensagem ?? fotografo.mensagem_padrao_entrega ?? "");
        setCapaUrl(g.foto_capa_url ?? null);
        setCapaPreview(g.foto_capa_url ?? null);
        setCategoriaId(g.categoria_id ?? "");
        setCarregado(true);
        setLoadingPage(false);
      });

    // Carregar categorias para o seletor
    supabase
      .from("categorias")
      .select("*")
      .eq("fotografo_id", fotografo.id)
      .order("ordem")
      .order("created_at")
      .then(({ data }) => setCategorias(data ?? []));

    // Carregar acessos da galeria
    supabase
      .from("galeria_acessos")
      .select("id, nome, email, acessado_em")
      .eq("galeria_id", id)
      .order("acessado_em", { ascending: false })
      .then(({ data }) => setAcessos((data as any[]) ?? []));
  }, [fotografo]);

  // Há alterações não salvas em relação ao banco?
  const temAlteracoes = !saiu && carregado && !!original && (
    titulo !== original.titulo ||
    clienteId !== (original.cliente_id ?? "") ||
    dataEvento !== (original.data_evento ?? hoje) ||
    driveLink !== (original.drive_link ?? "") ||
    renovacao !== (original.renewal_fee != null ? formatarMoeda(original.renewal_fee) : "") ||
    renovacaoDias !== String(original.renovacao_dias ?? 30) ||
    mensagem !== (original.mensagem ?? fotografo?.mensagem_padrao_entrega ?? "") ||
    apenaZip !== (original.apenas_zip ?? false) ||
    ordenacaoFotos !== (original.ordenacao_fotos ?? "envio") ||
    identificacaoObrig !== (original.identificacao_obrigatoria ?? false) ||
    driveApenasIdentif !== (original.drive_apenas_identificado ?? false) ||
    (expiresAt?.getTime() ?? null) !== (original.expires_at ? new Date(original.expires_at).getTime() : null) ||
    categoriaId !== (original.categoria_id ?? "")
  );

  // Guarda de navegação: intercepta links internos e fechar aba
  const { modalAberto: modalSair, setModalAberto: setModalSair, pedirSaida, irParaDestino } = useUnsavedGuard(temAlteracoes);

  function handleSairClick() {
    if (temAlteracoes) { pedirSaida("/entrega"); return; }
    router.push("/entrega");
  }

  function aplicarProrrogacao() {
    if (novaDataProrrogada) {
      setExpiresAt(novaDataProrrogada);
      setProrogarDias(null);
      setProrogarCustom("");
    }
  }

  async function uploadCapa(idGaleria: string): Promise<string | null> {
    if (!capaFile || !fotografo) return capaUrl;
    setUploadandoCapa(true);
    const supabase = createClient();
    const ext = capaFile.type === "image/png" ? "png" : capaFile.type === "image/webp" ? "webp" : "jpg";
    const path = `entrega/${fotografo.id}/${idGaleria}/capa.${ext}`;
    try {
      const { url_publica } = await uploadFileClient(path, capaFile, capaFile.type);
      setUploadandoCapa(false);
      return url_publica;
    } catch {
      setUploadandoCapa(false);
      return capaUrl;
    }
  }

  async function handleSalvar() {
    if (!fotografo || !titulo.trim()) return;
    setSaving(true);
    const supabase = createClient();

    const novaCapaUrl = await uploadCapa(id);

    await supabase
      .from("galerias_entrega")
      .update({
        titulo:      titulo.trim(),
        cliente_id:  clienteId || null,
        data_evento: dataEvento || null,
        drive_link:  driveLink.trim() || null,
        expires_at:  expiresAt ? expiresAt.toISOString() : null,
        renewal_fee: parseMoeda(renovacao),
        renovacao_dias: parseInt(renovacaoDias) || 30,
        mensagem:    mensagem.trim() || null,
        apenas_zip:                 apenaZip,
        identificacao_obrigatoria:  identificacaoObrig,
        drive_apenas_identificado:  driveApenasIdentif,
        ordenacao_fotos:            ordenacaoFotos,
        foto_capa_url:              novaCapaUrl ?? null,
        categoria_id:               categoriaId || null,
      })
      .eq("id", id)
      .eq("fotografo_id", fotografo.id);

    // Enviar fotos que estão na fila (modo deferido)
    const naFila = fotosRef.current?.filaLength() ?? 0;
    if (naFila > 0) {
      setUploadTotal(naFila);
      setUploadAtual(0);
      await fotosRef.current?.flushFila((atual, total) => {
        setUploadAtual(atual);
        setUploadTotal(total);
      });
    }

    setSaiu(true);
    irParaDestino("/entrega");
  }

  async function handleExcluir() {
    if (!fotografo) return;
    setDeletando(true);
    const supabase = createClient();

    // Buscar storage_paths das fotos antes de deletar a galeria
    const { data: fotos } = await supabase
      .from("galerias_entrega_fotos")
      .select("storage_path")
      .eq("galeria_id", id);

    // Remover arquivos do storage em lotes de 100
    if (fotos && fotos.length > 0) {
      const paths = fotos.map((f: { storage_path: string }) => f.storage_path);
      for (let i = 0; i < paths.length; i += 100) {
        await supabase.storage.from("galerias").remove(paths.slice(i, i + 100));
      }
    }

    await supabase.from("galerias_entrega").delete().eq("id", id).eq("fotografo_id", fotografo.id);
    setSaiu(true);
    router.push("/entrega");
  }

  if (loadingPage) {
    return <div style={{ padding: "40px 30px", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>;
  }
  if (notFound) {
    return <div style={{ padding: "40px 30px", textAlign: "center", fontSize: 14, color: "var(--color-text-secondary)" }}>Galeria não encontrada.</div>;
  }

  return (
    <div style={{ padding: "26px 30px", maxWidth: 640 }}>
      <div style={{ marginBottom: 24, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <button onClick={handleSairClick} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--color-text-secondary)", padding: 0, marginBottom: 10 }}>
            ← Voltar
          </button>
          <h1 style={{ fontSize: 19, fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 3px", letterSpacing: "-0.02em" }}>Editar galeria</h1>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>{original?.titulo}</p>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 28, flexShrink: 0 }}>
          <button
            onClick={handleSalvar}
            disabled={saving || !titulo.trim()}
            style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: saving || !titulo.trim() ? "var(--color-background-secondary)" : "var(--color-text-primary)", color: saving || !titulo.trim() ? "var(--color-text-secondary)" : "var(--color-background-primary)", fontSize: 13, fontWeight: 600, cursor: saving || !titulo.trim() ? "default" : "pointer" }}
          >
            {saving ? "Salvando…" : "Salvar"}
          </button>
          <button
            onClick={() => setModalExcluir(true)}
            style={{ padding: "8px 14px", borderRadius: 8, border: "0.5px solid rgba(239,68,68,0.4)", background: "rgba(239,68,68,0.06)", color: "#EF4444", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
          >
            Excluir
          </button>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        <Field label="Título da galeria">
          <input type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} style={inputStyle} />
        </Field>

        <Field label="Foto de capa" hint="Opcional — aparece como destaque na galeria do cliente">
          <input
            ref={inputCapaRef}
            type="file" accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setCapaFile(f);
              if (capaPreview && !capaPreview.startsWith("http")) URL.revokeObjectURL(capaPreview);
              setCapaPreview(URL.createObjectURL(f));
              e.target.value = "";
            }}
          />
          {capaPreview ? (
            <div style={{ position: "relative", width: "100%", aspectRatio: "16/7", borderRadius: 10, overflow: "hidden", background: "var(--color-border-tertiary)" }}>
              <img src={capaPreview} alt="Capa" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <button
                type="button"
                onClick={() => { setCapaFile(null); setCapaPreview(null); setCapaUrl(null); }}
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

        <Field label="Cliente">
          <ClienteSelect value={clienteId} onChange={(id, c) => { setClienteId(id); setCliente(c); }} />
        </Field>

        <Field label="Data do evento">
          <input type="date" value={dataEvento} onChange={(e) => setDataEvento(e.target.value)} style={inputStyle} />
        </Field>

        {categorias.length > 0 && (
          <Field label="Categoria" hint="A taxa de renovação padrão da categoria é aplicada ao criar galerias novas">
            <select
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              style={inputStyle}
            >
              <option value="">— Sem categoria —</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </Field>
        )}

        <Field label="Link do Google Drive" hint="Opcional — deixe em branco para usar somente a galeria online">
          <input type="url" value={driveLink} onChange={(e) => setDriveLink(e.target.value)} placeholder="https://drive.google.com/drive/folders/…" style={inputStyle} />
          {driveLink.trim() && (
            <div style={{ marginTop: 7, background: "rgba(245,158,11,0.08)", border: "0.5px solid rgba(245,158,11,0.3)", borderRadius: 7, padding: "8px 12px", fontSize: 12, color: "#92400E", lineHeight: 1.5 }}>
              ℹ️ Certifique-se de que o link esteja configurado como <strong>"Qualquer pessoa com o link pode visualizar"</strong> no Google Drive.
            </div>
          )}
        </Field>

        <Field label="Taxa de renovação">
          <div style={{ position: "relative", width: 200 }}>
            <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "var(--color-text-secondary)", pointerEvents: "none" }}>R$</span>
            <input
              type="text" inputMode="numeric"
              value={renovacao} onChange={(e) => setRenovacao(mascaraMoeda(e.target.value))}
              placeholder="0,00"
              style={{ ...inputStyle, width: "100%", paddingLeft: 34 }}
            />
          </div>
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

        <Field label="Mensagem para o cliente">
          <textarea value={mensagem} onChange={(e) => setMensagem(e.target.value)} rows={4} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }} />
          {fotografo?.mensagem_padrao_entrega && mensagem !== fotografo.mensagem_padrao_entrega && (
            <button type="button" onClick={() => setMensagem(fotografo.mensagem_padrao_entrega!)} style={{ marginTop: 6, background: "none", border: "none", padding: 0, fontSize: 11, color: "var(--color-text-secondary)", cursor: "pointer", textDecoration: "underline" }}>
              ↺ Restaurar mensagem padrão
            </button>
          )}
        </Field>

        {/* ── Opções de acesso e download ── */}
        <div style={{ background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "18px 22px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 16 }}>
            Opções de acesso e download
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer" }}>
              <input type="checkbox" checked={identificacaoObrig} onChange={(e) => setIdentificacaoObrig(e.target.checked)} style={{ marginTop: 2, width: 16, height: 16, accentColor: "var(--color-text-primary)", cursor: "pointer", flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 3 }}>Exigir identificação</div>
                <div style={{ fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>O cliente precisa informar nome e e-mail antes de acessar, mesmo que já esteja vinculado.</div>
              </div>
            </label>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer" }}>
              <input type="checkbox" checked={apenaZip} onChange={(e) => setApenaZip(e.target.checked)} style={{ marginTop: 2, width: 16, height: 16, accentColor: "var(--color-text-primary)", cursor: "pointer", flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 3 }}>Galeria somente visualização</div>
                <div style={{ fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>Desativa o download individual de fotos. O cliente pode visualizar, mas só baixa pelo link do Drive (se configurado).</div>
              </div>
            </label>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer" }}>
              <input type="checkbox" checked={driveApenasIdentif} onChange={(e) => setDriveApenasIdentif(e.target.checked)} style={{ marginTop: 2, width: 16, height: 16, accentColor: "var(--color-text-primary)", cursor: "pointer", flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 3 }}>Link do Drive somente após identificação</div>
                <div style={{ fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>Oculta o botão "Baixar todas" até o cliente se identificar. Funciona apenas se houver Drive configurado.</div>
              </div>
            </label>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 6 }}>Ordem das fotos na galeria</div>
              <select
                value={ordenacaoFotos}
                onChange={(e) => setOrdenacaoFotos(e.target.value as "envio" | "nome" | "nome_desc" | "data")}
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

        {/* ── Prorrogar prazo ── */}
        <div style={{ background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "20px 22px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 14 }}>
            Prorrogar prazo de acesso
          </div>

          <div style={{ display: "flex", gap: 20, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 3 }}>Prazo atual</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>{expiresAt ? formatarData(expiresAt) : "Sem prazo"}</div>
            </div>
            {novaDataProrrogada && (
              <div>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 3 }}>Novo prazo</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#059669" }}>
                  {formatarData(novaDataProrrogada as Date)}
                  <span style={{ fontSize: 11, color: "var(--color-text-secondary)", fontWeight: 400, marginLeft: 6 }}>+{diasProrrogar}d</span>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: prorogarDias === "custom" ? 10 : 12 }}>
            {PRAZOS_FIXOS.map((d) => (
              <button key={d} type="button" onClick={() => { setProrogarDias(d); setProrogarCustom(""); }} style={{ padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", border: `0.5px solid ${prorogarDias === d ? "var(--color-text-primary)" : "var(--color-border-secondary)"}`, background: prorogarDias === d ? "var(--color-text-primary)" : "var(--color-background-primary)", color: prorogarDias === d ? "var(--color-background-primary)" : "var(--color-text-secondary)", transition: "all 0.15s" }}>+{d}d</button>
            ))}
            <button type="button" onClick={() => setProrogarDias("custom")} style={{ padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", border: `0.5px solid ${prorogarDias === "custom" ? "var(--color-text-primary)" : "var(--color-border-secondary)"}`, background: prorogarDias === "custom" ? "var(--color-text-primary)" : "var(--color-background-primary)", color: prorogarDias === "custom" ? "var(--color-background-primary)" : "var(--color-text-secondary)", transition: "all 0.15s" }}>Outro</button>
          </div>

          {prorogarDias === "custom" && (
            <input type="number" min={1} placeholder="Quantos dias?" value={prorogarCustom} onChange={(e) => setProrogarCustom(e.target.value)} style={{ ...inputStyle, width: 160, marginBottom: 10 }} />
          )}

          <button onClick={aplicarProrrogacao} disabled={diasProrrogar <= 0} style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: diasProrrogar > 0 ? "#059669" : "var(--color-border-secondary)", color: diasProrrogar > 0 ? "#fff" : "var(--color-text-secondary)", fontSize: 12, fontWeight: 600, cursor: diasProrrogar > 0 ? "pointer" : "default", transition: "all 0.15s" }}>
            Aplicar prorrogação
          </button>
        </div>

        {/* Fotos da galeria */}
        {fotografo && (
          <div style={{ background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "20px 22px" }}>
            <FotosEntregaUpload
              ref={fotosRef}
              galeriaId={id}
              fotografoId={fotografo.id}
              deferred
            />
          </div>
        )}

        {/* ── Acessos registrados (deduplicados por email) ── */}
        {(() => {
          const acessosUnicos = acessos.reduce<(typeof acessos[number] & { vezes: number })[]>((acc, a) => {
            const chave = (a.email ?? "").trim().toLowerCase();
            const ex = acc.find((x) => (x.email ?? "").trim().toLowerCase() === chave);
            if (ex) ex.vezes += 1; else acc.push({ ...a, vezes: 1 });
            return acc;
          }, []);
          return (
        <div style={{ background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "20px 22px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
            Acessos registrados
            <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, marginLeft: 8 }}>({acessosUnicos.length})</span>
          </div>
          {acessos.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--color-text-secondary)", padding: "10px 0" }}>
              Nenhum acesso registrado ainda. Os acessos aparecem quando o cliente abre o link e se identifica.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                    {["Nome", "E-mail", "Data / Hora"].map((h) => (
                      <th key={h} style={{ padding: "6px 10px", textAlign: "left", fontWeight: 700, color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {acessosUnicos.map((a) => (
                    <tr key={a.id} style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                      <td style={{ padding: "8px 10px", color: "var(--color-text-primary)", fontWeight: 600 }}>
                        {a.nome}
                        {a.vezes > 1 && <span style={{ fontSize: 10, fontWeight: 700, color: "#6B7280", background: "rgba(107,114,128,0.10)", borderRadius: 10, padding: "1px 7px", marginLeft: 8 }}>{a.vezes}x</span>}
                      </td>
                      <td style={{ padding: "8px 10px", color: "var(--color-text-secondary)" }}>{a.email}</td>
                      <td style={{ padding: "8px 10px", color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>
                        {new Date(a.acessado_em).toLocaleDateString("pt-BR")} {new Date(a.acessado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
          );
        })()}

        {/* Ações */}
        <div style={{ display: "flex", gap: 10, paddingTop: 8 }}>
          <button onClick={handleSalvar} disabled={saving || !titulo.trim()} style={{ padding: "10px 24px", borderRadius: 9, border: "none", background: saving || !titulo.trim() ? "var(--color-background-secondary)" : "var(--color-text-primary)", color: saving || !titulo.trim() ? "var(--color-text-secondary)" : "var(--color-background-primary)", fontSize: 13, fontWeight: 600, cursor: saving || !titulo.trim() ? "default" : "pointer" }}>
            {saving ? "Salvando…" : "Salvar alterações"}
          </button>
          <button onClick={handleSairClick} style={{ padding: "10px 18px", borderRadius: 9, border: "0.5px solid var(--color-border-secondary)", background: "transparent", fontSize: 13, color: "var(--color-text-secondary)", cursor: "pointer" }}>
            Cancelar
          </button>
        </div>
      </div>

      {modalExcluir && (
        <ModalExcluir
          nome={original?.titulo ?? ""}
          onConfirmar={handleExcluir}
          onFechar={() => setModalExcluir(false)}
          deletando={deletando}
        />
      )}

      {/* Modal: alterações não salvas */}
      {modalSair && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 70, padding: 20 }} onClick={() => setModalSair(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 14, padding: "26px 28px", width: 400, maxWidth: "100%", boxShadow: "0 8px 40px rgba(0,0,0,0.18)" }}>
            <h3 style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 700, color: "var(--color-text-primary)" }}>⚠️ Alterações não salvas</h3>
            <p style={{ margin: "0 0 20px", fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
              Você fez alterações que serão perdidas se sair sem salvar. O que deseja fazer?
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button onClick={handleSalvar} disabled={saving || !titulo.trim()} style={{ padding: "10px", borderRadius: 8, border: "none", background: "var(--color-text-primary)", color: "var(--color-background-primary)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                {saving ? "Salvando…" : "💾 Salvar e sair"}
              </button>
              <button onClick={() => { setSaiu(true); irParaDestino("/entrega"); }} style={{ padding: "10px", borderRadius: 8, border: "0.5px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.05)", color: "#DC2626", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Sair sem salvar
              </button>
              <button onClick={() => setModalSair(false)} style={{ padding: "10px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "transparent", color: "var(--color-text-secondary)", fontSize: 13, cursor: "pointer" }}>
                Continuar editando
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overlay de upload de fotos */}
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
          </div>
        </div>
      )}
    </div>
  );
}
