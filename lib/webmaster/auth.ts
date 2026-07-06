import { createClient } from "@supabase/supabase-js";

const WEBMASTER_EMAIL = process.env.WEBMASTER_EMAIL ?? "usefokio@gmail.com";

export async function verificarWebmaster(req: Request): Promise<boolean> {
  // Em dev não há sessão real (auth bypassada). Só vale localmente: no build de
  // produção/preview do Vercel NODE_ENV === "production", então nunca libera.
  if (process.env.NODE_ENV === "development") return true;
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return false;
  const uc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { data: { user } } = await uc.auth.getUser();
  return user?.email === WEBMASTER_EMAIL;
}
