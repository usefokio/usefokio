// Redes sociais da EMPRESA (fonte única: fotografos.instagram/facebook/tiktok/youtube, editadas em
// Configurações › Empresa › Redes sociais). Aceita "@perfil", "perfil" ou o link completo; aqui vira link.

export type RedeSocial = "instagram" | "facebook" | "tiktok" | "youtube";

export const REDES: { chave: RedeSocial; label: string; base: string }[] = [
  { chave: "instagram", label: "Instagram", base: "https://instagram.com/" },
  { chave: "facebook",  label: "Facebook",  base: "https://facebook.com/" },
  { chave: "tiktok",    label: "TikTok",    base: "https://tiktok.com/@" },
  { chave: "youtube",   label: "YouTube",   base: "https://youtube.com/@" },
];

export function linkRede(rede: RedeSocial, valor: string | null | undefined): string | null {
  const v = (valor ?? "").trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  if (/^(www\.)?(instagram|facebook|fb|tiktok|youtube|youtu)\.(com|be)\//i.test(v)) return `https://${v}`;
  const base = REDES.find((r) => r.chave === rede)!.base;
  return base + v.replace(/^@/, "");
}

/** Links das redes da empresa a partir do cadastro (campos vazios → null). */
export function redesDaEmpresa(f: Partial<Record<RedeSocial, string | null>> | null | undefined): Record<RedeSocial, string | null> {
  return {
    instagram: linkRede("instagram", f?.instagram),
    facebook:  linkRede("facebook",  f?.facebook),
    tiktok:    linkRede("tiktok",    f?.tiktok),
    youtube:   linkRede("youtube",   f?.youtube),
  };
}
