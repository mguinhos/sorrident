"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRequireRole } from "@/app/providers";
import { api } from "@/lib/api";
import MenuLateral from "./MenuLateral";
import Abertura from "./Abertura";

/** Moldura das áreas autenticadas: protege o perfil e mostra o menu lateral. */
export default function AreaInterna({ perfil, children }: { perfil: "gestor" | "medico"; children: ReactNode }) {
  const user = useRequireRole(perfil);
  const [naoLidas, setNaoLidas] = useState(0);

  useEffect(() => {
    if (!user) return;
    api.listConversations()
      .then((cs) => setNaoLidas(cs.filter((c) => c.unread_for_staff > 0).length))
      .catch(() => setNaoLidas(0));
  }, [user]);

  if (!user) return <Abertura />;
  return (
    <div className="sd-app">
      <MenuLateral perfil={perfil} contadores={{ Conversas: naoLidas }} />
      <div className="sd-principal">{children}</div>
    </div>
  );
}
