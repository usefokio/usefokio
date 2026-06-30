import { createAdminClient } from "@/lib/supabase/admin";
import { getResend, FROM_DEFAULT } from "@/lib/email/resend";

export async function GET(req: Request) {
  const auth   = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin  = createAdminClient();
  const agora  = new Date();
  const hoje   = agora.toISOString().slice(0, 10);
  const em7d   = new Date(agora);
  em7d.setDate(em7d.getDate() + 7);
  const em7dStr = em7d.toISOString().slice(0, 10);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://usefokio.com.br";

  let avisos   = 0;
  let downgrades = 0;

  // ── Avisos: expira em 7 dias ────────────────────────────────────────────────
  const { data: expirandoBreve } = await admin
    .from("fotografos")
    .select("id, email, nome_completo, nome_empresa, plano_expira_em")
    .eq("plano", "profissional")
    .gte("plano_expira_em", `${hoje}T00:00:00`)
    .lte("plano_expira_em", `${em7dStr}T23:59:59`);

  for (const foto of expirandoBreve ?? []) {
    if (!foto.email) continue;
    const nome     = foto.nome_empresa ?? foto.nome_completo ?? "fotógrafo";
    const expiraFmt = new Date(foto.plano_expira_em).toLocaleDateString("pt-BR");

    const html = `
      <div style="font-family:sans-serif;font-size:15px;line-height:1.7;color:#222;max-width:560px">
        <p>Olá, <strong>${nome}</strong>!</p>
        <p>Seu plano <strong>Profissional</strong> expira em <strong>${expiraFmt}</strong>.</p>
        <p>Renove agora para continuar com acesso a 10.000 fotos:</p>
        <p>
          <a href="${appUrl}/conta/plano"
            style="display:inline-block;padding:10px 22px;background:#2563EB;color:#fff;border-radius:8px;text-decoration:none;font-weight:700">
            Renovar plano — R$49
          </a>
        </p>
        <hr style="margin:24px 0;border:none;border-top:1px solid #eee">
        <div style="font-size:12px;color:#aaa">UseFokio</div>
      </div>`;

    await getResend().emails.send({
      from: FROM_DEFAULT,
      to: foto.email,
      subject: `Seu plano expira em ${expiraFmt} — renove agora`,
      html,
    }).catch(() => {});

    avisos++;
  }

  // ── Downgrade: expirou ───────────────────────────────────────────────────────
  const { data: expirados } = await admin
    .from("fotografos")
    .select("id, email, nome_completo, nome_empresa, plano_expira_em")
    .eq("plano", "profissional")
    .lt("plano_expira_em", `${hoje}T00:00:00`);

  const idsParaDowngrade = (expirados ?? []).map(f => f.id);

  if (idsParaDowngrade.length > 0) {
    await admin.from("fotografos")
      .update({ plano: "gratuito", plano_expira_em: null, plano_ativado_em: null })
      .in("id", idsParaDowngrade);

    for (const foto of expirados ?? []) {
      if (!foto.email) continue;
      const nome = foto.nome_empresa ?? foto.nome_completo ?? "fotógrafo";

      const html = `
        <div style="font-family:sans-serif;font-size:15px;line-height:1.7;color:#222;max-width:560px">
          <p>Olá, <strong>${nome}</strong>!</p>
          <p>Seu plano Profissional expirou. Sua conta voltou para o plano <strong>Beta Gratuito</strong> (1.000 fotos).</p>
          <p>Para reativar o Profissional e recuperar acesso às 10.000 fotos:</p>
          <p>
            <a href="${appUrl}/conta/plano"
              style="display:inline-block;padding:10px 22px;background:#2563EB;color:#fff;border-radius:8px;text-decoration:none;font-weight:700">
              Reativar plano — R$49
            </a>
          </p>
          <hr style="margin:24px 0;border:none;border-top:1px solid #eee">
          <div style="font-size:12px;color:#aaa">UseFokio</div>
        </div>`;

      await getResend().emails.send({
        from: FROM_DEFAULT,
        to: foto.email,
        subject: "Seu plano expirou — UseFokio",
        html,
      }).catch(() => {});
    }

    downgrades = idsParaDowngrade.length;
  }

  return Response.json({ ok: true, avisos, downgrades });
}
