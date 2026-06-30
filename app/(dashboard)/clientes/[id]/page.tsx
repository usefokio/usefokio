import { redirect } from "next/navigation";

export default function ClienteDetailLegacy({ params }: { params: { id: string } }) {
  redirect(`/crm/clientes/${params.id}`);
}
