"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import ChatPanel from "@/components/ChatPanel";
import MeusAgendamentos from "@/components/MeusAgendamentos";
import { useAuth } from "@/app/providers";
import { Icone } from "@/components/ui";

/** Chat aberto: qualquer visitante conversa com o SorriDente sem cadastro.
 *  O painel lateral lembra que, para ver os agendamentos, é preciso entrar/criar conta. */
export default function ChatPublicoPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && user.role === "cliente") router.replace("/cliente");
  }, [user, router]);

  if (user && user.role === "cliente") return null;

  const sair = (
    <button
      type="button"
      className="sd-sino"
      aria-label="Voltar"
      title="Voltar"
      onClick={() => router.push("/")}
      style={{ width: 36, height: 36 }}
    >
      <Icone nome="esq" tam={16} />
    </button>
  );

  return (
    <div className="sd-cliente">
      <div className="sd-cliente-chat">
        <ChatPanel altura="100%" acaoTopo={sair} lado={<MeusAgendamentos />} />
      </div>
    </div>
  );
}
