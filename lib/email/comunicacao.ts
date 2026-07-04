// Fonte única das variáveis de personalização usadas na comunicação
// webmaster → fotógrafos. Importado pela página (chips + preview) e pela
// route de envio (substituição por destinatário).

export type VarComunicacao = { chave: string; label: string; exemplo: string };

export const VARIAVEIS_COMUNICACAO: VarComunicacao[] = [
  { chave: "nome",         label: "Primeiro nome",   exemplo: "João" },
  { chave: "nomeCompleto", label: "Nome completo",   exemplo: "João da Silva" },
  { chave: "empresa",      label: "Nome da empresa", exemplo: "João Fotografia" },
  { chave: "email",        label: "Email",           exemplo: "joao@exemplo.com" },
  { chave: "plano",        label: "Plano",           exemplo: "gratuito" },
  { chave: "galerias",     label: "Nº de galerias",  exemplo: "0" },
  { chave: "clientes",     label: "Nº de clientes",  exemplo: "0" },
  { chave: "fotos",        label: "Nº de fotos",     exemplo: "0" },
];

export type VarsComunicacao = Record<string, string>;

export function substituirVarsComunicacao(texto: string, vars: VarsComunicacao): string {
  let out = texto;
  for (const { chave } of VARIAVEIS_COMUNICACAO) {
    const val = vars[chave] ?? "";
    out = out.replace(new RegExp(`\\{${chave}\\}`, "g"), val);
  }
  return out;
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type DadosFotografoComunicacao = {
  nome_completo: string;
  nome_empresa: string;
  email: string;
  plano: string;
  total_galerias?: number;
  total_clientes?: number;
  total_fotos?: number;
};

export function varsDeFotografo(f: DadosFotografoComunicacao): VarsComunicacao {
  const primeiro = (f.nome_completo || "").trim().split(/\s+/)[0] || f.nome_completo || "";
  return {
    nome:         primeiro,
    nomeCompleto: f.nome_completo ?? "",
    empresa:      f.nome_empresa ?? "",
    email:        f.email ?? "",
    plano:        f.plano ?? "",
    galerias:     String(f.total_galerias ?? 0),
    clientes:     String(f.total_clientes ?? 0),
    fotos:        String(f.total_fotos ?? 0),
  };
}

export const VARS_AMOSTRA: VarsComunicacao = {
  nome:         "João",
  nomeCompleto: "João da Silva",
  empresa:      "João Fotografia",
  email:        "joao@exemplo.com",
  plano:        "gratuito",
  galerias:     "0",
  clientes:     "0",
  fotos:        "0",
};
