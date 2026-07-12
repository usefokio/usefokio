"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import { urlPublicaSite, hostPublicoSite, type ConfigUrl } from "@/lib/site/urlPublica";

export default function SiteDashboardPage() {
  const { fotografo } = useFotografo();
  const [cfg, setCfg] = useState<ConfigUrl | null>(null);
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    if (!fotografo) return;
    createClient().from("site_config").select("subdominio, dominio_customizado, publicado").eq("fotografo_id", fotografo.id).maybeSingle()
      .then(({ data }) => { setCfg((data as ConfigUrl) ?? null); setCarregado(true); });
  }, [fotografo]);

  const fid = fotografo?.id ?? "";
  const host = hostPublicoSite(cfg);
  const publicado = !!cfg?.publicado && !!host;
  const url = urlPublicaSite(cfg, fid);

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 24px" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--color-text-primary)", margin: "0 0 6px", letterSpacing: "-0.02em" }}>Site — Painel</h1>
      <p style={{ fontSize: 14, color: "var(--color-text-secondary)", margin: "0 0 24px", lineHeight: 1.6 }}>
        Gerencie seu site profissional: galerias (trabalhos e portfólios), blog, páginas, depoimentos, SEO e domínio.
      </p>

      {fotografo && carregado && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <a href={url} target="_blank" rel="noopener noreferrer"
            style={{ display: "inline-block", padding: "11px 22px", borderRadius: 9, background: "var(--color-text-primary)", color: "var(--color-background-primary)", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
            🌐 {publicado ? "Ver meu site" : "Visualizar (prévia)"}
          </a>
          {host && (
            <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
              {publicado ? "no ar em " : "endereço reservado: "}
              <a href={`https://${host}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-text-primary)", fontWeight: 600 }}>{host}</a>
            </span>
          )}
        </div>
      )}

      <div style={{ marginTop: 24, padding: "16px 18px", borderRadius: 12, border: "1px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)", fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.7 }}>
        {publicado ? (
          <>Seu site está <strong>publicado</strong> e servido no seu endereço. Edite tudo pelos itens do menu — as mudanças aparecem no site ao salvar (pode levar alguns segundos de cache).</>
        ) : host ? (
          <>Seu endereço <strong>{host}</strong> já está reservado, mas o site ainda <strong>não está publicado</strong>. Ative em <strong>Site → Configurações</strong> (marcar “publicado”) para o endereço passar a servir seu site; por enquanto o botão abre a prévia.</>
        ) : (
          <>Defina um <strong>subdomínio</strong> em <strong>Site → Configurações</strong> (ex.: <code>seunome</code> → <code>seunome.usefokio.com.br</code>) e publique para colocar seu site no ar. O domínio próprio entra numa etapa seguinte.</>
        )}
      </div>
    </div>
  );
}
