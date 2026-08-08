"use client";

// Produtos extras da revelação (porta-retratos, quadros, álbuns pra montar): listar, criar,
// editar, ativar/desativar, excluir. Mesmo padrão de app/(dashboard)/site/depoimentos/page.tsx.
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import { uploadFileClient } from "@/lib/storage/uploadClient";
import { deleteFilesClient } from "@/lib/storage/deleteClient";
import { processarImagemEntrega } from "@/lib/imageResize";
import { mascaraValor, parsearValor, formatNum } from "@/lib/utils/format";
import type { RevelacaoProdutoExtra } from "@/lib/supabase/types";

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 8, boxSizing: "border-box",
  border: "1px solid var(--color-border-secondary)", fontSize: 13,
  background: "var(--color-background-primary)", color: "var(--color-text-primary)",
};

type FormState = {
  id: string | null;
  titulo: string;
  descricao: string;
  valorStr: string;
  imagem_url: string | null;
  storage_path: string | null;
};
const FORM_VAZIO: FormState = { id: null, titulo: "", descricao: "", valorStr: "", imagem_url: null, storage_path: null };

export default function RevelacaoExtrasPage() {
  const router = useRouter();
  const { fotografo } = useFotografo();
  const [itens, setItens] = useState<RevelacaoProdutoExtra[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState | null>(null);
  const [salvando, setSalvando] = useState(false);
  const inputFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!fotografo) return;
    const supabase = createClient();
    supabase.from("revelacao_produtos_extras").select("*").eq("fotografo_id", fotografo.id).order("ordem")
      .then(({ data }) => { setItens((data as RevelacaoProdutoExtra[]) ?? []); setLoading(false); });
  }, [fotografo]);

  async function salvar() {
    if (!form || !fotografo) return;
    const valor = parsearValor(form.valorStr);
    if (!form.titulo.trim() || !valor || valor <= 0) return;
    setSalvando(true);
    const supabase = createClient();
    if (form.id) {
      const { data } = await supabase.from("revelacao_produtos_extras")
        .update({ titulo: form.titulo.trim(), descricao: form.descricao.trim() || null, valor, imagem_url: form.imagem_url, storage_path: form.storage_path })
        .eq("id", form.id).select("*").single();
      if (data) setItens((prev) => prev.map((i) => i.id === form.id ? (data as RevelacaoProdutoExtra) : i));
    } else {
      const ordem = itens.length > 0 ? Math.max(...itens.map((i) => i.ordem)) + 1 : 0;
      const { data } = await supabase.from("revelacao_produtos_extras")
        .insert({ fotografo_id: fotografo.id, titulo: form.titulo.trim(), descricao: form.descricao.trim() || null, valor, imagem_url: form.imagem_url, storage_path: form.storage_path, ordem, ativo: true })
        .select("*").single();
      if (data) setItens((prev) => [...prev, data as RevelacaoProdutoExtra]);
    }
    setSalvando(false);
    setForm(null);
  }

  async function alternarAtivo(item: RevelacaoProdutoExtra) {
    const supabase = createClient();
    setItens((prev) => prev.map((i) => i.id === item.id ? { ...i, ativo: !item.ativo } : i));
    await supabase.from("revelacao_produtos_extras").update({ ativo: !item.ativo }).eq("id", item.id);
  }

  async function excluir(item: RevelacaoProdutoExtra) {
    if (!confirm(`Excluir o produto "${item.titulo}"?`)) return;
    const supabase = createClient();
    if (item.storage_path) await deleteFilesClient([{ storage_path: item.storage_path, url_publica: item.imagem_url }]);
    await supabase.from("revelacao_produtos_extras").delete().eq("id", item.id);
    setItens((prev) => prev.filter((i) => i.id !== item.id));
  }

  async function enviarImagem(files: FileList | null) {
    if (!files || files.length === 0 || !fotografo || !form) return;
    const { blob } = await processarImagemEntrega(files[0], 800, 0.85);
    const path = `revelacao/${fotografo.id}/extras/${crypto.randomUUID().slice(0, 8)}.jpg`;
    const { url_publica, storage_path } = await uploadFileClient(path, blob);
    setForm((prev) => prev ? { ...prev, imagem_url: url_publica, storage_path } : prev);
    if (inputFileRef.current) inputFileRef.current.value = "";
  }

  const cardStyle: React.CSSProperties = { border: "1px solid var(--color-border-secondary)", borderRadius: 12, padding: 18, background: "var(--color-background-secondary)" };

  const camposForm = (f: FormState) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <input value={f.titulo} onChange={(e) => setForm({ ...f, titulo: e.target.value })} placeholder="Título do produto *" style={inputStyle} />
      <textarea value={f.descricao} onChange={(e) => setForm({ ...f, descricao: e.target.value })} rows={3} placeholder="Descrição (opcional)" style={{ ...inputStyle, resize: "vertical" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>R$</span>
        <input value={f.valorStr} onChange={(e) => setForm({ ...f, valorStr: mascaraValor(e.target.value) })} placeholder="Valor *"
          style={{ ...inputStyle, width: 120 }} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {f.imagem_url && <img src={f.imagem_url} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover" }} />}
        <button onClick={() => inputFileRef.current?.click()}
          style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--color-border-secondary)", background: "transparent", fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)", cursor: "pointer" }}>
          {f.imagem_url ? "Trocar imagem" : "+ Imagem (opcional)"}
        </button>
        <input ref={inputFileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => enviarImagem(e.target.files)} />
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button onClick={() => setForm(null)} style={{ padding: "9px 16px", borderRadius: 8, border: "1px solid var(--color-border-secondary)", background: "transparent", fontSize: 12, color: "var(--color-text-secondary)", cursor: "pointer" }}>Cancelar</button>
        <button onClick={salvar} disabled={salvando || !f.titulo.trim() || !parsearValor(f.valorStr)}
          style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: "var(--color-text-primary)", color: "var(--color-background-primary)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
          {salvando ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px" }}>
      <button onClick={() => router.push("/revelacao")} style={{ background: "none", border: "none", color: "var(--color-text-secondary)", fontSize: 13, cursor: "pointer", padding: 0, marginBottom: 16 }}>← Voltar</button>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--color-text-primary)", margin: 0, letterSpacing: "-0.02em" }}>Produtos extras</h1>
        <button onClick={() => setForm(FORM_VAZIO)}
          style={{ padding: "9px 18px", borderRadius: 9, border: "none", background: "var(--color-text-primary)", color: "var(--color-background-primary)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          + Novo produto
        </button>
      </div>
      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 24px" }}>
        Porta-retratos, quadros, álbuns pra montar — cadastre aqui pra oferecer aos clientes no pedido de revelação.
      </p>

      {form && form.id === null && (
        <div style={{ ...cardStyle, marginBottom: 20 }}>
          {camposForm(form)}
        </div>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {itens.map((p) => (
            form && form.id === p.id ? (
              <div key={p.id} style={cardStyle}>
                {camposForm(form)}
              </div>
            ) : (
              <div key={p.id} style={{ border: "1px solid var(--color-border-tertiary)", borderRadius: 10, padding: "12px 16px", display: "flex", gap: 12, alignItems: "flex-start" }}>
                {p.imagem_url && <img src={p.imagem_url} alt={p.titulo} style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)" }}>{p.titulo}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: p.ativo ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.15)", color: p.ativo ? "#059669" : "#B45309" }}>
                      {p.ativo ? "Ativo" : "Inativo"}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-secondary)" }}>R$ {formatNum(p.valor)}</span>
                  </div>
                  {p.descricao && (
                    <div style={{ fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
                      {p.descricao.length > 180 ? p.descricao.slice(0, 180) + "…" : p.descricao}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  <button onClick={() => setForm({ id: p.id, titulo: p.titulo, descricao: p.descricao ?? "", valorStr: formatNum(p.valor), imagem_url: p.imagem_url, storage_path: p.storage_path })} title="Editar"
                    style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 13, color: "var(--color-text-secondary)" }}>✏️</button>
                  <button onClick={() => alternarAtivo(p)} title={p.ativo ? "Desativar" : "Ativar"}
                    style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 13, color: "var(--color-text-secondary)" }}>{p.ativo ? "🙈" : "👁"}</button>
                  <button onClick={() => excluir(p)} title="Excluir"
                    style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 13, color: "#DC2626" }}>🗑</button>
                </div>
              </div>
            )
          ))}
          {itens.length === 0 && (
            <div style={{ padding: "40px 20px", borderRadius: 12, border: "1px dashed var(--color-border-secondary)", textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)", background: "var(--color-background-secondary)" }}>
              Nenhum produto extra ainda.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
