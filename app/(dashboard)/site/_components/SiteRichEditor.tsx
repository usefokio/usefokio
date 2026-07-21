"use client";

// Editor rico do Site: texto formatado + imagem única e galeria (grid) dentro do conteúdo.
// Separado do RichTextEditor do CRM para não afetá-lo. As imagens são enviadas ao storage
// e o HTML gerado (<img> e <div data-galeria>) é o mesmo interpretado nas páginas públicas.
import { useEditor, EditorContent } from "@tiptap/react";
import { Node, mergeAttributes } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Image from "@tiptap/extension-image";
import { useEffect, useRef, useState } from "react";
import { useFotografo } from "@/lib/context/FotografoContext";
import { uploadFileClient } from "@/lib/storage/uploadClient";
import { processarImagemEntrega } from "@/lib/imageResize";
import { BotaoEscolherDoSite } from "./SeletorImagemSite";

// Node de galeria: grid de imagens embutido no post. Serializa para <div data-galeria> com <img> filhos.
const Galeria = Node.create({
  name: "galeria",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      urls: {
        default: [] as string[],
        parseHTML: (el: HTMLElement) => {
          const imgs = Array.from(el.querySelectorAll("img")).map((i) => i.getAttribute("src") || "").filter(Boolean);
          if (imgs.length) return imgs;
          try { return JSON.parse(el.getAttribute("data-urls") || "[]"); } catch { return []; }
        },
        renderHTML: (attrs: { urls: string[] }) => ({ "data-urls": JSON.stringify(attrs.urls || []) }),
      },
    };
  },
  parseHTML() { return [{ tag: "div[data-galeria]" }]; },
  renderHTML({ node, HTMLAttributes }) {
    const urls: string[] = node.attrs.urls || [];
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-galeria": "", class: "post-galeria" }),
      ...urls.map((u) => ["img", { src: u }] as [string, Record<string, string>]),
    ];
  },
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

  const editor = useEditor({
    extensions: [
      StarterKit, // já inclui Underline no tiptap 3
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Image.configure({ inline: false, HTMLAttributes: { class: "post-img" } }),
      Galeria,
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

  useEffect(() => {
    if (editor && value !== editor.getHTML()) editor.commands.setContent(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  async function subir(file: File): Promise<string | null> {
    if (!fotografo) return null;
    const { blob } = await processarImagemEntrega(file, 1600, 0.85);
    const base = file.name.replace(/\.[a-z0-9]+$/i, "").normalize("NFD").replace(/[^\x20-\x7E]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "img";
    const path = `site/${fotografo.id}/${pasta}/${base}-${crypto.randomUUID().slice(0, 6)}.jpg`;
    const { url_publica } = await uploadFileClient(path, blob);
    return url_publica;
  }

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
    const urls: string[] = [];
    for (let i = 0; i < lista.length; i++) {
      setEnviando(`Enviando galeria ${i + 1}/${lista.length}…`);
      const url = await subir(lista[i]);
      if (url) urls.push(url);
    }
    if (urls.length) editor.chain().focus().insertContent({ type: "galeria", attrs: { urls } }).run();
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
        <button type="button" onClick={() => galeriaRef.current?.click()} style={btn(false)} title="Inserir galeria (grid)">▦ Galeria</button>
        <BotaoEscolherDoSite pasta={pasta} rotulo="Do site" estilo={btn(false)}
          onEscolher={(u, meta) => editor?.chain().focus().setImage({ src: u, alt: meta.titulo }).run()} />
        {enviando && <span style={{ fontSize: 11, color: "var(--color-text-secondary)", marginLeft: 6 }}>{enviando}</span>}
        <input ref={imgRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => inserirImagem(e.target.files)} />
        <input ref={galeriaRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(e) => inserirGaleria(e.target.files)} />
      </div>

      <EditorContent
        editor={editor}
        className="site-conteudo"
        style={{ fontSize: 14, lineHeight: 1.7, color: "var(--color-text-primary)", background: "var(--color-background-primary)", cursor: "text" }}
      />
    </div>
  );
}
