import { redirect } from "next/navigation";

// Endereço antigo (usado em e-mails, avisos de limite e cron de assinatura) → Configurações › Usuário › Plano e uso.
export default function ContaPlanoLegacy() {
  redirect("/configuracoes/usuario/plano");
}
