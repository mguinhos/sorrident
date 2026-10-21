import type { ReactNode } from "react";
import Icone from "@/components/ui/Icone";

interface Props {
  titulo: string;
  sub?: ReactNode;
  migalha?: string[];
  acoes?: ReactNode;
  aoLado?: ReactNode;
}

/** Topo padronizado das páginas internas: migalha, título, subtítulo e ações à direita. */
export default function Topo({ titulo, sub, migalha, acoes, aoLado }: Props) {
  return (
    <header className="sd-topo">
      <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: "12px 0" }}>
        {migalha && (
          <div className="sd-migalha">
            {migalha.map((m, i) => (
              <span key={m} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                {i > 0 && <Icone nome="dir" tam={12} />}
                {m}
              </span>
            ))}
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h1 className="sd-topo-titulo">{titulo}</h1>
          {aoLado}
        </div>
        {sub && <div className="sd-topo-sub">{sub}</div>}
      </div>
      {acoes && <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>{acoes}</div>}
    </header>
  );
}

export function Conteudo({ children, gap = 20 }: { children: ReactNode; gap?: number }) {
  return <main className="sd-conteudo" style={{ gap }}>{children}</main>;
}
