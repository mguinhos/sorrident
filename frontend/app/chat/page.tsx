"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import ChatPanel from "@/components/ChatPanel";
import MeusAgendamentos from "@/components/MeusAgendamentos";
import { Icone } from "@/components/ui";
import { useAuth } from "@/app/providers";

/** Chat aberto: qualquer visitante conversa com o SorriDente sem cadastro.
 *  O painel lateral lembra que, para ver os agendamentos, é preciso entrar/criar conta. */
export default function ChatPublicoPage() {
  const { user } = useAuth();
  const router = useRouter();

  const sair = (
    <button
      type="button"
      className="sd-sino"
      aria-label="Sair"
      title="Sair"
      onClick={() => router.push("/")}
    >
      <Icone nome="sair" tam={16} />
    </button>
  );

  return (
    <div className="sd-cliente">
      <div className="sd-cliente-chat">
        <ChatPanel
          altura="100%"
          acaoTopo={
            user ? (
              <Link href="/cliente" className="sd-link" title="Minha área" aria-label="Minha área">
                <Icone nome="pessoas" tam={18} />
              </Link>
            ) : (
              sair
            )
          }
          lado={<MeusAgendamentos />}
        />
      </div>
    </div>
  );
}
