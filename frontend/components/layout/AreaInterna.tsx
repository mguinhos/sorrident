"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRequireRole } from "@/app/providers";
import { api } from "@/lib/api";
import MenuLateral from "./MenuLateral";
import Abertura from "./Abertura";
import Icone from "@/components/ui/Icone";

/** Moldura das áreas autenticadas: protege o perfil e mostra o menu lateral. */
export default function AreaInterna({ perfil, children }: { perfil: "gestor" | "medico"; children: ReactNode }) {
  const user = useRequireRole(perfil);
  const [naoLidas, setNaoLidas] = useState(0);
  const [menuAberto, setMenuAberto] = useState(false);

  useEffect(() => {
    if (!user) return;
    api.listConversations()
      .then((cs) => setNaoLidas(cs.filter((c) => c.unread_for_staff > 0).length))
      .catch(() => setNaoLidas(0));
  }, [user]);

  if (!user) return <Abertura />;
  return (
    <div className="sd-app">
      <MenuLateral perfil={perfil} contadores={{ Conversas: naoLidas }} aberto={menuAberto} aoFechar={() => setMenuAberto(false)} />
      {menuAberto && <div className="sd-veil" onClick={() => setMenuAberto(false)} aria-hidden />}
      <button
        type="button"
        className="sd-hamburguer"
        aria-label="Abrir menu"
        aria-expanded={menuAberto}
        onClick={() => setMenuAberto((v) => !v)}
      >
        <Icone nome="lista" tam={20} />
      </button>
      <div className="sd-principal">{children}</div>
    </div>
  );
}
