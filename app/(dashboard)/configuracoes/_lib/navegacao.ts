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
];

/** Área da central a que um caminho pertence (null na tela inicial). */
export function categoriaDoCaminho(pathname: string): CategoriaConfig | null {
  return CATEGORIAS_CONFIG.find((c) => pathname === `/configuracoes/${c.id}` || pathname.startsWith(`/configuracoes/${c.id}/`)) ?? null;
}
