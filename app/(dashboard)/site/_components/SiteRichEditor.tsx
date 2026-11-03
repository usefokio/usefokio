"use client";

// Editor rico do Site: texto formatado + imagem única e galeria dentro do conteúdo.
// Separado do RichTextEditor do CRM para não afetá-lo. As imagens são enviadas ao storage
// e o HTML gerado (<img> e <div data-galeria>) é o mesmo interpretado nas páginas públicas
// (ConteudoRico → GaleriaFotos no modelo escolhido).
import { useEditor, useEditorState, EditorContent, ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { Node, mergeAttributes } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Image from "@tiptap/extension-image";
import { useEffect, useRef, useState } from "react";
import { useFotografo } from "@/lib/context/FotografoContext";
import { uploadFileClient } from "@/lib/storage/uploadClient";
import { processarImagemEntrega } from "@/lib/imageResize";
import { MODELOS_GALERIA, normalizarModelo, limparAlt, type FotoGaleriaConteudo } from "@/lib/site/galeriaConteudo";
import { BotaoEscolherDoSite } from "./SeletorImagemSite";

type OpcoesGaleria = { subir: (f: File) => Promise<string | null>; pasta: () => string };

const btnMini: React.CSSProperties = {
  border: "none", borderRadius: 4, background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 11, lineHeight: 1,
  width: 22, height: 22, cursor: "pointer", padding: 0, display: "flex", alignItems: "center", justifyContent: "center",
};
const btnBarra: React.CSSProperties = {
  padding: "4px 9px", borderRadius: 6, border: "0.5px solid var(--color-border-secondary)", cursor: "pointer",
  fontSize: 12, fontWeight: 600, background: "var(--color-background-primary)", color: "var(--color-text-primary)",
};

// Bloco da galeria dentro do editor: modelo, passar automático, e edição das fotos (ordem, alt, remover, adicionar).
function GaleriaEditor({ node, updateAttributes, deleteNode, extension }: NodeViewProps) {
  const fotos = (node.attrs.fotos ?? []) as FotoGaleriaConteudo[];
  const modelo = normalizarModelo(node.attrs.modelo);
  const auto = node.attrs.auto !== false;
  const { subir, pasta } = extension.options as OpcoesGaleria;
  const [enviando, setEnviando] = useState<string | null>(null);
  const arquivoRef = useRef<HTMLInputElement>(null);
  const salvar = (nova: FotoGaleriaConteudo[]) => updateAttributes({ fotos: nova });

  function mover(i: number, d: number) {
    const j = i + d;
    if (j < 0 || j >= fotos.length) return;
    const nova = [...fotos];
    [nova[i], nova[j]] = [nova[j], nova[i]];
    salvar(nova);
  }

  async function adicionar(files: FileList | null) {
    if (!files || files.length === 0) return;
    const lista = Array.from(files).filter((f) => f.type.startsWith("image/"));
    const novas: FotoGaleriaConteudo[] = [];
    for (let i = 0; i < lista.length; i++) {
      setEnviando(`Enviando ${i + 1}/${lista.length}…`);
      const url = await subir(lista[i]);
      if (url) novas.push({ src: url, alt: "" });
    }
    setEnviando(null);
    if (arquivoRef.current) arquivoRef.current.value = "";
    if (novas.length) salvar([...fotos, ...novas]);
  }

  return (
    <NodeViewWrapper contentEditable={false} style={{ margin: "14px 0", padding: 10, borderRadius: 10, border: "1px dashed var(--color-border-secondary)", background: "var(--color-background-secondary)", lineHeight: 1.4 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 10, fontSize: 12 }}>
        <strong style={{ fontSize: 12 }}>▦ Galeria · {fotos.length} {fotos.length === 1 ? "foto" : "fotos"}</strong>
        <label style={{ display: "flex", alignItems: "center", gap: 5 }}>
          Modelo
          <select value={modelo} onChange={(e) => updateAttributes({ modelo: e.target.value })}
            style={{ fontSize: 12, padding: "3px 6px", borderRadius: 6, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)" }}>
            {MODELOS_GALERIA.map((m) => <option key={m.valor} value={m.valor}>{m.rotulo}</option>)}
          </select>
        </label>
        {modelo === "slider" && (
          <label style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
            <input type="checkbox" checked={auto} onChange={(e) => updateAttributes({ auto: e.target.checked })} />
            Passar automático
          </label>
        )}
        <div style={{ flex: 1 }} />
        <button type="button" style={btnBarra} onClick={() => arquivoRef.current?.click()} disabled={!!enviando}>+ Fotos</button>
        <BotaoEscolherDoSite pasta={pasta()} rotulo="Do site" estilo={btnBarra}
          onEscolher={(u, meta) => salvar([...fotos, { src: u, alt: limparAlt(meta.titulo) }])} />
        <button type="button" style={{ ...btnBarra, color: "#b91c1c" }}
          onClick={() => { if (window.confirm("Excluir esta galeria do texto?")) deleteNode(); }}>🗑 Excluir galeria</button>
        <input ref={arquivoRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(e) => adicionar(e.target.files)} />
      </div>
      {enviando && <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 8 }}>{enviando}</div>}
      {fotos.length === 0 ? (
        <div style={{ fontSize: 12, color: "var(--color-text-secondary)", padding: "10px 0" }}>Galeria vazia — adicione fotos.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(118px, 1fr))", gap: 8 }}>
          {fotos.map((f, i) => (
            <div key={`${f.src}-${i}`} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ position: "relative", aspectRatio: "1 / 1", borderRadius: 6, overflow: "hidden", background: "#111" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.src} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", margin: 0, borderRadius: 0 }} />
                <button type="button" style={{ ...btnMini, position: "absolute", top: 4, right: 4 }} onClick={() => salvar(fotos.filter((_, k) => k !== i))} title="Remover foto da galeria">×</button>
                <div style={{ position: "absolute", left: 4, bottom: 4, display: "flex", gap: 3 }}>
                  <button type="button" style={{ ...btnMini, opacity: i === 0 ? 0.35 : 1 }} disabled={i === 0} onClick={() => mover(i, -1)} title="Mover para trás">◀</button>
                  <button type="button" style={{ ...btnMini, opacity: i === fotos.length - 1 ? 0.35 : 1 }} disabled={i === fotos.length - 1} onClick={() => mover(i, 1)} title="Mover para frente">▶</button>
                </div>
                <span style={{ position: "absolute", top: 4, left: 4, fontSize: 10, fontWeight: 700, color: "#fff", background: "rgba(0,0,0,0.55)", borderRadius: 4, padding: "2px 5px" }}>{i + 1}</span>
              </div>
              <input value={f.alt} placeholder="descreva a foto (alt)"
                onChange={(e) => salvar(fotos.map((x, k) => (k === i ? { ...x, alt: limparAlt(e.target.value) } : x)))}
                style={{ fontSize: 11, padding: "4px 6px", borderRadius: 5, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", width: "100%", boxSizing: "border-box" }} />
            </div>
          ))}
        </div>
      )}
    </NodeViewWrapper>
  );
}

