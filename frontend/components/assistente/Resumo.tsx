import { Icone } from "@/components/ui";

/** Lista de conferência do último passo, com atalho "Alterar" para cada item. */
export default function Resumo({ itens, irPara }: { itens: [string, string, number][]; irPara: (n: number) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", border: "1px solid var(--cor-borda)", borderRadius: 14, padding: "4px 16px" }}>
      {itens.map(([r, v, n], i) => (
        <div key={r} style={{ minHeight: 56, display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderTop: i ? "1px solid var(--cor-divisoria)" : undefined }}>
          <span className="sd-tom-ok" style={{ width: 28, height: 28, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icone nome="check" tam={15} esp={2.4} /></span>
          <div style={{ width: 150, fontSize: 13, color: "var(--cor-suave)" }}>{r}</div>
          <div style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600 }}>{v}</div>
          <button type="button" className="sd-link" style={{ minHeight: 44, padding: "0 8px" }} onClick={() => irPara(n)}>Alterar</button>
        </div>
      ))}
    </div>
  );
}
