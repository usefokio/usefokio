import { redirect } from "next/navigation";

// Rota legada — no Next 16 `params` é Promise: sem await, o id vinha `undefined` e o
// redirect caía em /crm/clientes/undefined (→ fallback da lista, parecendo "busca de clientes").
export default async function ClienteDetailLegacy({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/crm/clientes/${id}`);
}
