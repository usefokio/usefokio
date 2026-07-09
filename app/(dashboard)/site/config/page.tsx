"use client";

// Configurações do site: publicação, endereço (subdomínio/domínio) e redes sociais.
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import { REGEX_SUBDOMINIO, SUBDOMINIOS_RESERVADOS } from "@/lib/site/publico";

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 8, boxSizing: "border-box",
  border: "1px solid var(--color-border-secondary)", fontSize: 13,
  background: "var(--color-background-primary)", color: "var(--color-text-primary)",
};
const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)",
  textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 5,
};

function slugSub(v: string) {
  return v.normalize("NFD").replace(/[^\x20-\x7E]/g, "").toLowerCase().replace(/[^a-z0-9-]+/g, "").slice(0, 40);
}

export default function SiteConfigPage() {
  const { fotografo } = useFotografo();
  const [publicado, setPublicado] = useState(false);
  const [subdominio, setSubdominio] = useState("");
  const [dominio, setDominio] = useState("");
  const [instagram, setInstagram] = useState("");
  const [facebook, setFacebook] = useState("");
  const [youtube, setYoutube] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!fotografo) return;
    const supabase = createClient();
    supabase.from("site_config").select("*").eq("fotografo_id", fotografo.id).maybeSingle().then(({ data }) => {
      if (data) {
        setPublicado(data.publicado ?? false);
        setSubdominio(data.subdominio ?? "");
        setDominio(data.dominio_customizado ?? "");
        const redes = (data.redes ?? {}) as Record<string, string>;
        setInstagram(redes.instagram ?? "");
        setFacebook(redes.facebook ?? "");
        setYoutube(redes.youtube ?? "");
      }
      setCarregando(false);
    });
  }, [fotografo]);

  async function salvar() {
    if (!fotografo) return;
    // Valida o subdomínio antes de salvar (formato + reservados)
    const sub = subdominio.trim();
    if (sub) {
      if (!REGEX_SUBDOMINIO.test(sub)) {
        setMsg("Erro: subdomínio inválido — use só letras minúsculas, números e hífen (sem começar/terminar com hífen).");
        return;
      }
      if (SUBDOMINIOS_RESERVADOS.has(sub)) {
        setMsg(`Erro: o subdomínio "${sub}" é reservado pelo sistema — escolha outro.`);
        return;
      }
    }
    setSalvando(true); setMsg(null);
    const supabase = createClient();
    const redes: Record<string, string> = {};
    if (instagram.trim()) redes.instagram = instagram.trim();
    if (facebook.trim()) redes.facebook = facebook.trim();
    if (youtube.trim()) redes.youtube = youtube.trim();
    const { error } = await supabase.from("site_config").upsert({
      fotografo_id: fotografo.id,
      publicado,
      subdominio: sub || null,
      dominio_customizado: dominio.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "") || null,
      redes: Object.keys(redes).length > 0 ? redes : null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "fotografo_id" });
    setSalvando(false);
    setMsg(error ? "Erro: " + error.message : "Configurações salvas!");
  }

  if (carregando) return <div style={{ padding: 60, textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>;

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--color-text-primary)", margin: "0 0 24px", letterSpacing: "-0.02em" }}>Configurações do site</h1>

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)", cursor: "pointer" }}>
          <input type="checkbox" checked={publicado} onChange={(e) => setPublicado(e.target.checked)} style={{ width: 16, height: 16 }} />
          Site publicado
        </label>

        <div style={{ padding: "14px 16px", borderRadius: 12, border: "1px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 10 }}>Endereço do site</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={labelStyle}>Subdomínio UseFokio</label>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input value={subdominio} onChange={(e) => setSubdominio(slugSub(e.target.value))} style={{ ...inputStyle, width: 200 }} placeholder="seunome" />
                <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>.usefokio.com.br</span>
              </div>
            </div>
            <div>
              <label style={labelStyle}>Domínio próprio</label>
              <input value={dominio} onChange={(e) => setDominio(e.target.value)} style={inputStyle} placeholder="www.seudominio.com.br" />
            </div>
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
              ⚠️ O apontamento de domínio/subdomínio ainda não está ativo — é a próxima etapa de infraestrutura.
              Por enquanto estes campos apenas reservam o endereço.
            </div>
          </div>
        </div>

        <div style={{ padding: "14px 16px", borderRadius: 12, border: "1px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 10 }}>Redes sociais (rodapé do site)</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div><label style={labelStyle}>Instagram</label><input value={instagram} onChange={(e) => setInstagram(e.target.value)} style={inputStyle} placeholder="https://instagram.com/…" /></div>
            <div><label style={labelStyle}>Facebook</label><input value={facebook} onChange={(e) => setFacebook(e.target.value)} style={inputStyle} placeholder="https://facebook.com/…" /></div>
            <div><label style={labelStyle}>YouTube</label><input value={youtube} onChange={(e) => setYoutube(e.target.value)} style={inputStyle} placeholder="https://youtube.com/…" /></div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, alignItems: "center" }}>
          {msg && <span style={{ fontSize: 13, fontWeight: 600, color: msg.startsWith("Erro") ? "#DC2626" : "#059669" }}>{msg}</span>}
          <button onClick={salvar} disabled={salvando}
            style={{ padding: "10px 22px", borderRadius: 9, border: "none", background: "var(--color-text-primary)", color: "var(--color-background-primary)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            {salvando ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
