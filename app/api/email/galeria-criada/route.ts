import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { APP_URL, getResend, FROM_DEFAULT } from "@/lib/email/resend";
import { decryptKey } from "@/lib/asaas";
import { templateGaleriaCriada } from "@/lib/email/templates";
import { createAdminClient } from "@/lib/supabase/admin";
import { fotografoIdAtual } from "@/lib/auth/fotografoAtual";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { galeriaId } = body as { galeriaId: string };

    if (!galeriaId) {
      return NextResponse.json({ error: "galeriaId obrigatório" }, { status: 400 });
    }

    const fotografoId = await fotografoIdAtual();
    if (!fotografoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const admin = createAdminClient();
    const { data: galeria } = await admin
      .from("galerias_selecao")
      .select("id, titulo, cliente_id, fotografo_id, data_evento, total_fotos")
      .eq("id", galeriaId)
      .eq("fotografo_id", fotografoId)
      .single();

    if (!galeria) return NextResponse.json({ error: "Galeria não encontrada" }, { status: 404 });

    const { data: fotografo } = await admin
      .from("fotografos")
      .select("nome_completo, nome_empresa, email, site, smtp_host, smtp_port, smtp_user, smtp_pass_enc, smtp_from")
      .eq("id", fotografoId)
      .single();

    if (!galeria.cliente_id) {
      return NextResponse.json({ skipped: true, reason: "Galeria sem cliente vinculado" });
    }

    const { data: cliente } = await admin
      .from("clientes")
      .select("nome, email, senha_acesso")
      .eq("id", galeria.cliente_id)
      .single();

    if (!cliente?.email) {
      return NextResponse.json({ skipped: true, reason: "Cliente sem email cadastrado" });
    }

    const galeriaUrl    = `${APP_URL}/galeria/${galeriaId}`;
    const dataEventoFmt = galeria.data_evento
      ? new Date(galeria.data_evento + "T12:00:00").toLocaleDateString("pt-BR")
      : null;

    const { subject, html } = templateGaleriaCriada({
      clienteNome:      cliente.nome,
      fotografoNome:    fotografo?.nome_completo ?? "",
      fotografoEmpresa: fotografo?.nome_empresa ?? "Fotógrafo",
      fotografoEmail:   fotografo?.email ?? null,
      fotografoSite:    fotografo?.site ?? null,
      galeriaTitulo:    galeria.titulo,
      galeriaUrl,
      senhaAcesso:      cliente.senha_acesso,
      totalFotos:       galeria.total_fotos ?? 0,
      dataEvento:       dataEventoFmt,
    });

    let enviado = false;

    // Resend primeiro (email do sistema)
    try {
      await getResend().emails.send({ from: FROM_DEFAULT, to: cliente.email, subject, html });
      enviado = true;
    } catch (e) {
      console.error("[galeria-criada] Resend falhou:", e instanceof Error ? e.message : e);
    }

    // Fallback: SMTP do fotógrafo
    if (!enviado && fotografo?.smtp_host && fotografo.smtp_pass_enc) {
      try {
        const transporter = nodemailer.createTransport({
          host:   fotografo.smtp_host,
          port:   fotografo.smtp_port ?? 587,
          secure: (fotografo.smtp_port ?? 587) === 465,
          auth:   { user: fotografo.smtp_user, pass: decryptKey(fotografo.smtp_pass_enc) },
        });
        await transporter.sendMail({
          from:    fotografo.smtp_from || fotografo.smtp_user,
          to:      cliente.email,
          subject,
          html,
        });
        enviado = true;
      } catch (e) {
        console.error("[galeria-criada] SMTP falhou:", e instanceof Error ? e.message : e);
      }
    }

    if (!enviado) {
      return NextResponse.json({ error: "Não foi possível enviar o email. Verifique as configurações de email." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[email/galeria-criada]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
