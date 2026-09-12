// Central de Configurações (⚙️ no topo) — lista única das categorias e seus itens. Cada parte da
// centralização acrescenta uma categoria/itens aqui e retira a configuração da origem antiga.

export type ItemConfig = { href: string; label: string; icon: string; ativo: (pathname: string) => boolean };
export type CategoriaConfig = { id: string; label: string; icon: string; itens: ItemConfig[] };

export const CATEGORIAS_CONFIG: CategoriaConfig[] = [
  {
    id: "usuario", label: "Usuário", icon: "👤",
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
