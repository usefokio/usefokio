// Central de Configurações (⚙️ no topo) — lista única das áreas (blocos da tela inicial) e das suas
// subcategorias (abas horizontais dentro da área). Cada parte da centralização acrescenta uma área ou
// itens aqui e retira a configuração da origem antiga.
//
// Regra de layout (Fernando, 12/09/2026): tela inicial = blocos lado a lado, um por área; dentro da área
// = abas horizontais com as subcategorias. Nada de menu lateral.

export type ItemConfig = { href: string; label: string; icon: string; ativo: (pathname: string) => boolean };
export type CategoriaConfig = { id: string; label: string; icon: string; descricao: string; itens: ItemConfig[] };

export const CATEGORIAS_CONFIG: CategoriaConfig[] = [
  {
    id: "usuario", label: "Usuário", icon: "👤",
    descricao: "Seus dados de cadastro, plano e uso, e senha de acesso.",
    itens: [
      { href: "/configuracoes/usuario", label: "Meus dados", icon: "🪪",
        ativo: (p) => p === "/configuracoes/usuario" || p.startsWith("/configuracoes/usuario/editar") },
      { href: "/configuracoes/usuario/plano", label: "Plano e uso", icon: "💳",
        ativo: (p) => p.startsWith("/configuracoes/usuario/plano") },
      { href: "/configuracoes/usuario/seguranca", label: "Segurança", icon: "🔐",
        ativo: (p) => p.startsWith("/configuracoes/usuario/seguranca") },
    ],
  },
  // Empresa = o estúdio de fotografia (dados PÚBLICOS), diferente do Usuário (a pessoa que acessa).
  // Alimenta site, galerias, propostas, contratos e e-mails — configurou aqui, vale em tudo.
  {
    id: "empresa", label: "Empresa", icon: "🏢",
    descricao: "Dados públicos do estúdio: nome, contato, endereço, redes sociais e logo. Usados no site, galerias, propostas e e-mails.",
    itens: [
      { href: "/configuracoes/empresa", label: "Dados da empresa", icon: "🏢",
        ativo: (p) => p === "/configuracoes/empresa" },
      { href: "/configuracoes/empresa/redes", label: "Redes sociais", icon: "📱",
        ativo: (p) => p.startsWith("/configuracoes/empresa/redes") },
      { href: "/configuracoes/empresa/identidade", label: "Identidade visual", icon: "🎨",
        ativo: (p) => p.startsWith("/configuracoes/empresa/identidade") },
    ],
  },
  // Tudo que não é do usuário nem da empresa entra aqui, como abas (Fernando, 12/09). Bloco novo só quando ele pedir.
  {
    id: "sistema", label: "Configurações do sistema", icon: "🛠️",
    descricao: "Configurações gerais do sistema, como os tipos de contato.",
    itens: [
      { href: "/configuracoes/sistema/tipos-contato", label: "Tipos de contato", icon: "🏷️",
        ativo: (p) => p.startsWith("/configuracoes/sistema/tipos-contato") },
    ],
  },
];

/** Área da central a que um caminho pertence (null na tela inicial). */
export function categoriaDoCaminho(pathname: string): CategoriaConfig | null {
  return CATEGORIAS_CONFIG.find((c) => pathname === `/configuracoes/${c.id}` || pathname.startsWith(`/configuracoes/${c.id}/`)) ?? null;
}
