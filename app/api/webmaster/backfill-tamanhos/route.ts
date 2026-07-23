import { createAdminClient } from "@/lib/supabase/admin";

// Preenche tamanho_bytes das mídias que estão sem ele (importações antigas gravaram só a URL).
// Sem isso o "espaço usado" da conta ignora esses arquivos — as 2.163 fotos de trabalho do
// fernandoagrela somavam 0 byte. Lê o tamanho REAL de cada arquivo (HEAD na URL pública do R2),
// nunca estima. Idempotente: só toca em linhas com tamanho_bytes nulo/zero.
//
// Uso: POST com Authorization: Bearer $CRON_SECRET. Opcional no corpo: { limite: 500 }.
export const maxDuration = 300;

type Alvo = { tabela: "site_trabalho_fotos" | "site_portfolio_fotos" | "site_banners"; coluna: string };
const ALVOS: Alvo[] = [
  { tabela: "site_trabalho_fotos", coluna: "url_publica" },
  { tabela: "site_portfolio_fotos", coluna: "url_publica" },
  { tabela: "site_banners", coluna: "url_publica" },
];

async function tamanhoReal(url: string): Promise<number | null> {
  try {
    const r = await fetch(url, { method: "HEAD" });
    if (!r.ok) return null;
    const n = Number(r.headers.get("content-length") ?? 0);
    return n > 0 ? n : null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!process.env.CRON_SECRET || bearer !== process.env.CRON_SECRET) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const corpo = (await req.json().catch(() => ({}))) as { limite?: number };
  const limite = Math.min(Math.max(corpo.limite ?? 400, 1), 1000);
  const admin = createAdminClient();
  const resumo: Record<string, { pendentes: number; atualizados: number; falhas: number }> = {};

  for (const alvo of ALVOS) {
    const { data, error } = await admin
      .from(alvo.tabela)
      .select(`id, ${alvo.coluna}`)
      .or("tamanho_bytes.is.null,tamanho_bytes.eq.0")
      .limit(limite);
    if (error) { resumo[alvo.tabela] = { pendentes: -1, atualizados: 0, falhas: 0 }; continue; }

    const linhas = (data ?? []) as unknown as Record<string, string>[];
    let atualizados = 0, falhas = 0;

    // 8 por vez: rápido sem martelar o storage.
    for (let i = 0; i < linhas.length; i += 8) {
      const lote = linhas.slice(i, i + 8);
      await Promise.all(lote.map(async (l) => {
        const url = l[alvo.coluna];
        if (!url) { falhas++; return; }
        const bytes = await tamanhoReal(url);
        if (bytes === null) { falhas++; return; }
        const { error: err } = await admin.from(alvo.tabela).update({ tamanho_bytes: bytes }).eq("id", l.id);
        if (err) falhas++; else atualizados++;
      }));
    }
    resumo[alvo.tabela] = { pendentes: linhas.length, atualizados, falhas };
  }

  // Recontagem de fotos na mesma passada (a contagem não depende do tamanho, mas mantém tudo coerente).
  await admin.rpc("recalcular_fotos_usadas");

  const restam = Object.values(resumo).some((r) => r.pendentes >= limite);
  return Response.json({ resumo, rodar_novamente: restam });
}
