"use client";

// Nome do cliente clicável → abre o cadastro dele. Regra do sistema: em QUALQUER tela onde o nome
// do cliente aparece, ele leva ao cadastro daquele cliente.
// Aponta direto para /crm/clientes/{id} (a rota /clientes/{id} é só um redirect legado).
// O stopPropagation é essencial: quase todo nome fica dentro de linha/card que já navega
// para outro destino (o pedido, a galeria…) — sem ele, o clique no nome seria sequestrado.
import Link from "next/link";

export function ClienteLink({ id, nome, style }: {
  id: string | null | undefined;
  nome: string | null | undefined;
  style?: React.CSSProperties;
}) {
  const texto = nome?.trim() || "—";
  if (!id || !nome?.trim()) return <span style={style}>{texto}</span>;
  return (
    <Link
      href={`/crm/clientes/${id}`}
      onClick={(e) => e.stopPropagation()}
      title={`Abrir cadastro de ${texto}`}
      style={{ color: "inherit", textDecoration: "none", ...style }}
      onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
      onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
    >
      {texto}
    </Link>
  );
}