// Node de galeria embutido no texto. Serializa para <div data-galeria data-modelo data-auto> com <img src alt>.
// Galeria antiga (só <img>, ou data-urls) é lida normalmente e cai no modelo "miniaturas".
const Galeria = Node.create<OpcoesGaleria>({
  name: "galeria",
  group: "block",
  atom: true,
  addOptions() {
    return { subir: async () => null, pasta: () => "" };
  },
  addAttributes() {
    return {
      fotos: {
        default: [] as FotoGaleriaConteudo[],
        parseHTML: (el: HTMLElement) => {
          const imgs = Array.from(el.querySelectorAll("img"))
            .map((i) => ({ src: i.getAttribute("src") || "", alt: i.getAttribute("alt") || "" }))
            .filter((f) => f.src);
          if (imgs.length) return imgs;
          try { return (JSON.parse(el.getAttribute("data-urls") || "[]") as string[]).map((src) => ({ src, alt: "" })); } catch { return []; }
        },
        renderHTML: () => ({}),
      },
      modelo: {
        default: "miniaturas",
        parseHTML: (el: HTMLElement) => normalizarModelo(el.getAttribute("data-modelo")),
        renderHTML: (attrs: { modelo: string }) => ({ "data-modelo": normalizarModelo(attrs.modelo) }),
      },
      auto: {
        default: true,
        parseHTML: (el: HTMLElement) => el.getAttribute("data-auto") !== "false",
        renderHTML: (attrs: { auto: boolean }) => ({ "data-auto": attrs.auto === false ? "false" : "true" }),
      },
    };
  },
  parseHTML() { return [{ tag: "div[data-galeria]" }]; },
  renderHTML({ node, HTMLAttributes }) {
    const fotos: FotoGaleriaConteudo[] = node.attrs.fotos || [];
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-galeria": "", class: "post-galeria" }),
      ...fotos.map((f) => ["img", f.alt ? { src: f.src, alt: f.alt } : { src: f.src }] as [string, Record<string, string>]),
    ];
  },
  // Os controles do bloco (inputs, botões, seletor do site) ficam fora do ProseMirror.
  addNodeView() { return ReactNodeViewRenderer(GaleriaEditor, { stopEvent: () => true }); },
});

