"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Segmented } from "antd";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import Topo, { Conteudo } from "@/components/layout/Topo";
import GradeHorarios, { type Coluna } from "@/components/agenda/GradeHorarios";
import NovoAgendamento from "@/components/agenda/NovoAgendamento";
import AgendaTab from "@/components/tabs/AgendaTab";
import { Botao, Icone } from "@/components/ui";
import { api } from "@/lib/api";
import type { Appointment, Dentist } from "@/lib/types";

dayjs.locale("pt-br");

type Visao = "Dia" | "Semana" | "Mês";

function Legenda({ cor, texto }: { cor: string; texto: string }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--cor-suave)" }}>
      <span style={{ width: 10, height: 10, borderRadius: 3, background: cor }} />
      {texto}
    </span>
  );
}

/** Agenda do dia: grade 08h–18h por profissional, blocos proporcionais à duração. */
export default function AgendaPage() {
  const [dia, setDia] = useState(dayjs());
  const [visao, setVisao] = useState<Visao>("Dia");
  const [consultas, setConsultas] = useState<Appointment[]>([]);
  const [dentistas, setDentistas] = useState<Dentist[]>([]);
  const [novo, setNovo] = useState(false);

  const inicio = visao === "Semana" ? dia.startOf("week") : dia;
  const carregar = useCallback(async () => {
    try {
      const [a, d] = await Promise.all([api.agenda(inicio.format("YYYY-MM-DD"), visao === "Semana" ? 7 : 1), api.listDentists(true)]);
      setConsultas(a.filter((x) => x.status !== "cancelado"));
      setDentistas(d);
    } catch {
      setConsultas([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inicio.format("YYYY-MM-DD"), visao]);

  useEffect(() => {
    if (visao !== "Mês") void carregar();
  }, [carregar, visao]);

  const colunas: Coluna[] = useMemo(() => {
    if (visao === "Semana") {
      return Array.from({ length: 7 }, (_, i) => {
        const d = inicio.add(i, "day");
        const titulo = d.format("ddd, D/MM");
        return {
          chave: d.format("YYYY-MM-DD"),
          titulo: titulo.charAt(0).toUpperCase() + titulo.slice(1),
          consultas: consultas.filter((a) => dayjs(a.start).isSame(d, "day")),
          avatar: false,
        };
      }).filter((c) => c.consultas.length || dayjs(c.chave).day() !== 0);
    }
    const doDia = consultas.filter((a) => dayjs(a.start).isSame(dia, "day"));
    const ids = dentistas.length ? dentistas.map((d) => d.id) : Array.from(new Set(doDia.map((a) => a.dentist_id)));
    return ids.map((id) => {
      const d = dentistas.find((x) => x.id === id);
      const lista = doDia.filter((a) => a.dentist_id === id);
      return { chave: id, titulo: d?.name ?? lista[0]?.dentist_name ?? "Profissional", sub: d?.specialty, consultas: lista };
    });
  }, [visao, consultas, dentistas, dia, inicio]);

  const total = colunas.reduce((n, c) => n + c.consultas.length, 0);
  const passo = visao === "Semana" ? "week" : "day";
  const rotulo = visao === "Semana"
    ? `Semana de ${inicio.format("D [de] MMMM")}`
    : dia.format("dddd, D [de] MMMM").replace(/^./, (c) => c.toUpperCase()).replace("-feira", "");

  return (
    <>
      <Topo
        titulo="Agenda"
        sub={visao === "Mês" ? "Visão do mês" : `${total} ${total === 1 ? "consulta" : "consultas"} · ${dentistas.length} profissionais`}
        acoes={
          <>
            <Botao tipo="secundario" icone="busca" onClick={() => setNovo(true)}>Buscar horário livre</Botao>
            <Botao icone="mais" onClick={() => setNovo(true)}>Novo agendamento</Botao>
          </>
        }
      />
      <Conteudo gap={16}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {visao !== "Mês" && (
              <>
                <button type="button" className="sd-sino" style={{ width: 36, height: 36 }} aria-label="Anterior" onClick={() => setDia(dia.subtract(1, passo))}>
                  <Icone nome="esq" tam={16} />
                </button>
                <button type="button" className="sd-sino" style={{ width: 36, height: 36 }} aria-label="Próximo" onClick={() => setDia(dia.add(1, passo))}>
                  <Icone nome="dir" tam={16} />
                </button>
                <div style={{ fontSize: 18, fontWeight: 700, padding: "0 8px" }} aria-live="polite">{rotulo}</div>
                <Botao tipo="suave" tam="P" onClick={() => setDia(dayjs())}>Hoje</Botao>
              </>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <Legenda cor="var(--cor-primaria)" texto="Consulta" />
            <Legenda cor="#ef4444" texto="Urgência" />
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--cor-suave)" }}>
              <Icone nome="check" tam={13} cor="var(--cor-sucesso)" esp={2.4} />Confirmado
            </span>
            <Segmented<Visao> value={visao} onChange={setVisao} options={["Dia", "Semana", "Mês"]} aria-label="Visão da agenda" />
          </div>
        </div>
        {visao === "Mês" ? <AgendaTab /> : <GradeHorarios colunas={colunas} />}
      </Conteudo>
      <NovoAgendamento aberto={novo} aoFechar={() => setNovo(false)} aoCriar={() => void carregar()} diaInicial={dia} />
    </>
  );
}
