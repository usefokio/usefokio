import { createClient } from "@/lib/supabase/client";
import { gerarSenhaAcesso } from "@/lib/utils";

/**
 * Garante que o cliente tenha uma senha de acesso (a mesma usada em todas as galerias dele).
 * Gera e salva uma se estiver vazia — NÃO sobrescreve senha já existente. Best-effort.
 * Usado ao criar/abrir um álbum de um cliente, para o acesso passar a exigir senha
 * mesmo em clientes migrados (que vieram sem senha_acesso).
 */
export async function garantirSenhaCliente(clienteId: string | null | undefined): Promise<void> {
  if (!clienteId) return;
  const sb = createClient();
  const { data } = await sb.from("clientes").select("senha_acesso").eq("id", clienteId).maybeSingle();
  if (data && (!data.senha_acesso || !String(data.senha_acesso).trim())) {
    await sb.from("clientes").update({ senha_acesso: gerarSenhaAcesso() }).eq("id", clienteId);
  }
}
