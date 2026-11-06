"use client";

import { useRouter } from "next/navigation";
import ChatPanel from "@/components/ChatPanel";
import MeusAgendamentos from "@/components/MeusAgendamentos";
import Abertura from "@/components/layout/Abertura";
import { Icone } from "@/components/ui";
import { useAuth, useRequireRole } from "@/app/providers";

/** Área do paciente: conversa com o assistente e, na lateral do chat, as próximas consultas. */
export default function ClientePage() {
  const user = useRequireRole("cliente");
  const { logout } = useAuth();
  const router = useRouter();

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
      <Icone nome="sair" tam={16} />
    </button>
  );

  return (
    <div className="sd-cliente">
      <div className="sd-cliente-chat">
        <ChatPanel acaoTopo={sair} lado={<MeusAgendamentos />} />
      </div>
    </div>
  );
}
