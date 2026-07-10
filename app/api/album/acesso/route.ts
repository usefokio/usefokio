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
      .select("id, titulo, descricao, status, versao, expira_em, cliente_id, modelo_nome, modelo_largura_cm, modelo_altura_cm, fotografo_id, fotografos(logo_url), clientes(senha_acesso, nome)")
      .eq("id", albumId)
      .maybeSingle();

    if (!album || !STATUS_VISIVEIS.includes(album.status as string)) {
      return NextResponse.json({ estado: "nao_encontrado" });
    }

    // Dados de cabeçalho (não sensíveis) — usados na tela de senha/expirado
    const cab = {
      titulo: album.titulo as string,
      logoUrl: (album.fotografos as { logo_url?: string | null } | null)?.logo_url ?? null,
      clienteNome: (album.clientes as { nome?: string | null } | null)?.nome ?? null,
    };

    // Expiração
    if (album.expira_em && new Date(album.expira_em as string) < new Date()) {
      return NextResponse.json({ estado: "expirado", ...cab });
    }

    // Senha DO CLIENTE (padrão do sistema — a mesma das galerias de seleção). Sem cliente/sem senha → livre.
    const senhaCliente = (album.clientes as { senha_acesso?: string | null } | null)?.senha_acesso;
    const senhaDefinida = !!(senhaCliente && String(senhaCliente).trim());
    if (senhaDefinida) {
      if (senha == null) return NextResponse.json({ estado: "senha", ...cab });        // pedir senha
      if (senha.trim() !== String(senhaCliente).trim()) {
        return NextResponse.json({ estado: "senha_incorreta", ...cab });               // errada
      }
    }

    // Liberado: carrega a versão corrente
    const versao = (album.versao as number) ?? 1;
    const [{ data: laminas }, { data: comentarios }] = await Promise.all([
      admin.from("album_laminas").select("*").eq("selecao_id", albumId).eq("versao", versao).order("ordem").order("created_at"),
      admin.from("album_comentarios").select("*").eq("selecao_id", albumId).eq("versao", versao).order("created_at"),
    ]);

    // Nunca devolve dados de senha ao cliente (remove o join clientes que carrega a senha)
    const { clientes: _omit, ...albumLimpo } = album as Record<string, unknown>;
    return NextResponse.json({ estado: "ok", album: albumLimpo, laminas: laminas ?? [], comentarios: comentarios ?? [] });
  } catch (err: any) {
    console.error("[album/acesso]", err);
    return NextResponse.json({ estado: "erro", msg: err.message }, { status: 500 });
  }
}
