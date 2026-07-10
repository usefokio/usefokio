import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimitOk, clientIp } from "@/lib/rate-limit";

// Acesso do CLIENTE ao álbum (lado público). Valida status, expiração e senha NO SERVIDOR e só
// entrega as lâminas quando liberado — assim a senha nunca vai ao cliente e as imagens não vazam
// antes da senha certa. As escritas (comentar/aprovar) seguem pelo Supabase anônimo com RLS.
const STATUS_VISIVEIS = ["ativa", "aprovado", "aguardando_revisao"];

export async function POST(request: Request) {
  try {
    if (!(await rateLimitOk(`album-acesso:${clientIp(request)}`, 30, 60))) {
      return NextResponse.json({ estado: "erro", msg: "Muitas tentativas. Aguarde um instante." }, { status: 429 });
    }

    const { albumId, senha } = (await request.json()) as { albumId: string; senha?: string };
    if (!albumId) return NextResponse.json({ estado: "nao_encontrado" }, { status: 400 });

    const admin = createAdminClient();
    const { data: album } = await admin
      .from("album_selecoes")
      .select("id, titulo, descricao, status, versao, expira_em, senha_acesso, modelo_nome, modelo_largura_cm, modelo_altura_cm, fotografo_id, fotografos(logo_url)")
      .eq("id", albumId)
      .maybeSingle();

    if (!album || !STATUS_VISIVEIS.includes(album.status as string)) {
      return NextResponse.json({ estado: "nao_encontrado" });
    }

    // Expiração
    if (album.expira_em && new Date(album.expira_em as string) < new Date()) {
      return NextResponse.json({ estado: "expirado" });
    }

    // Senha
    const senhaDefinida = !!(album.senha_acesso && String(album.senha_acesso).trim());
    if (senhaDefinida) {
      if (senha == null) return NextResponse.json({ estado: "senha" });               // pedir senha
      if (senha.trim() !== String(album.senha_acesso).trim()) {
        return NextResponse.json({ estado: "senha_incorreta" });                       // errada
      }
    }

    // Liberado: carrega a versão corrente
    const versao = (album.versao as number) ?? 1;
    const [{ data: laminas }, { data: comentarios }] = await Promise.all([
      admin.from("album_laminas").select("*").eq("selecao_id", albumId).eq("versao", versao).order("ordem").order("created_at"),
      admin.from("album_comentarios").select("*").eq("selecao_id", albumId).eq("versao", versao).order("created_at"),
    ]);

    // Nunca devolve senha_acesso ao cliente
    const { senha_acesso: _omit, ...albumSemSenha } = album as Record<string, unknown>;
    return NextResponse.json({ estado: "ok", album: albumSemSenha, laminas: laminas ?? [], comentarios: comentarios ?? [] });
  } catch (err: any) {
    console.error("[album/acesso]", err);
    return NextResponse.json({ estado: "erro", msg: err.message }, { status: 500 });
  }
}
