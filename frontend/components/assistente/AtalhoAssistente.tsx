import { Botao, Cartao, Icone } from "@/components/ui";

/** Cartão que abre um assistente de configuração. */
export default function AtalhoAssistente({ icone, titulo, desc, href, rotulo = "Abrir assistente" }: { icone: string; titulo: string; desc: string; href: string; rotulo?: string }) {
  return (
    <Cartao gap={14} style={{ flex: 1, minWidth: 260 }} as="div">
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div className="sd-escolha-icone"><Icone nome={icone} tam={20} /></div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{titulo}</div>
          <div style={{ fontSize: 13, color: "var(--cor-suave)", lineHeight: 1.4 }}>{desc}</div>
        </div>
      </div>
      <Botao tipo="suave" iconeFim="seta" href={href} style={{ alignSelf: "flex-start" }}>{rotulo}</Botao>
    </Cartao>
  );
}
