"use client";

import Abertura from "@/components/layout/Abertura";
import { useRequireRole } from "@/app/providers";

/** Assistentes de configuração: tela cheia, só para o gestor. */
export default function Layout({ children }: { children: React.ReactNode }) {
  const user = useRequireRole("gestor");
  if (!user) return <Abertura mensagem="Abrindo a configuração…" />;
  return <>{children}</>;
}
