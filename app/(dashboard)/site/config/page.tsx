"use client";

// Configurações do site: redes sociais (rodapé).
// Endereço (subdomínio/domínio próprio) e publicação ficam em Site → Domínio.
import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import { useEditorEstado, SeloEstado, BotaoSalvarEstado, ModalNaoSalvo } from "@/app/(dashboard)/_components/EditorEstado";

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 8, boxSizing: "border-box",
  border: "1px solid var(--color-border-secondary)", fontSize: 13,
  background: "var(--color-background-primary)", color: "var(--color-text-primary)",
};
const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)",
  textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 5,
};

export default function SiteConfigPage() {
  const { fotografo } = useFotografo();
  const [instagram, setInstagram] = useState("");
  const [facebook, setFacebook] = useState("");
  const [youtube, setYoutube] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Estado de salvamento claro (regra de sistema)
  const snapshotAtual = JSON.stringify([instagram, facebook, youtube]);
  const estado = useEditorEstado(snapshotAtual, "/site");

  useEffect(() => {
    if (!fotografo) return;
    createClient().from("site_config").select("redes").eq("fotografo_id", fotografo.id).maybeSingle().then(({ data }) => {
      const redes = (data?.redes ?? {}) as Record<string, string>;
      setInstagram(redes.instagram ?? "");
      setFacebook(redes.facebook ?? "");
      setYoutube(redes.youtube ?? "");
      estado.inicializar(JSON.stringify([redes.instagram ?? "", redes.facebook ?? "", redes.youtube ?? ""]));
      setCarregando(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fotografo]);

  async function salvar(): Promise<boolean> {
    if (!fotografo) return false;
    setSalvando(true); setMsg(null);
    const redes: Record<string, string> = {};
    if (instagram.trim()) redes.instagram = instagram.trim();
    if (facebook.trim()) redes.facebook = facebook.trim();
    if (youtube.trim()) redes.youtube = youtube.trim();
    const { error } = await createClient().from("site_config").upsert({
      fotografo_id: fotografo.id,
      redes: Object.keys(redes).length > 0 ? redes : null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "fotografo_id" });
    setSalvando(false);
    if (error) { setMsg("Erro: " + error.message); return false; }
    estado.marcarSalvo(snapshotAtual);
    setMsg("Configurações salvas!");
    return true;
  }

  if (carregando) return <div style={{ padding: 60, textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>;

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--color-text-primary)", margin: 0, letterSpacing: "-0.02em" }}>Configurações do site</h1>
        <SeloEstado temAlteracoes={estado.temAlteracoes} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ padding: "14px 16px", borderRadius: 12, border: "1px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 10 }}>Redes sociais (rodapé do site)</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div><label style={labelStyle}>Instagram</label><input value={instagram} onChange={(e) => setInstagram(e.target.value)} style={inputStyle} placeholder="https://instagram.com/…" /></div>
            <div><label style={labelStyle}>Facebook</label><input value={facebook} onChange={(e) => setFacebook(e.target.value)} style={inputStyle} placeholder="https://facebook.com/…" /></div>
            <div><label style={labelStyle}>YouTube</label><input value={youtube} onChange={(e) => setYoutube(e.target.value)} style={inputStyle} placeholder="https://youtube.com/…" /></div>
          </div>
        </div>

        <div style={{ fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
          O endereço do site (subdomínio e domínio próprio) e a publicação agora ficam em{" "}
          <Link href="/site/dominio" style={{ color: "var(--color-text-primary)", fontWeight: 600 }}>Site → Domínio</Link>.
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, alignItems: "center" }}>
          {msg && <span style={{ fontSize: 13, fontWeight: 600, color: msg.startsWith("Erro") ? "#DC2626" : "#059669" }}>{msg}</span>}
          <BotaoSalvarEstado temAlteracoes={estado.temAlteracoes} salvando={salvando} onClick={() => salvar()} />
        </div>
      </div>

      <ModalNaoSalvo
        aberto={estado.modalAberto}
        salvando={salvando}
        onSalvarESair={async () => { if (await salvar()) estado.sairAgora(); }}
        onSairSemSalvar={estado.sairAgora}
        onContinuar={estado.fecharModal}
      />
    </div>
  );
}
