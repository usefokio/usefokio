import { redirect } from "next/navigation";

// Minha conta foi para a central de Configurações (⚙️ no topo) → Usuário › Meus dados.
export default function ContaLegacy() {
  redirect("/configuracoes/usuario");
}
