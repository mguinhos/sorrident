"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Spin } from "antd";
import { Etiqueta, Icone } from "@/components/ui";
import { useAuth } from "@/app/providers";
import { api } from "@/lib/api";
import type { Appointment } from "@/lib/types";

/** Painel "Meus agendamentos" exibido na lateral do chatbot.
 *
 * Regras:
 * - Visitante (sem login): aviso pedindo cadastro/acesso — o chat continua livre.
 * - Cliente logado sem consultas: aviso de que ainda não há agendamentos.
 * - Cliente logado com consultas: lista as próximas consultas.
 */
export default function MeusAgendamentos() {
  const { user } = useAuth();
  const [consultas, setConsultas] = useState<Appointment[]>([]);
  const [carregando, setCarregando] = useState(false);

  const logado = Boolean(user && user.role === "cliente");

  const carregar = useCallback(async () => {
    if (!logado) return;
    setCarregando(true);
    try {
      const lista = await api.myAppointments();
      setConsultas(Array.isArray(lista) ? lista : []);
    } catch {
      setConsultas([]);
    } finally {
      setCarregando(false);
    }
  }, [logado]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  return (
    <aside className="sd-agendamentos" aria-label="Meus agendamentos">
      <div className="sd-agendamentos-titulo">
        <span>Meus agendamentos</span>
        {logado && (
          <button type="button" className="sd-link" onClick={() => void carregar()} aria-label="Atualizar agendamentos">
            <Icone nome="atualizar" tam={16} />
          </button>
        )}
      </div>

      {!logado ? (
        <div className="sd-agendamentos-aviso">
          <Icone nome="cadeado" tam={28} cor="var(--cor-suave)" />
          <p>
            <b>Você ainda não está logado.</b>
          </p>
          <p>
            O chat é livre e não precisa de cadastro. Para acompanhar suas consultas aqui no painel,
            entre ou crie sua conta.
          </p>
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <Link href="/login" className="sd-agendamentos-botao">Entrar</Link>
            <Link href="/cadastro" className="sd-agendamentos-botao sd-agendamentos-botao-secundario">Criar conta</Link>
          </div>
        </div>
      ) : carregando ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 32 }}>
          <Spin />
        </div>
      ) : consultas.length === 0 ? (
        <div className="sd-agendamentos-aviso">
          <Icone nome="agenda" tam={28} cor="var(--cor-suave)" />
          <p>
            <b>Nenhuma consulta marcada.</b>
          </p>
          <p>Peça um horário aqui no chat e ele aparecerá neste painel — a confirmação também chega por e-mail.</p>
        </div>
      ) : (
        <div className="sd-agendamentos-lista">
          {consultas.map((c) => (
            <div key={c.id} className="sd-agendamentos-item">
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "#fff", color: "var(--cor-primaria)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icone nome="agenda" tam={20} />
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 700 }}>
                  {new Date(c.start).toLocaleString("pt-BR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </div>
                <div style={{ fontSize: 12.5, color: "var(--cor-suave)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {c.procedure_name || "Consulta"} · {c.dentist_name || "Equipe SorriDente"}
                </div>
              </div>
              <Etiqueta texto={c.status} />
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
