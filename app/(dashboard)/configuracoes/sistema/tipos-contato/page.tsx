"use client";

import { useFotografo } from "@/lib/context/FotografoContext";
import { AbaStatus } from "@/app/(dashboard)/crm/config/_components/AbaStatus";
import { TIPOS_CONTATO_PADRAO, TIPOS_CONTATO_FIXOS } from "@/lib/crm/tiposContato";

// Configurações › Contatos › Tipos de contato (antes era uma aba da Config. CRM).
export default function TiposContatoPage() {
  const { fotografo } = useFotografo();

  return (
    <div style={{ padding: "26px 30px", maxWidth: 860 }}>
      <h1 style={{ fontSize: 19, fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 3px", letterSpacing: "-0.02em" }}>Tipos de contato</h1>
      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 22px" }}>Como os seus contatos são classificados</p>
      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "24px 28px" }}>
        {fotografo ? (
          <AbaStatus
            fotografoId={fotografo.id}
            tabela="crm_contato_tipos"
            seed={TIPOS_CONTATO_PADRAO.map(({ chave, label, ordem, cor }) => ({ chave, label, ordem, cor }))}
            chavesFixas={TIPOS_CONTATO_FIXOS}
            rotuloNovo="+ Novo tipo de contato"
            placeholderNovo="Nome do novo tipo (ex.: Cerimonialista)…"
            descricao="Tipos usados em Contatos (filtros, cadastro e ficha do contato). Cliente e Oportunidade são fixos: o sistema muda sozinho de Oportunidade para Cliente quando o contato ganha um pedido ou uma conta recebida. Os demais você pode renomear, mudar a cor, reordenar, desativar e adicionar novos."
          />
        ) : (
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>
        )}
      </div>
    </div>
  );
}
