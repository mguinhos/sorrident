"use client";

import Abertura from "@/components/layout/Abertura";
import { useRequireRole } from "@/app/providers";

/** Assistentes de configuração: tela cheia, para o gestor e o médico administrador. */
export default function Layout({ children }: { children: React.ReactNode }) {
  const user = useRequireRole("gestor", "medico");
  if (!user) return <Abertura mensagem="Abrindo a configuração…" />;
  return <>{children}</>;
}
