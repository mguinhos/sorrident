import type { CSSProperties, ReactElement } from "react";

/** Conjunto de ícones do design (traço 1,8 em grade 24×24). Nunca use emoji no lugar deles. */
const DESENHOS: Record<string, ReactElement> = {
  "inicio": (
    <><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></>
  ),
  "chat": (
    <><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /></>
  ),
  "agenda": (
    <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>
  ),
  "pessoas": (
    <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5" /></>
  ),
  "documento": (
    <><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></>
  ),
  "grafico": (
    <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>
  ),
  "cartao": (
    <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20M6 15h4" /></>
  ),
  "escudo": (
    <><path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z" /><path d="M9 12l2 2 4-4" /></>
  ),
  "cracha": (
    <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="11" r="2.5" /><path d="M5.5 17a3.5 3.5 0 0 1 7 0M15 10h3M15 14h3" /></>
  ),
  "livro": (
    <><path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H20v15H5.5A1.5 1.5 0 0 0 4 19.5z" /><path d="M4 19.5A1.5 1.5 0 0 0 5.5 21H20" /></>
  ),
  "robo": (
    <><rect x="4" y="8" width="16" height="12" rx="3" /><path d="M12 4v4M9 13h.01M15 13h.01M9 17h6" /></>
  ),
  "plugue": (
    <><path d="M9 2v6M15 2v6M6 8h12v3a6 6 0 0 1-12 0zM12 17v5" /></>
  ),
  "ajustes": (
    <><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12" /><circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="18" cy="18" r="2" /></>
  ),
  "imagem": (
    <><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="M21 15l-5-5L5 21" /></>
  ),
  "sino": (
    <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8" /><path d="M10 21a2 2 0 0 0 4 0" /></>
  ),
  "busca": (
    <><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></>
  ),
  "mais": (
    <><path d="M12 5v14M5 12h14" /></>
  ),
  "esq": (
    <><path d="M15 18l-6-6 6-6" /></>
  ),
  "sair": (
    <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5M21 12H9" /></>
  ),
  "dir": (
    <><path d="M9 18l6-6-6-6" /></>
  ),
  "check": (
    <><path d="M20 6L9 17l-5-5" /></>
  ),
  "baixar": (
    <><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></>
  ),
  "enviar": (
    <><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" /></>
  ),
  "subir": (
    <><path d="M12 16V4M7 9l5-5 5 5M4 20h16" /></>
  ),
  "dente": (
    <><path d="M7 3c-2.5 0-4 2-4 4.5 0 3 1.5 4.5 2 7.5.5 3 1 6 2.5 6s1.8-3.5 2.5-5.5c.3-1 .7-1.5 2-1.5s1.7.5 2 1.5c.7 2 1 5.5 2.5 5.5s2-3 2.5-6c.5-3 2-4.5 2-7.5C21 5 19.5 3 17 3c-2 0-3 1-5 1S9 3 7 3z" /></>
  ),
  "alerta": (
    <><path d="M12 3l10 18H2z" /><path d="M12 10v5M12 18h.01" /></>
  ),
  "sorriso": (
    <><circle cx="12" cy="12" r="9" /><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" /></>
  ),
  "chave": (
    <><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z" /></>
  ),
  "prancheta": (
    <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4V3h6v1M9 11h6M9 15h4" /></>
  ),
  "ok": (
    <><circle cx="12" cy="12" r="9" /><path d="M8 12l3 3 5-6" /></>
  ),
  "seta": (
    <><path d="M5 12h14M13 6l6 6-6 6" /></>
  ),
  "relogio": (
    <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>
  ),
  "impressora": (
    <><path d="M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a1 1 0 0 1-1 1h-2" /><rect x="6" y="14" width="12" height="7" /></>
  ),
  "telefone": (
    <><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" /></>
  ),
  "megafone": (
    <><path d="M3 11v2a1 1 0 0 0 1 1h3l6 4V6L7 10H4a1 1 0 0 0-1 1z" /><path d="M17 8a5 5 0 0 1 0 8" /></>
  ),
  "fechar": (
    <><path d="M6 6l12 12M18 6L6 18" /></>
  ),
  "predio": (
    <><path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 9h4a1 1 0 0 1 1 1v11M2 21h20" /><path d="M8 8h3M8 12h3M8 16h3" /></>
  ),
  "paleta": (
    <><path d="M12 3a9 9 0 0 0 0 18c1.1 0 1.5-.8 1.5-1.6 0-1.3-1-1.7-1-2.9 0-1 .8-1.5 1.8-1.5H17a4 4 0 0 0 4-4c0-4.4-4-8-9-8z" /><circle cx="7.5" cy="11" r="1" /><circle cx="10" cy="7" r="1" /><circle cx="15" cy="7.5" r="1" /></>
  ),
  "lista": (
    <><path d="M9 6h11M9 12h11M9 18h11" /><circle cx="4.5" cy="6" r="1" /><circle cx="4.5" cy="12" r="1" /><circle cx="4.5" cy="18" r="1" /></>
  ),
  "tv": (
    <><rect x="2" y="4" width="20" height="13" rx="2" /><path d="M8 21h8M12 17v4" /></>
  ),
  "som": (
    <><path d="M11 5L6 9H3v6h3l5 4z" /><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" /></>
  ),
  "cerebro": (
    <><path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 6 1V5a2 2 0 0 0-3-1zM15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-6 1" /></>
  ),
  "regua": (
    <><path d="M9 11l3 3M12 8l3 3" /><path d="M3 15L15 3l6 6L9 21z" /></>
  ),
  "qr": (
    <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h3v3M21 14v7h-4M14 21h.01" /></>
  ),
  "copiar": (
    <><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></>
  ),
  "link": (
    <><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" /><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" /></>
  ),
  "cadeado": (
    <><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>
  ),
  "estrela": (
    <><path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z" /></>
  ),
  "raio": (
    <><path d="M13 2L4 14h7l-1 8 9-12h-7z" /></>
  ),
  "servidor": (
    <><rect x="3" y="4" width="18" height="7" rx="2" /><rect x="3" y="13" width="18" height="7" rx="2" /><path d="M7 7.5h.01M7 16.5h.01" /></>
  ),
  "lua": (
    <><path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z" /></>
  ),
};

