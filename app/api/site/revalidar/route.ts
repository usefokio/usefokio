// Limpa o cache das leituras do site público (lib/supabase/admin.ts → createSiteClient).
// Chamada pelo painel logo depois de gravar algo do site, para a alteração aparecer na hora.
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { TAG_CACHE_SITE } from "@/lib/supabase/admin";

export async function POST() {
  if (process.env.NODE_ENV !== "development") {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }
  revalidateTag(TAG_CACHE_SITE, { expire: 0 });
  return NextResponse.json({ ok: true });
}
