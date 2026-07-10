// Configuração do formulário de contato/lead personalizável.
// Guardada em jsonb já existente: página contato → `site_paginas.conteudo.formulario`;
// bloco de landing → `SiteBloco.dados.formulario`. Sem migração de schema.
// Reusada pelo editor de config (FormularioConfigEditor) e pelo componente público (ContatoForm).

export type CampoPadrao = "nome" | "email" | "telefone" | "data_evento" | "tipo_evento" | "mensagem";

export type ConfigCampoPadrao = { ativo: boolean; obrigatorio: boolean };

export type CampoExtra = {
  id: string;
  rotulo: string;
  tipo: "texto" | "textarea" | "select";
  opcoes?: string[];      // usado quando tipo === "select"
  obrigatorio: boolean;
};

export type ConfigFormulario = {
  campos: Record<CampoPadrao, ConfigCampoPadrao>;
  ordem?: CampoPadrao[];  // ordem de exibição dos campos padrão (default = ORDEM_PADRAO)
  extras: CampoExtra[];
  textoBotao?: string;
};

export const ORDEM_PADRAO: CampoPadrao[] = ["nome", "email", "telefone", "data_evento", "tipo_evento", "mensagem"];

export const CAMPO_LABEL: Record<CampoPadrao, string> = {
  nome:        "Nome",
  email:       "E-mail",
  telefone:    "Telefone / WhatsApp",
  data_evento: "Data do evento",
  tipo_evento: "Tipo do evento",
  mensagem:    "Mensagem",
};

export const CONFIG_FORM_PADRAO: ConfigFormulario = {
  campos: {
    nome:        { ativo: true, obrigatorio: true },
    email:       { ativo: true, obrigatorio: false },
    telefone:    { ativo: true, obrigatorio: false },
    data_evento: { ativo: true, obrigatorio: false },
    tipo_evento: { ativo: true, obrigatorio: false },
    mensagem:    { ativo: true, obrigatorio: true },
  },
  extras: [],
};

// Normaliza uma config vinda do banco (pode estar parcial/antiga) para o shape completo.
export function normalizarConfig(raw: unknown): ConfigFormulario {
  const base = CONFIG_FORM_PADRAO;
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Partial<ConfigFormulario>;
  const campos = {} as Record<CampoPadrao, ConfigCampoPadrao>;
  for (const k of ORDEM_PADRAO) {
    const c = r.campos?.[k];
    campos[k] = {
      ativo:      typeof c?.ativo === "boolean" ? c.ativo : base.campos[k].ativo,
      obrigatorio: typeof c?.obrigatorio === "boolean" ? c.obrigatorio : base.campos[k].obrigatorio,
    };
  }
  const extras = Array.isArray(r.extras)
    ? r.extras.filter((e): e is CampoExtra => !!e && typeof e.rotulo === "string" && typeof e.id === "string")
    : [];
  const ordem = Array.isArray(r.ordem) ? r.ordem.filter((k): k is CampoPadrao => ORDEM_PADRAO.includes(k)) : undefined;
  return { campos, extras, ordem, textoBotao: typeof r.textoBotao === "string" ? r.textoBotao : undefined };
}
