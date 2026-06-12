"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import { ClienteSelect } from "@/app/(dashboard)/entrega/_components/ClienteSelect";
import { Field } from "@/components/ui/Field";
import { inputStyle } from "@/lib/styles";
import { useUnsavedGuard } from "@/lib/hooks/useUnsavedGuard";
import { LaminasUpload } from "../_components/LaminasUpload";
import type { FotografoAlbumModelo } from "@/lib/supabase/types";

const MODELOS_DEFAULT = [
  { nome: "Álbum 25×25 cm", largura_cm: 25, altura_cm: 25 },
  { nome: "Álbum 25×30 cm", largura_cm: 25, altura_cm: 30 },
  { nome: "Álbum 30×30 cm", largura_cm: 30, altura_cm: 30 },
];

export default function NovoAlbumPage() {
  const router        = useRouter();
  const { fotografo } = useFotografo();

  const [titulo,    setTitulo]    = useState("");
  const [clienteId, setClienteId] = useState("");
  const [modeloId,  setModeloId]  = useState("");
  const [descricao, setDescricao] = useState("");
  const [modelos,   setModelos]   = useState<FotografoAlbumModelo[]>([]);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState("");
  const [albumId,   setAlbumId]   = useState<string | null>(null);
  const [temLaminas, setTemLaminas] = useState(false);
  const [concluido,  setConcluido]  = useState(false);
  const modelosCarregadosRef = useRef(false);
  const albumIdRef = useRef<string | null>(null);

  // Há dados que seriam perdidos ao sair?
  const temAlteracoes = !concluido && (titulo.trim() !== "" || clienteId !== "" || descricao.trim() !== "" || temLaminas);

  // Guarda de navegação: intercepta links internos e fechar aba
  const { modalAberto: modalSair, setModalAberto: setModalSair, pedirSaida, irParaDestino } = useUnsavedGuard(temAlteracoes);

  // Cria o álbum de trabalho somente quando o primeiro upload começa
  async function criarAlbumTrabalho(): Promise<string | null> {
    if (albumIdRef.current) return albumIdRef.current;
    if (!fotografo) return null;
    const supabase = createClient();
    const { data } = await supabase.from("album_selecoes").insert({
      fotografo_id: fotografo.id,
      titulo:       titulo.trim() || "Sem título",
      status:       "rascunho",
    }).select("id").single();
    if (data?.id) {
      albumIdRef.current = data.id;
      setAlbumId(data.id);
      return data.id;
    }
    return null;
  }

  useEffect(() => {
    if (!fotografo || modelosCarregadosRef.current) return;
    modelosCarregadosRef.current = true;

    const supabase = createClient();
    supabase
      .from("fotografo_album_modelos")
      .select("*")
      .eq("fotografo_id", fotografo.id)
      .order("ordem")
      .then(async ({ data }) => {
        if (!data || data.length === 0) {
          const inserts = MODELOS_DEFAULT.map((m, i) => ({
            ...m, fotografo_id: fotografo.id, is_default: true, ordem: i,
          }));
          const { data: criados } = await supabase
            .from("fotografo_album_modelos")
            .insert(inserts)
            .select();
          const lista = (criados as FotografoAlbumModelo[]) ?? [];
          setModelos(lista);
          if (lista.length > 0) setModeloId(lista[0].id);
        } else {
          setModelos(data as FotografoAlbumModelo[]);
          setModeloId((data as FotografoAlbumModelo[])[0].id);
        }
      });
  }, [fotografo]);

  async function handleSave() {
    if (!titulo.trim()) { setError("Título é obrigatório."); return; }
    if (!fotografo)     { setError("Sessão expirada."); return; }

    setSaving(true);
    setError("");

    const idAlbum = albumIdRef.current ?? await criarAlbumTrabalho();
    if (!idAlbum) { setError("Erro ao criar o álbum. Tente novamente."); setSaving(false); return; }

    const modelo = modelos.find((m) => m.id === modeloId) ?? null;

    const supabase = createClient();
    const { error: err } = await supabase
      .from("album_selecoes")
      .update({
        cliente_id:        clienteId || null,
        modelo_id:         modeloId  || null,
        titulo:            titulo.trim(),
        descricao:         descricao.trim() || null,
        status:            "ativa",
        modelo_nome:       modelo?.nome ?? null,
        modelo_largura_cm: modelo?.largura_cm ?? null,
        modelo_altura_cm:  modelo?.altura_cm ?? null,
      })
      .eq("id", idAlbum);

    setSaving(false);
    if (err) { setError(err.message); return; }
    setConcluido(true);
    router.push(`/album/${idAlbum}/editar`);
  }

  function handleSairClick() {
    if (temAlteracoes) { pedirSaida("/album"); return; }
    descartarESair();
  }

  async function descartarESair() {
    if (albumIdRef.current) {
      const supabase = createClient();
      await supabase.from("album_selecoes").delete().eq("id", albumIdRef.current).eq("status", "rascunho");
    }
    setConcluido(true);
    irParaDestino("/album");
  }

  async function salvarRascunhoESair() {
    const modelo = modelos.find((m) => m.id === modeloId) ?? null;
    const supabase = createClient();
    const dados = {
      cliente_id:        clienteId || null,
      modelo_id:         modeloId  || null,
      titulo:            titulo.trim() || "Sem título",
      descricao:         descricao.trim() || null,
      modelo_nome:       modelo?.nome ?? null,
      modelo_largura_cm: modelo?.largura_cm ?? null,
      modelo_altura_cm:  modelo?.altura_cm ?? null,
    };
    if (albumIdRef.current) {
      await supabase.from("album_selecoes").update(dados).eq("id", albumIdRef.current);
    } else if (fotografo) {
      // Sem lâminas enviadas: cria o rascunho agora com os dados do formulário
      await supabase.from("album_selecoes").insert({ ...dados, fotografo_id: fotografo.id, status: "rascunho" });
    }
    setConcluido(true);
    irParaDestino("/album");
  }

  return (
    <div style={{ padding: "26px 30px", maxWidth: 580 }}>

      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={handleSairClick}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 13, padding: 0 }}
          >
            ← Voltar
          </button>
          <span style={{ color: "var(--color-border-secondary)" }}>/</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>Nova seleção de álbum</span>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !titulo.trim()}
          style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: saving || !titulo.trim() ? "#93C5FD" : "#2563EB", color: "#fff", fontSize: 13, fontWeight: 600, cursor: saving || !titulo.trim() ? "default" : "pointer", flexShrink: 0 }}
        >
          {saving ? "Salvando…" : "Criar álbum"}
        </button>
      </div>

      {error && (
        <div style={{ background: "rgba(239,68,68,0.08)", border: "0.5px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "10px 16px", marginBottom: 16, fontSize: 13, color: "#EF4444" }}>
          {error}
        </div>
      )}

      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 14, padding: "28px 32px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          <Field label="Título *">
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Álbum Casamento Maria e João"
              style={inputStyle}
              autoFocus
            />
          </Field>

          <Field label="Cliente">
            <ClienteSelect value={clienteId} onChange={(id) => setClienteId(id)} />
          </Field>

          <Field label="Modelo de álbum">
            <select value={modeloId} onChange={(e) => setModeloId(e.target.value)} style={inputStyle}>
              <option value="">Selecionar modelo…</option>
              {modelos.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome} ({m.largura_cm}×{m.altura_cm} cm)
                </option>
              ))}
            </select>
          </Field>

          <Field label="Descrição / observações">
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Informações para o cliente…"
              rows={3}
              style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
            />
          </Field>

        </div>

        {/* Upload de lâminas — disponível desde o início (álbum rascunho) */}
        <div style={{ background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "18px 22px", marginTop: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
            Lâminas do álbum
          </div>
          <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "0 0 14px", lineHeight: 1.5 }}>
            Faça o upload das lâminas agora — elas só ficam visíveis para o cliente depois que você criar o álbum.
          </p>
          {fotografo ? (
            <LaminasUpload selecaoId={albumId} fotografoId={fotografo.id} ensureSelecaoId={criarAlbumTrabalho} onLaminasChange={(l) => setTemLaminas(l.length > 0)} />
          ) : (
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", padding: "12px 0" }}>Preparando área de upload…</div>
          )}
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button
            onClick={handleSave}
            disabled={saving || !titulo.trim()}
            style={{
              padding: "10px 28px", borderRadius: 8,
              background: saving || !titulo.trim() ? "#93C5FD" : "#2563EB",
              color: "#fff", border: "none",
              fontSize: 13, fontWeight: 700,
              cursor: saving || !titulo.trim() ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Salvando…" : "Criar álbum →"}
          </button>
          <button
            onClick={handleSairClick}
            style={{ padding: "10px 18px", borderRadius: 8, background: "transparent", color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-secondary)", fontSize: 13, cursor: "pointer" }}
          >
            Cancelar
          </button>
        </div>
      </div>

      {/* Modal: dados não salvos */}
      {modalSair && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 70, padding: 20 }} onClick={() => setModalSair(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 14, padding: "26px 28px", width: 400, maxWidth: "100%", boxShadow: "0 8px 40px rgba(0,0,0,0.18)" }}>
            <h3 style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 700, color: "var(--color-text-primary)" }}>⚠️ Dados não salvos</h3>
            <p style={{ margin: "0 0 20px", fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
              Você preencheu informações{temLaminas ? " e enviou lâminas" : ""} que serão perdidas se sair sem salvar. O que deseja fazer?
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button onClick={salvarRascunhoESair} style={{ padding: "10px", borderRadius: 8, border: "none", background: "var(--color-text-primary)", color: "var(--color-background-primary)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                💾 Salvar como rascunho e sair
              </button>
              <button onClick={descartarESair} style={{ padding: "10px", borderRadius: 8, border: "0.5px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.05)", color: "#DC2626", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Descartar tudo e sair
              </button>
              <button onClick={() => setModalSair(false)} style={{ padding: "10px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "transparent", color: "var(--color-text-secondary)", fontSize: 13, cursor: "pointer" }}>
                Continuar editando
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
