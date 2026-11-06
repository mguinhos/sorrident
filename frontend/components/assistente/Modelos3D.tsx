import type { ReactNode } from "react";
import Icone from "@/components/ui/Icone";
import type { Tom } from "@/components/ui";

/** Totem de autoatendimento: prévia chapada (sem rotação 3D) para o texto ficar nítido. */
export function Totem3D({ tela, selo, retrato = true }: { tela: ReactNode; selo?: ReactNode; retrato?: boolean }) {
  const telaW = retrato ? 224 : 400;
  const telaH = retrato ? 380 : 250;
  return (
    <div role="img" aria-label={retrato ? "Totem do quiosque de senha, em pé" : "Tablet do quiosque deitado no balcão"} style={{ position: "relative", width: 440, height: 580, maxWidth: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end" }}>
      <div style={{ position: "absolute", left: "50%", bottom: 6, width: 310, height: 80, marginLeft: -155, borderRadius: "50%", background: "radial-gradient(closest-side, rgba(15,40,80,.22), rgba(15,40,80,0))" }} />
      <div style={{ position: "relative", zIndex: 2, width: telaW, height: telaH, background: "#1E293B", borderRadius: 18, padding: 12, boxShadow: "0 26px 55px rgba(4,22,64,.30)", transition: "none" }}>
        <div style={{ width: "100%", height: "100%", borderRadius: 8, overflow: "hidden", boxShadow: "inset 0 0 0 1px rgba(255,255,255,.08)" }}>{tela}</div>
      </div>
      <div style={{ position: "relative", zIndex: 1, width: retrato ? 46 : 90, height: 150, background: "#CBD5E1", borderRadius: "0 0 8px 8px", boxShadow: "inset -10px 0 0 rgba(148,163,184,.35)" }} />
      <div style={{ position: "relative", zIndex: 1, width: retrato ? 200 : 280, height: 18, background: "#E2E8F0", borderRadius: 6, boxShadow: "inset 0 5px 0 rgba(203,213,225,.8)" }} />
      {selo && <div style={{ position: "absolute", left: 24, bottom: 56, zIndex: 6 }}>{selo}</div>}
    </div>
  );
}

/** TV da sala de espera: prévia chapada (sem rotação 3D) para o texto ficar nítido. */
export function TV3D({ tela, selo, retrato = false }: { tela: ReactNode; selo?: ReactNode; retrato?: boolean }) {
  const telaW = retrato ? 233 : 400;
  const telaH = retrato ? 400 : 233;
  return (
    <div role="img" aria-label={retrato ? "Monitor em pé com o painel de chamada" : "TV da sala de espera com o painel de chamada"} style={{ position: "relative", width: 460, height: retrato ? 560 : 440, maxWidth: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end" }}>
      <div style={{ position: "absolute", left: "50%", bottom: 6, width: 340, height: 74, marginLeft: -170, borderRadius: "50%", background: "radial-gradient(closest-side, rgba(15,40,80,.22), rgba(15,40,80,0))" }} />
      <div style={{ position: "relative", zIndex: 2, width: telaW, height: telaH, background: "#0F172A", borderRadius: 10, padding: 8, boxShadow: "0 26px 55px rgba(4,22,64,.30)" }}>
        <div style={{ width: "100%", height: "100%", borderRadius: 3, overflow: "hidden" }}>{tela}</div>
      </div>
      <div style={{ position: "relative", zIndex: 1, width: 34, height: 70, background: "#94A3B8", borderRadius: "0 0 4px 4px", boxShadow: "inset -6px 0 0 rgba(100,116,139,.3)" }} />
      <div style={{ position: "relative", zIndex: 1, width: 200, height: 10, background: "#CBD5E1", borderRadius: 4, boxShadow: "inset 0 3px 0 rgba(148,163,184,.5)" }} />
      {selo && <div style={{ position: "absolute", left: 16, bottom: 24, zIndex: 6 }}>{selo}</div>}
    </div>
  );
}

/** Celular chapado (sem rotação 3D), para prévias de conversa. */
export function Celular3D({ tela, selo }: { tela: ReactNode; selo?: ReactNode }) {
  const telaW = 244;
  const telaH = 500;
  return (
    <div role="img" aria-label="Celular com a conversa de exemplo" style={{ position: "relative", width: 400, height: 580, maxWidth: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", transform: "translateY(20px)" }}>
      <div style={{ position: "absolute", left: "50%", bottom: 10, width: 250, height: 66, marginLeft: -125, borderRadius: "50%", background: "radial-gradient(closest-side, rgba(15,40,80,.22), rgba(15,40,80,0))" }} />
      <div style={{ position: "relative", zIndex: 2, width: telaW, height: telaH, background: "#0F172A", borderRadius: 32, padding: 9, boxShadow: "0 26px 55px rgba(4,22,64,.30)", transition: "none" }}>
        <div style={{ width: "100%", height: "100%", borderRadius: 24, overflow: "hidden", boxShadow: "inset 0 0 0 1px rgba(255,255,255,.08)" }}>{tela}</div>
        <div style={{ position: "absolute", top: 4, left: "50%", width: 58, height: 9, transform: "translateX(-50%)", borderRadius: 999, background: "#0F172A" }} />
      </div>
      <div style={{ position: "absolute", right: 72, top: 152, width: 4, height: 46, borderRadius: 999, background: "#334155", zIndex: 3 }} />
      <div style={{ position: "absolute", right: 72, top: 212, width: 4, height: 46, borderRadius: 999, background: "#334155", zIndex: 3 }} />
      {selo && <div style={{ position: "absolute", left: 6, bottom: 60, zIndex: 6 }}>{selo}</div>}
    </div>
  );
}

const TONS: Record<Tom, [string, string]> = {
  ok: ["var(--cor-sucesso-fundo)", "var(--cor-sucesso)"],
  info: ["var(--cor-info-fundo)", "var(--cor-info)"],
  alerta: ["var(--cor-alerta-fundo)", "var(--cor-alerta)"],
  erro: ["var(--cor-erro-fundo)", "var(--cor-erro)"],
  neutro: ["var(--cor-neutro-fundo)", "var(--cor-neutro)"],
};

export function SeloFlutuante({ texto, icone = "check", tom = "ok" }: { texto?: string; icone?: string; tom?: Tom }) {
  const [bg, fg] = TONS[tom];
  if (!texto) {
    return (
      <span style={{ width: 26, height: 26, borderRadius: 999, background: bg, color: fg, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 16px rgba(15,23,42,.22)", border: "2px solid #fff" }}>
        <Icone nome={icone} tam={15} esp={2.4} />
      </span>
    );
  }
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 12, background: "#fff", boxShadow: "0 8px 24px rgba(15,23,42,.12)", fontSize: 13, fontWeight: 700 }}>
      <span style={{ width: 24, height: 24, borderRadius: 999, background: bg, color: fg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icone nome={icone} tam={14} esp={2.4} />
      </span>
      {texto}
    </div>
  );
}