type Props = { value: string; onChange: (html: string) => void; minHeight?: number; pasta: string };

const btn = (active: boolean): React.CSSProperties => ({
  padding: "3px 7px", borderRadius: 5, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700,
  background: active ? "var(--color-text-primary)" : "transparent",
  color: active ? "var(--color-background-primary)" : "var(--color-text-secondary)",
});

export function SiteRichEditor({ value, onChange, minHeight = 320, pasta }: Props) {
  const { fotografo } = useFotografo();
  const [enviando, setEnviando] = useState<null | string>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  const galeriaRef = useRef<HTMLInputElement>(null);

  async function subir(file: File): Promise<string | null> {
    if (!fotografo) return null;
    const { blob } = await processarImagemEntrega(file, 1600, 0.85);
    const base = file.name.replace(/\.[a-z0-9]+$/i, "").normalize("NFD").replace(/[^\x20-\x7E]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "img";
    const path = `site/${fotografo.id}/${pasta}/${base}-${crypto.randomUUID().slice(0, 6)}.jpg`;
    const { url_publica } = await uploadFileClient(path, blob);
    return url_publica;
  }

  // As extensões são criadas uma vez; o bloco da galeria lê o upload/pasta atuais por ref.
  const subirRef = useRef(subir);
  const pastaRef = useRef(pasta);
  useEffect(() => { subirRef.current = subir; pastaRef.current = pasta; });

  const editor = useEditor({
    extensions: [
      StarterKit, // já inclui Underline no tiptap 3
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Image.configure({ inline: false, HTMLAttributes: { class: "post-img" } }),
      Galeria.configure({ subir: (f: File) => subirRef.current(f), pasta: () => pastaRef.current }),
    ],
    content: value,
    immediatelyRender: false,
    // A área editável (ProseMirror) preenche todo o quadro — clicar em qualquer ponto foca e digita
    // (sem isso, só a 1ª linha é clicável). `padding` no próprio editável; `outline:none` remove a moldura.
    editorProps: {
      attributes: { style: `min-height:${minHeight}px;padding:14px 16px;outline:none;` },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  // Alt da imagem única selecionada (null = nenhuma imagem selecionada)
  const altImagem = useEditorState({
    editor,
    selector: ({ editor: e }) => (e && e.isActive("image") ? String(e.getAttributes("image").alt ?? "") : null),
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) editor.commands.setContent(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  async function inserirImagem(files: FileList | null) {
    if (!files || files.length === 0 || !editor) return;
    setEnviando("Enviando imagem…");
    const url = await subir(files[0]);
    if (url) editor.chain().focus().setImage({ src: url }).run();
    setEnviando(null);
    if (imgRef.current) imgRef.current.value = "";
  }

  async function inserirGaleria(files: FileList | null) {
    if (!files || files.length === 0 || !editor) return;
    const lista = Array.from(files).filter((f) => f.type.startsWith("image/"));
    const fotos: FotoGaleriaConteudo[] = [];
    for (let i = 0; i < lista.length; i++) {
      setEnviando(`Enviando galeria ${i + 1}/${lista.length}…`);
      const url = await subir(lista[i]);
      if (url) fotos.push({ src: url, alt: "" });
    }
    if (fotos.length) editor.chain().focus().insertContent({ type: "galeria", attrs: { fotos, modelo: "slider", auto: true } }).run();
    setEnviando(null);
    if (galeriaRef.current) galeriaRef.current.value = "";
  }

  return (
    <div style={{ border: "0.5px solid var(--color-border-secondary)", borderRadius: 10, overflow: "hidden" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 2, padding: "6px 8px", borderBottom: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)", alignItems: "center" }}>
        <button type="button" onClick={() => editor?.chain().focus().toggleBold().run()} style={btn(!!editor?.isActive("bold"))} title="Negrito"><b>B</b></button>
        <button type="button" onClick={() => editor?.chain().focus().toggleItalic().run()} style={btn(!!editor?.isActive("italic"))} title="Itálico"><i>I</i></button>
        <button type="button" onClick={() => editor?.chain().focus().toggleUnderline().run()} style={btn(!!editor?.isActive("underline"))} title="Sublinhado"><u>U</u></button>
        <div style={{ width: 1, background: "var(--color-border-tertiary)", margin: "0 4px", alignSelf: "stretch" }} />
        <button type="button" onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} style={btn(!!editor?.isActive("heading", { level: 2 }))} title="Título">H</button>
        <button type="button" onClick={() => editor?.chain().focus().setTextAlign("left").run()} style={btn(!!editor?.isActive({ textAlign: "left" }))} title="Alinhar à esquerda">&#8676;</button>
        <button type="button" onClick={() => editor?.chain().focus().setTextAlign("center").run()} style={btn(!!editor?.isActive({ textAlign: "center" }))} title="Centralizar">&#8596;</button>
        <button type="button" onClick={() => editor?.chain().focus().setTextAlign("right").run()} style={btn(!!editor?.isActive({ textAlign: "right" }))} title="Alinhar à direita">&#8677;</button>
        <div style={{ width: 1, background: "var(--color-border-tertiary)", margin: "0 4px", alignSelf: "stretch" }} />
        <button type="button" onClick={() => editor?.chain().focus().toggleBulletList().run()} style={btn(!!editor?.isActive("bulletList"))} title="Lista">• —</button>
        <button type="button" onClick={() => editor?.chain().focus().toggleOrderedList().run()} style={btn(!!editor?.isActive("orderedList"))} title="Lista numerada">1.</button>
        <div style={{ width: 1, background: "var(--color-border-tertiary)", margin: "0 4px", alignSelf: "stretch" }} />
        <button type="button" onClick={() => imgRef.current?.click()} style={btn(false)} title="Inserir imagem">🖼 Imagem</button>
        <button type="button" onClick={() => galeriaRef.current?.click()} style={btn(false)} title="Inserir galeria">▦ Galeria</button>
        <BotaoEscolherDoSite pasta={pasta} rotulo="Do site" estilo={btn(false)}
          onEscolher={(u, meta) => editor?.chain().focus().setImage({ src: u, alt: meta.titulo }).run()} />
        {enviando && <span style={{ fontSize: 11, color: "var(--color-text-secondary)", marginLeft: 6 }}>{enviando}</span>}
        <input ref={imgRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => inserirImagem(e.target.files)} />
        <input ref={galeriaRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(e) => inserirGaleria(e.target.files)} />
        {altImagem !== null && altImagem !== undefined && (
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--color-text-secondary)", flexBasis: "100%", marginTop: 6 }}>
            Texto alternativo
            <input value={altImagem} placeholder="descreva a imagem (alt)"
              onChange={(e) => editor?.chain().updateAttributes("image", { alt: limparAlt(e.target.value) }).run()}
              style={{ flex: 1, fontSize: 12, padding: "4px 8px", borderRadius: 6, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)" }} />
          </label>
        )}
      </div>

      <EditorContent
        editor={editor}
        className="site-conteudo"
        style={{ fontSize: 14, lineHeight: 1.7, color: "var(--color-text-primary)", background: "var(--color-background-primary)", cursor: "text" }}
      />
    </div>
  );
}