export type NomeIcone = keyof typeof DESENHOS;

interface Props {
  nome: string;
  tam?: number;
  cor?: string;
  esp?: number;
  style?: CSSProperties;
  className?: string;
  rotulo?: string;
}

export default function Icone({ nome, tam = 18, cor = "currentColor", esp = 1.8, style, className, rotulo }: Props) {
  return (
    <svg
      width={tam}
      height={tam}
      viewBox="0 0 24 24"
      fill="none"
      stroke={cor}
      strokeWidth={esp}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0, display: "block", ...style }}
      className={className}
      role={rotulo ? "img" : undefined}
      aria-label={rotulo}
      aria-hidden={rotulo ? undefined : true}
    >
      {DESENHOS[nome] ?? null}
    </svg>
  );
}

/** Marca do canal de mensagens (WhatsApp ou Telegram), desenhada em SVG. */
export function MarcaCanal({ canal, tam = 48 }: { canal: "whatsapp" | "telegram"; tam?: number }) {
  const raio = Math.round(tam / 4);
  if (canal === "whatsapp") {
    return (
      <span className="sd-marca-canal" style={{ width: tam, height: tam, borderRadius: raio, background: "var(--cor-whatsapp)" }}>
        <svg width={tam * 0.62} height={tam * 0.62} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M20.5 11.6a8.5 8.5 0 0 1-12.6 7.5L3.5 20.5l1.4-4.3a8.5 8.5 0 1 1 15.6-4.6z" />
          <path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.6-2-1-1 .8a4.5 4.5 0 0 1-2.2-2.2l.8-1-1-2z" fill="#fff" strokeWidth={1} />
        </svg>
      </span>
    );
  }
  return (
    <span className="sd-marca-canal" style={{ width: tam, height: tam, borderRadius: raio, background: "var(--cor-telegram)" }}>
      <svg width={tam * 0.6} height={tam * 0.6} viewBox="0 0 24 24" fill="#fff" aria-hidden>
        <path d="M21.5 3.6L2.9 10.8c-1 .4-1 1.6 0 1.9l4.6 1.5 1.8 5.6c.3.8 1.2 1 1.8.4l2.6-2.4 4.6 3.4c.7.5 1.6.1 1.8-.7l3.1-15.5c.2-1-.7-1.8-1.5-1.4zM9.6 14.3l-.4 3.6-1.3-4.3 9.6-6.2z" />
      </svg>
    </span>
  );
}
