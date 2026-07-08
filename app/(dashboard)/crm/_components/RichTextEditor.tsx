"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import { useEffect } from "react";

type Props = {
  value: string;
  onChange?: (html: string) => void;
  readonly?: boolean;
  minHeight?: number;
};

const btn = (active: boolean): React.CSSProperties => ({
  padding: "3px 7px", borderRadius: 5, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700,
  background: active ? "var(--color-text-primary)" : "transparent",
  color: active ? "var(--color-background-primary)" : "var(--color-text-secondary)",
});

export function RichTextEditor({ value, onChange, readonly = false, minHeight = 400 }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit, // já inclui Underline no tiptap 3
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: value,
    editable: !readonly,
    immediatelyRender: false, // evita hydration mismatch no Next (render só no client)
    onUpdate: ({ editor }: { editor: { getHTML: () => string } }) => {
      onChange?.(editor.getHTML());
    },
  });

  // sync value when it changes externally
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  if (readonly) {
    return (
      <div
        className="rte-readonly"
        dangerouslySetInnerHTML={{ __html: value }}
        style={{ lineHeight: 1.7, fontSize: 14, color: "var(--color-text-primary)" }}
      />
    );
  }

  return (
    <div style={{ border: "0.5px solid var(--color-border-secondary)", borderRadius: 10, overflow: "hidden" }}>
      {/* Toolbar */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: 2, padding: "6px 8px",
        borderBottom: "0.5px solid var(--color-border-tertiary)",
        background: "var(--color-background-secondary)",
      }}>
        <button type="button" onClick={() => editor?.chain().focus().toggleBold().run()} style={btn(!!editor?.isActive("bold"))} title="Negrito"><b>B</b></button>
        <button type="button" onClick={() => editor?.chain().focus().toggleItalic().run()} style={btn(!!editor?.isActive("italic"))} title="Itálico"><i>I</i></button>
        <button type="button" onClick={() => editor?.chain().focus().toggleUnderline().run()} style={btn(!!editor?.isActive("underline"))} title="Sublinhado"><u>U</u></button>

        <div style={{ width: 1, background: "var(--color-border-tertiary)", margin: "0 4px" }} />

        <button type="button" onClick={() => editor?.chain().focus().setTextAlign("left").run()} style={btn(!!editor?.isActive({ textAlign: "left" }))} title="Alinhar esquerda">&#8676;</button>
        <button type="button" onClick={() => editor?.chain().focus().setTextAlign("center").run()} style={btn(!!editor?.isActive({ textAlign: "center" }))} title="Centralizar">&#8596;</button>
        <button type="button" onClick={() => editor?.chain().focus().setTextAlign("right").run()} style={btn(!!editor?.isActive({ textAlign: "right" }))} title="Alinhar direita">&#8677;</button>

        <div style={{ width: 1, background: "var(--color-border-tertiary)", margin: "0 4px" }} />

        <button type="button" onClick={() => editor?.chain().focus().toggleBulletList().run()} style={btn(!!editor?.isActive("bulletList"))} title="Lista">• —</button>
        <button type="button" onClick={() => editor?.chain().focus().toggleOrderedList().run()} style={btn(!!editor?.isActive("orderedList"))} title="Lista numerada">1.</button>
      </div>

      {/* Editor */}
      <EditorContent
        editor={editor}
        style={{ padding: "14px 16px", minHeight, fontSize: 14, lineHeight: 1.7, color: "var(--color-text-primary)", background: "var(--color-background-primary)", outline: "none" }}
      />
    </div>
  );
}
