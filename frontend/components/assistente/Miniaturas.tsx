import type { ReactNode } from "react";
import Icone from "@/components/ui/Icone";
import type { TipoAtendimento } from "@/lib/senhas";

/* ---------------------------------------------------------------- quiosque */
export function MiniQuiosque({
  nome, saudacao, tipos, cor = "#0065C4", cor2 = "#10BBFA", retrato = true, logo = true,
}: { nome: string; saudacao: string; tipos: TipoAtendimento[]; cor?: string; cor2?: string; retrato?: boolean; logo?: boolean }) {
  return (
    <div style={{ width: "100%", height: "100%", background: "#F5F8FC", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ background: `linear-gradient(135deg, ${cor} 0%, ${cor2} 100%)`, padding: `${retrato ? 14 : 8}px 12px`, display: "flex", alignItems: "center", gap: 8 }}>
        {logo && (
          <div style={{ width: 22, height: 22, borderRadius: 999, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="" width={18} height={18} />
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{nome}</div>
          <div style={{ fontSize: 6.5, color: "rgba(255,255,255,.9)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{saudacao}</div>
        </div>
      </div>
      <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 7, flex: 1, minHeight: 0 }}>
        <div style={{ fontSize: 9, fontWeight: 700 }}>Qual o tipo de atendimento?</div>
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: `repeat(${retrato ? 2 : 3}, 1fr)`, gridAutoRows: "1fr", gap: 6, minHeight: 0 }}>
          {tipos.map((t) => {
            const [bg, fg] = t.prioridade ? ["#FDECEC", "#DC2626"] : ["#EAF3FD", cor];
            return (
              <div key={t.sigla} style={{ background: "#fff", border: `1px solid ${t.prioridade ? "#F5C2C2" : "#E6EAF2"}`, borderRadius: 7, padding: 6, display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 0 }}>
                <div style={{ width: 24, height: 24, borderRadius: 7, background: bg, color: fg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icone nome={t.icone} tam={14} esp={2} />
                </div>
                <div style={{ fontSize: 9, fontWeight: 700 }}>{t.nome}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- painel de chamada */
export interface OpcoesPainel {
  nome: boolean;
  ultimas: boolean;
  proximas: boolean;
  relogio: boolean;
}

export function MiniPainel({ op = { nome: true, ultimas: true, proximas: true, relogio: true }, retrato = false }: { op?: OpcoesPainel; retrato?: boolean }) {
  const borda = "#E6EAF2";
  if (retrato) {
    return (
      <div style={{ width: 216, height: 384, background: "#F5F8FC", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ height: 24, flexShrink: 0, background: "#fff", borderBottom: `1px solid ${borda}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="" width={14} height={14} />
            <div style={{ fontSize: 8, fontWeight: 700 }}>SorriDente</div>
          </div>
          {op.relogio && <div style={{ fontSize: 7, fontWeight: 700 }}>Ter, 23/09 · 14:32</div>}
        </div>
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 6, padding: "8px 10px" }}>
          <div style={{ flex: "0 0 auto", height: 96, background: "#fff", border: `1px solid ${borda}`, borderRadius: 8, padding: "6px 8px", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 0 }}>
            <div style={{ fontSize: 5, fontWeight: 700, color: "#0065C4", letterSpacing: ".08em" }}>CHAMANDO AGORA</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ fontSize: 34, fontWeight: 800, color: "#0065C4", letterSpacing: "-0.04em", lineHeight: 0.9 }}>A12</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                {op.nome ? (
                  <>
                    <div style={{ fontSize: 11, fontWeight: 700, lineHeight: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Mariana C.</div>
                    <div style={{ fontSize: 6, color: "#64748B", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Manutenção de aparelho</div>
                  </>
                ) : (
                  <div style={{ fontSize: 7, color: "#64748B" }}>Aguarde ser chamado</div>
                )}
              </div>
            </div>
            <div style={{ background: "#0065C4", borderRadius: 5, padding: "3px 6px", color: "#fff", fontSize: 9, fontWeight: 800, alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 3 }}>
              <Icone nome="seta" tam={8} cor="#fff" esp={2.4} />
              Guichê 1
            </div>
          </div>
          {op.proximas && (
            <div style={{ display: "flex", gap: 5 }}>
              {[["MA08", false], ["UR01", true], ["AV03", false]].map(([s, urg]) => (
                <div key={String(s)} style={{ flex: 1, background: "#fff", border: `1px solid ${urg ? "#F5C2C2" : borda}`, borderRadius: 6, padding: "4px 6px", fontSize: 10, fontWeight: 800, color: urg ? "#DC2626" : "#0065C4" }}>{s}</div>
              ))}
            </div>
          )}
          {op.ultimas && (
            <div style={{ flex: 1, minHeight: 0, background: "#fff", border: `1px solid ${borda}`, borderRadius: 8, padding: "6px 7px", display: "flex", flexDirection: "column", minWidth: 0 }}>
              <div style={{ flexShrink: 0, fontSize: 5.5, fontWeight: 700, color: "#64748B", letterSpacing: ".08em" }}>ÚLTIMAS CHAMADAS</div>
              <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", marginTop: 2 }}>
                {[["MA08", "Cons. 1"], ["AV03", "Guichê 2"], ["UR01", "Cons. 3"], ["IN05", "Guichê 1"]].map(([s, d]) => (
                  <div key={s} style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4, borderTop: `1px solid ${borda}`, fontSize: 7, color: "#64748B" }}>
                    <b style={{ color: "#0F172A", flexShrink: 0 }}>{s}</b>
                    <span style={{ textAlign: "right", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
  return (
    <div style={{ width: 384, height: 216, background: "#F5F8FC", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ height: 24, flexShrink: 0, background: "#fff", borderBottom: `1px solid ${borda}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="" width={14} height={14} />
          <div style={{ fontSize: 8, fontWeight: 700 }}>SorriDente</div>
        </div>
        {op.relogio && <div style={{ fontSize: 7, fontWeight: 700 }}>Ter, 23/09 · 14:32</div>}
      </div>
      <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 7, padding: "8px 10px" }}>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ flex: 1, background: "#fff", border: `1px solid ${borda}`, borderRadius: 8, padding: "9px 10px", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 0 }}>
            <div style={{ fontSize: 5.5, fontWeight: 700, color: "#0065C4", letterSpacing: ".08em" }}>CHAMANDO AGORA</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ fontSize: 50, fontWeight: 800, color: "#0065C4", letterSpacing: "-0.04em", lineHeight: 0.9 }}>A12</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {op.nome ? (
                  <>
                    <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1 }}>Mariana C.</div>
                    <div style={{ fontSize: 7, color: "#64748B" }}>Manutenção de aparelho</div>
                  </>
                ) : (
                  <div style={{ fontSize: 8, color: "#64748B" }}>Aguarde ser chamado</div>
                )}
              </div>
            </div>
            <div style={{ background: "#0065C4", borderRadius: 6, padding: "5px 8px", color: "#fff", fontSize: 12, fontWeight: 800, alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 4 }}>
              <Icone nome="seta" tam={10} cor="#fff" esp={2.4} />
              Guichê 1
            </div>
          </div>
          {op.proximas && (
            <div style={{ display: "flex", gap: 5 }}>
              {[["MA08", false], ["UR01", true], ["AV03", false]].map(([s, urg]) => (
                <div key={String(s)} style={{ flex: 1, background: "#fff", border: `1px solid ${urg ? "#F5C2C2" : borda}`, borderRadius: 6, padding: "4px 6px", fontSize: 10, fontWeight: 800, color: urg ? "#DC2626" : "#0065C4" }}>{s}</div>
              ))}
            </div>
          )}
        </div>
        {op.ultimas && (
          <div style={{ width: 100, background: "#fff", border: `1px solid ${borda}`, borderRadius: 8, padding: 7, display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={{ fontSize: 5.5, fontWeight: 700, color: "#64748B", letterSpacing: ".08em" }}>ÚLTIMAS CHAMADAS</div>
            {[["MA08", "Cons. 1"], ["AV03", "Guichê 2"], ["UR01", "Cons. 3"], ["IN05", "Guichê 1"]].map(([s, d]) => (
              <div key={s} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderTop: `1px solid ${borda}`, fontSize: 6.5, color: "#64748B" }}>
                <b style={{ color: "#0F172A" }}>{s}</b>
                {d}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- chat */
export function Bolha({ texto, minha, hora }: { texto: ReactNode; minha?: boolean; hora?: string }) {
  const corpo = (
    <div
      style={{
        maxWidth: "100%", padding: "7px 9px", fontSize: 10.5, lineHeight: 1.4, wordBreak: "break-word",
        ...(minha
          ? { background: "#0065C4", color: "#fff", borderRadius: "12px 12px 3px 12px" }
          : { background: "#fff", color: "#0F172A", borderRadius: "12px 12px 12px 3px", border: "1px solid #E6EAF2" }),
      }}
    >
      {texto}
      {hora && <div style={{ fontSize: 7.5, opacity: 0.7, marginTop: 2, textAlign: "right" }}>{hora}</div>}
    </div>
  );
  if (minha) {
    return <div style={{ alignSelf: "flex-end", maxWidth: "82%", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>{corpo}</div>;
  }
  return (
    <div style={{ alignSelf: "flex-start", maxWidth: "88%", display: "flex", alignItems: "flex-end", gap: 4, minWidth: 0 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.svg" alt="" width={15} height={15} style={{ flexShrink: 0, marginBottom: 1 }} />
      {corpo}
    </div>
  );
}

const TOM_AVISO = { ok: ["#E8F7EE", "#15803D"], info: ["#E6F0FA", "#0058AB"], alerta: ["#FEF3E2", "#B45309"] } as const;

export function AvisoChat({ texto, tom = "info", icone = "seta" }: { texto: string; tom?: keyof typeof TOM_AVISO; icone?: string }) {
  const [bg, fg] = TOM_AVISO[tom];
  return (
    <div style={{ alignSelf: "center", display: "flex", alignItems: "center", gap: 5, padding: "4px 9px", borderRadius: 999, background: bg, color: fg, fontSize: 8.5, fontWeight: 700 }}>
      <Icone nome={icone} tam={10} esp={2.2} />
      {texto}
    </div>
  );
}

export function MiniChat({
  children, nome = "Sorri", sub = "Assistente da clínica · online", canal,
}: { children: ReactNode; nome?: string; sub?: string; canal?: "whatsapp" | "telegram" }) {
  const topo = canal === "whatsapp" ? "#075E54" : canal === "telegram" ? "#229ED9" : "#fff";
  const fundo = canal === "whatsapp" ? "#ECE5DD" : canal === "telegram" ? "#DCE8F3" : "#F5F8FC";
  const claro = !!canal;
  return (
    <div style={{ width: "100%", height: "100%", background: fundo, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ height: 16, flexShrink: 0, background: topo, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 10px" }}>
        <div style={{ fontSize: 6, fontWeight: 700, color: claro ? "rgba(255,255,255,.9)" : "#94A3B8" }}>9:41</div>
        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
          {[0, 1, 2].map((i) => (
            <span key={i} style={{ width: 3, height: 3, borderRadius: 999, background: claro ? "rgba(255,255,255,.9)" : "#CBD5E1" }} />
          ))}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px 9px", background: topo, borderBottom: `1px solid ${claro ? "transparent" : "#E6EAF2"}`, flexShrink: 0 }}>
        <div style={{ width: 26, height: 26, borderRadius: 999, background: claro ? "#fff" : "#EAF3FD", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="" width={18} height={18} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: claro ? "#fff" : "#0F172A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{nome}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 7.5, color: claro ? "rgba(255,255,255,.85)" : "#15803D", minWidth: 0 }}>
            <span style={{ width: 4.5, height: 4.5, borderRadius: 999, background: claro ? "#8CE89E" : "#16A34A", flexShrink: 0 }} />
            <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</span>
          </div>
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 8, padding: "9px 10px", overflow: "hidden" }}>
        <div style={{ alignSelf: "center", flexShrink: 0, fontSize: 7, fontWeight: 600, color: "#64748B", background: "#E9EEF5", padding: "2px 8px", borderRadius: 999 }}>Hoje</div>
        {children}
      </div>
      <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", gap: 6, padding: "0 9px 10px" }}>
        <div style={{ display: "flex", gap: 5 }}>
          {[["agenda", "Ver horários"], ["pessoas", "Falar com atendente"]].map(([ic, t]) => (
            <span key={t} style={{ flex: 1, height: 20, borderRadius: 999, border: "1px solid #B8D4F1", background: "#fff", color: "#0065C4", display: "flex", alignItems: "center", justifyContent: "center", gap: 3, fontSize: 7, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden" }}>
              <Icone nome={ic} tam={9} esp={2.2} />
              {t}
            </span>
          ))}
        </div>
        <div style={{ height: 30, borderRadius: 999, background: "#fff", border: "1px solid #E6EAF2", display: "flex", alignItems: "center", gap: 5, padding: "0 5px 0 11px" }}>
          <span style={{ flex: 1, fontSize: 9.5, color: "#94A3B8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Escreva uma mensagem…</span>
          <span style={{ width: 23, height: 23, borderRadius: 999, background: "#0065C4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icone nome="enviar" tam={12} cor="#fff" esp={2.2} />
          </span>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- QR code ilustrativo */
export function QrCode({ tam = 212, semente = 7 }: { tam?: number; semente?: number }) {
  const n = 29;
  const m = tam / n;
  let s = semente;
  const aleatorio = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  const reservado = (x: number, y: number) =>
    (x < 8 && y < 8) || (x >= n - 8 && y < 8) || (x < 8 && y >= n - 8) || (x >= 11 && x <= 17 && y >= 11 && y <= 17);
  let caminho = "";
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (!reservado(x, y) && aleatorio() < 0.48) caminho += `M${(x * m + 0.3).toFixed(2)} ${(y * m + 0.3).toFixed(2)}h${(m - 0.6).toFixed(2)}v${(m - 0.6).toFixed(2)}h-${(m - 0.6).toFixed(2)}z`;
    }
  }
  const localizador = (cx: number, cy: number) => (
    <g key={`${cx}-${cy}`}>
      <rect x={cx * m} y={cy * m} width={7 * m} height={7 * m} rx={m} fill="#0F172A" />
      <rect x={(cx + 1) * m} y={(cy + 1) * m} width={5 * m} height={5 * m} rx={m * 0.6} fill="#fff" />
      <rect x={(cx + 2) * m} y={(cy + 2) * m} width={3 * m} height={3 * m} rx={m * 0.5} fill="#0F172A" />
    </g>
  );
  return (
    <svg width={tam} height={tam} viewBox={`0 0 ${tam} ${tam}`} role="img" aria-label="QR code para conectar o WhatsApp">
      <path d={caminho} fill="#0F172A" />
      {[localizador(0, 0), localizador(n - 7, 0), localizador(0, n - 7)]}
      <rect x={11.5 * m} y={11.5 * m} width={6 * m} height={6 * m} rx={1.5 * m} fill="#fff" />
      <rect x={12.3 * m} y={12.3 * m} width={4.4 * m} height={4.4 * m} rx={1.2 * m} fill="#25D366" />
    </svg>
  );
}
