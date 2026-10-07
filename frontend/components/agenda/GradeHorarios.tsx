import { Avatar, Icone } from "@/components/ui";
import { hora } from "@/lib/formato";
import type { Appointment } from "@/lib/types";

export const H0 = 8;
export const H1 = 18;
const PX = 64; // pixels por hora

export interface Coluna {
  chave: string;
  titulo: string;
  sub?: string;
  consultas: Appointment[];
  avatar?: boolean;
}

function minutos(a: Appointment): number {
  return Math.max(15, (new Date(a.end).getTime() - new Date(a.start).getTime()) / 60000);
}

function Bloco({ a }: { a: Appointment }) {
  const ini = new Date(a.start);
  const dur = minutos(a);
  const topo = (ini.getHours() - H0 + ini.getMinutes() / 60) * PX;
  const alt = (dur / 60) * PX - 3;
  const urg = /urg/i.test(a.procedure_name);
  const cores = urg
    ? { fundo: "var(--cor-erro-fundo)", borda: "#ef4444", texto: "var(--cor-erro)" }
    : { fundo: "var(--cor-primaria-suave)", borda: "var(--cor-primaria)", texto: "var(--cor-info)" };
  const ok = a.status === "confirmado" ? <span style={{ marginLeft: "auto" }} aria-label="confirmado"><Icone nome="check" tam={13} cor="var(--cor-sucesso)" esp={2.4} /></span> : null;
  const meta = <span style={{ fontSize: 12, fontWeight: 400, color: cores.texto }}>{hora(a.start)} · {a.procedure_name} · {Math.round(dur)} min</span>;
  const curto = alt < 40;
  return (
    <div
      title={`${a.patient_name} — ${a.procedure_name}`}
      style={{
        position: "absolute", left: 8, right: 8, top: topo + 1, height: alt, borderRadius: 10, background: cores.fundo,
        borderLeft: `3px solid ${cores.borda}`, padding: "2px 10px", display: "flex", flexDirection: "column",
        justifyContent: "center", gap: 1, overflow: "hidden", opacity: a.status === "cancelado" ? 0.5 : 1,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: curto ? 8 : 6, fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>
        {a.patient_name}
        {curto && meta}
        {ok}
      </div>
      {!curto && meta}
    </div>
  );
}

/** Grade de horários 08h–18h; blocos proporcionais à duração. Uma coluna por profissional ou por dia. */
export default function GradeHorarios({ colunas }: { colunas: Coluna[] }) {
  const altura = (H1 - H0) * PX;
  const fundo = `repeating-linear-gradient(to bottom, var(--cor-borda) 0 1px, transparent 1px ${PX}px)`;
  return (
    <div className="sd-cartao" style={{ padding: 0, overflow: "auto", flex: 1 }}>
      <div style={{ minWidth: 720 }}>
        <div style={{ display: "flex", borderBottom: "1px solid var(--cor-borda)" }}>
          <div style={{ width: 60, flexShrink: 0 }} />
          {colunas.map((c) => (
            <div key={c.chave} style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderLeft: "1px solid var(--cor-borda)" }}>
              {c.avatar !== false && <Avatar nome={c.titulo} tam={36} />}
              <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.titulo}</div>
                {c.sub && <div style={{ fontSize: 12, color: "var(--cor-suave)" }}>{c.sub}</div>}
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--cor-suave)", background: "var(--cor-fundo)", padding: "4px 8px", borderRadius: 8, whiteSpace: "nowrap" }}>
                {c.consultas.length} {c.consultas.length === 1 ? "consulta" : "consultas"}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", paddingTop: 8 }}>
          <div style={{ width: 60, flexShrink: 0 }}>
            {Array.from({ length: H1 - H0 }, (_, i) => (
              <div key={i} className="sd-num" style={{ height: PX, fontSize: 11, fontWeight: 500, color: "var(--cor-sutil)", textAlign: "right", paddingRight: 10, position: "relative", top: -7 }}>
                {String(H0 + i).padStart(2, "0")}:00
              </div>
            ))}
          </div>
          {colunas.map((c) => (
            <div key={c.chave} style={{ flex: 1, minWidth: 0, position: "relative", height: altura, borderLeft: "1px solid var(--cor-borda)", backgroundImage: fundo }}>
              {c.consultas
                .filter((a) => new Date(a.start).getHours() >= H0 && new Date(a.start).getHours() < H1)
                .map((a) => <Bloco key={a.id} a={a} />)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
