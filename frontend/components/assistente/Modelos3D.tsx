import type { CSSProperties, ReactNode } from "react";
import Icone from "@/components/ui/Icone";
import type { Tom } from "@/components/ui";

/** Escurece/clareia uma cor hex (sombreamento das faces). */
function sombrear(hex: string, f: number): string {
  const n = hex.replace("#", "");
  const c = [0, 2, 4].map((i) => Math.max(0, Math.min(255, Math.round(parseInt(n.slice(i, i + 2), 16) * f))));
  return `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

interface CaixaProps {
  w: number;
  h: number;
  d: number;
  cor: string;
  x?: number;
  y?: number;
  z?: number;
  frente?: ReactNode;
  raio?: number;
}

/** Paralelepípedo com 6 faces (preserve-3d), centrado em (x, y, z). */
function Caixa({ w, h, d, cor, x = 0, y = 0, z = 0, frente, raio = 0 }: CaixaProps) {
  const faces: [number, number, string, string, ReactNode?][] = [
    [w, h, `translateZ(${d / 2}px)`, cor, frente],
    [w, h, `rotateY(180deg) translateZ(${d / 2}px)`, sombrear(cor, 0.7)],
    [d, h, `rotateY(90deg) translateZ(${w / 2}px)`, sombrear(cor, 0.78)],
    [d, h, `rotateY(-90deg) translateZ(${w / 2}px)`, sombrear(cor, 0.9)],
    [w, d, `rotateX(90deg) translateZ(${h / 2}px)`, sombrear(cor, 1.06)],
    [w, d, `rotateX(-90deg) translateZ(${h / 2}px)`, sombrear(cor, 0.6)],
  ];
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 0, height: 0, transformStyle: "preserve-3d", transform: `translate3d(${x}px,${y}px,${z}px)` }}>
      {faces.map(([fw, fh, tr, bg, conteudo], i) => (
        <div
          key={i}
          style={{ position: "absolute", left: -fw / 2, top: -fh / 2, width: fw, height: fh, background: bg, transform: tr, borderRadius: raio, overflow: "hidden", backfaceVisibility: "hidden" }}
        >
          {conteudo}
        </div>
      ))}
    </div>
  );
}

interface CenaProps {
  children: ReactNode;
  rx: number;
  ry: number;
  largura: number;
  altura: number;
  sombra: [number, number, number];
  escala?: number;
  dy?: number;
  selo?: ReactNode;
  seloStyle?: CSSProperties;
  rotulo: string;
}

/** Palco com perspectiva e sombra no chão. */
function Cena({ children, rx, ry, largura, altura, sombra, escala = 1, dy = 0, selo, seloStyle, rotulo }: CenaProps) {
  const [sw, sh, sy] = sombra;
  return (
    <div role="img" aria-label={rotulo} style={{ position: "relative", width: largura, height: altura, maxWidth: "100%" }}>
      <div
        style={{ position: "absolute", left: "50%", top: "50%", width: sw, height: sh, marginLeft: -sw / 2, marginTop: (sy + dy / escala) * escala - sh / 2, borderRadius: "50%", background: "radial-gradient(closest-side, rgba(15,40,80,.22), rgba(15,40,80,0))" }}
      />
      <div style={{ position: "absolute", left: "50%", top: "50%", width: 0, height: 0, perspective: 1800 }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: 0, height: 0, transformStyle: "preserve-3d", transform: `translateY(${dy}px) scale(${escala}) rotateX(${rx}deg) rotateY(${ry}deg)` }}>
          {children}
        </div>
      </div>
      {selo && <div style={{ position: "absolute", left: 24, zIndex: 6, ...seloStyle }}>{selo}</div>}
    </div>
  );
}

/** Totem de autoatendimento em 3D, com a tela do quiosque. */
export function Totem3D({ tela, selo }: { tela: ReactNode; selo?: ReactNode }) {
  const moldura = (
    <div style={{ position: "absolute", inset: 0, padding: 12, background: "#1E293B", borderRadius: 16 }}>
      <div style={{ width: "100%", height: "100%", borderRadius: 6, overflow: "hidden", boxShadow: "inset 0 0 0 1px rgba(255,255,255,.08)" }}>{tela}</div>
    </div>
  );
  return (
    <Cena rx={-10} ry={-22} largura={420} altura={560} sombra={[300, 80, 236]} escala={0.9} dy={40} selo={selo} seloStyle={{ bottom: 64 }} rotulo="Totem do quiosque de senha">
      <Caixa w={224} h={380} d={26} cor="#334155" y={-120} frente={moldura} raio={16} />
      <Caixa w={46} h={150} d={36} cor="#CBD5E1" y={140} z={-4} />
      <Caixa w={190} h={18} d={130} cor="#E2E8F0" y={222} raio={4} />
    </Cena>
  );
}

/** TV da sala de espera em 3D, com a miniatura do painel. */
export function TV3D({ tela, selo }: { tela: ReactNode; selo?: ReactNode }) {
  const moldura = (
    <div style={{ position: "absolute", inset: 0, padding: 8, background: "#0F172A", borderRadius: 10 }}>
      <div style={{ width: "100%", height: "100%", borderRadius: 3, overflow: "hidden" }}>{tela}</div>
    </div>
  );
  return (
    <Cena rx={-8} ry={-26} largura={470} altura={440} sombra={[360, 70, 136]} selo={selo} seloStyle={{ bottom: 40 }} rotulo="TV da sala de espera com o painel de chamada">
      <Caixa w={400} h={233} d={16} cor="#1E293B" y={-60} frente={moldura} raio={10} />
      <Caixa w={34} h={70} d={14} cor="#94A3B8" y={88} z={-6} />
      <Caixa w={200} h={10} d={90} cor="#CBD5E1" y={128} raio={4} />
    </Cena>
  );
}

/** Celular em 3D, para prévias de conversa. */
export function Celular3D({ tela, selo }: { tela: ReactNode; selo?: ReactNode }) {
  const moldura = (
    <div style={{ position: "absolute", inset: 0, padding: 9, background: "#0F172A", borderRadius: 30 }}>
      <div style={{ width: "100%", height: "100%", borderRadius: 22, overflow: "hidden" }}>{tela}</div>
    </div>
  );
  return (
    <Cena rx={-6} ry={-24} largura={420} altura={560} sombra={[240, 60, 236]} selo={selo} seloStyle={{ bottom: 64 }} rotulo="Celular com a conversa de exemplo">
      <Caixa w={230} h={448} d={16} cor="#1E293B" y={-10} frente={moldura} raio={30} />
    </Cena>
  );
}

const TONS: Record<Tom, [string, string]> = {
  ok: ["var(--cor-sucesso-fundo)", "var(--cor-sucesso)"],
  info: ["var(--cor-info-fundo)", "var(--cor-info)"],
  alerta: ["var(--cor-alerta-fundo)", "var(--cor-alerta)"],
  erro: ["var(--cor-erro-fundo)", "var(--cor-erro)"],
  neutro: ["var(--cor-neutro-fundo)", "var(--cor-neutro)"],
};

export function SeloFlutuante({ texto, icone = "check", tom = "ok" }: { texto: string; icone?: string; tom?: Tom }) {
  const [bg, fg] = TONS[tom];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 12, background: "#fff", boxShadow: "0 8px 24px rgba(15,23,42,.12)", fontSize: 13, fontWeight: 700 }}>
      <span style={{ width: 24, height: 24, borderRadius: 999, background: bg, color: fg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icone nome={icone} tam={14} esp={2.4} />
      </span>
      {texto}
    </div>
  );
}
