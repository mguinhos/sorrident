"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ChatPanel from "@/components/ChatPanel";
import Abertura from "@/components/layout/Abertura";
import { Cartao, Etiqueta, Icone } from "@/components/ui";
import { useAuth, useRequireRole } from "@/app/providers";
import { api } from "@/lib/api";
import type { Appointment } from "@/lib/types";

/** Área do paciente: conversa com o assistente e as próximas consultas. */
export default function ClientePage() {
  const user = useRequireRole("cliente");
  const { logout } = useAuth();
  const router = useRouter();
  const [consultas, setConsultas] = useState<Appointment[]>([]);

  const carregar = useCallback(async () => {
    try {
      const lista = await api.myAppointments();
      setConsultas(Array.isArray(lista) ? lista : []);
    } catch {
      /* o paciente pode ainda não ter cadastro vinculado */
    }
  }, []);

  useEffect(() => {
    if (user) void carregar();
  }, [user, carregar]);

  if (!user) return <Abertura />;

  const sair = (
    <button
      type="button"
      className="sd-sino"
      aria-label="Sair"
      title="Sair"
      onClick={() => {
        logout();
        router.replace("/login");
      }}
    >
      <Icone nome="esq" tam={16} />
    </button>
  );

  return (
    <div className="sd-cliente">
      <div className="sd-cliente-chat">
        <ChatPanel acaoTopo={sair} />
      </div>
      <aside className="sd-cliente-lado" aria-label="Minhas consultas">
        <Cartao titulo="Minhas consultas" acao={<button type="button" className="sd-link" onClick={() => void carregar()}>Atualizar</button>}>
          {consultas.length === 0 ? (
            <div style={{ fontSize: 14, color: "var(--cor-suave)" }}>Nenhuma consulta marcada. Peça um horário no chat.</div>
          ) : (
            consultas.map((c) => (
              <div key={c.id} style={{ display: "flex", gap: 12, alignItems: "center", padding: 12, borderRadius: 12, background: "var(--cor-primaria-suave)" }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "#fff", color: "var(--cor-primaria)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icone nome="agenda" tam={20} />
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>
                    {new Date(c.start).toLocaleString("pt-BR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--cor-suave)" }}>{c.procedure_name} · {c.dentist_name}</div>
                </div>
                <Etiqueta texto={c.status} />
              </div>
            ))
          )}
        </Cartao>
      </aside>
    </div>
  );
}
