"use client";

import type { CSSProperties, ReactElement } from "react";

/** Ícones Material Symbols (fonts.google.com) usados no lugar dos SVGs genéricos.
 *  O nome interno do projeto é traduzido para a ligatura do Material Symbols. */
const SIMBOLOS: Record<string, string> = {
  "inicio": "home",
  "chat": "chat",
  "agenda": "calendar_month",
  "pessoas": "group",
  "documento": "description",
  "grafico": "monitoring",
  "cartao": "credit_card",
  "escudo": "health_and_safety",
  "cracha": "badge",
  "livro": "menu_book",
  "robo": "smart_toy",
  "plugue": "cable",
  "ajustes": "settings",
  "imagem": "image",
  "sino": "notifications",
  "busca": "search",
  "mais": "add",
  "esq": "chevron_left",
  "sair": "logout",
  "dir": "chevron_right",
  "check": "check",
  "baixar": "download",
  "enviar": "send",
  "subir": "upload",
  "dente": "dentistry",
  "alerta": "warning",
  "sorriso": "mood",
  "chave": "key",
  "prancheta": "clinical_notes",
  "ok": "check_circle",
  "seta": "arrow_forward",
  "relogio": "schedule",
  "atualizar": "refresh",
  "impressora": "print",
  "telefone": "call",
  "megafone": "campaign",
  "fechar": "close",
  "predio": "location_city",
  "paleta": "palette",
  "lista": "menu",
  "tv": "tv",
  "som": "volume_up",
  "cerebro": "psychology",
  "regua": "straighten",
  "qr": "qr_code",
  "copiar": "content_copy",
  "link": "link",
  "cadeado": "lock",
  "estrela": "star",
  "raio": "bolt",
  "servidor": "dns",
  "lua": "dark_mode",
};

export type NomeIcone = keyof typeof SIMBOLOS;

interface Props {
  nome: string;
  tam?: number;
  cor?: string;
  esp?: number;
  style?: CSSProperties;
  className?: string;
  rotulo?: string;
}

/** Ícone Material Symbols. `esp` é mantido por compatibilidade (não usado). */
export default function Icone({ nome, tam = 18, cor = "currentColor", style, className, rotulo }: Props) {
  return (
    <span
      className={`material-symbols-outlined${className ? ` ${className}` : ""}`}
      role={rotulo ? "img" : undefined}
      aria-label={rotulo}
      aria-hidden={rotulo ? undefined : true}
      style={{
        fontSize: tam,
        width: tam,
        height: tam,
        lineHeight: 1,
        color: cor,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        userSelect: "none",
        ...style,
      }}
    >
      {SIMBOLOS[nome] ?? "help"}
    </span>
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
