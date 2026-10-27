"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Avatar, Icone } from "@/components/ui";
import { useAuth } from "@/app/providers";
import type { Role } from "@/lib/types";

interface Item {
  rotulo: string;
  icone: string;
  href: string;
}

const MENUS: Record<"gestor" | "medico", { grupo: string; itens: Item[] }[]> = {
  gestor: [
    { grupo: "Painel", itens: [
      { rotulo: "Visão geral", icone: "inicio", href: "/gestor" },
      { rotulo: "Conversas", icone: "chat", href: "/gestor/conversas" },
    ] },
    { grupo: "Atendimento", itens: [
      { rotulo: "Agenda", icone: "agenda", href: "/gestor/agenda" },
      { rotulo: "Pacientes", icone: "pessoas", href: "/gestor/pacientes" },
      { rotulo: "Orçamentos", icone: "documento", href: "/gestor/orcamentos" },
    ] },
    { grupo: "Financeiro", itens: [
      { rotulo: "Financeiro", icone: "grafico", href: "/gestor/financeiro" },
      { rotulo: "Pagamentos", icone: "cartao", href: "/gestor/pagamentos" },
      { rotulo: "Convênios", icone: "escudo", href: "/gestor/convenios" },
    ] },
    { grupo: "Clínica", itens: [
      { rotulo: "Equipe e serviços", icone: "cracha", href: "/gestor/equipe" },
      { rotulo: "Base de conhecimento", icone: "livro", href: "/gestor/conhecimento" },
    ] },
    { grupo: "Sistema", itens: [
      { rotulo: "Agente", icone: "robo", href: "/gestor/agente" },
      { rotulo: "Integrações", icone: "plugue", href: "/gestor/integracoes" },
      { rotulo: "Configurações", icone: "ajustes", href: "/gestor/configuracoes" },
    ] },
  ],
  medico: [
    { grupo: "Consultório", itens: [
      { rotulo: "Minha agenda", icone: "agenda", href: "/medico" },
      { rotulo: "Pacientes", icone: "pessoas", href: "/medico/pacientes" },
      { rotulo: "Exames", icone: "imagem", href: "/medico/exames" },
      { rotulo: "Conversas", icone: "chat", href: "/medico/conversas" },
    ] },
  ],
};

const PAPEL: Record<Role, string> = { gestor: "Gestor", medico: "Médico(a)", cliente: "Paciente" };

/** Menu lateral único por perfil (gestor ou médico). */
export default function MenuLateral({ perfil, contadores = {} }: { perfil: "gestor" | "medico"; contadores?: Record<string, number> }) {
  const caminho = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();
  const raiz = `/${perfil}`;
  const ativo = (href: string) => (href === raiz ? caminho === raiz : caminho === href || caminho.startsWith(href + "/"));
  const grupoAtivo = (g: { itens: Item[] }) => g.itens.some((it) => ativo(it.href));
  const [abertos, setAbertos] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(MENUS[perfil].map((g) => [g.grupo, g.itens.some((it) => ativo(it.href))])),
  );
  // Acordeão: manter só um grupo aberto evita barra de rolagem e preserva o rodapé.
  const alternar = (grupo: string) =>
    setAbertos((a) => {
      const jaAberto = a[grupo];
      return Object.fromEntries(MENUS[perfil].map((g) => [g.grupo, !jaAberto && g.grupo === grupo]));
    });

  return (
    <nav className="sd-lateral" aria-label="Menu principal">
      <div className="sd-lateral-marca">
        <Image src="/logo.svg" alt="" width={36} height={36} priority />
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <div className="sd-lateral-nome">SorriDente</div>
          <div className="sd-lateral-area">{perfil === "gestor" ? "Gestão da clínica" : "Área clínica"}</div>
        </div>
      </div>
      <div className="sd-lateral-menu">
        {MENUS[perfil].map((g) => {
          const aberto = abertos[g.grupo] ?? grupoAtivo(g);
          return (
            <div key={g.grupo} role="group" aria-label={g.grupo} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <button
                type="button"
                className="sd-lateral-grupo sd-lateral-grupo-btn"
                aria-expanded={aberto}
                onClick={() => alternar(g.grupo)}
              >
                {g.grupo}
                <Icone nome="dir" tam={14} style={{ marginLeft: "auto", transition: "transform .2s", transform: aberto ? "rotate(90deg)" : "none" }} />
              </button>
              {aberto &&
                g.itens.map((it) => (
                  <Link key={it.href} href={it.href} className="sd-item-menu" aria-current={ativo(it.href) ? "page" : undefined}>
                    <Icone nome={it.icone} tam={18} />
                    {it.rotulo}
                    {contadores[it.rotulo] ? <span className="sd-contador">{contadores[it.rotulo]}</span> : null}
                  </Link>
                ))}
            </div>
          );
        })}
      </div>
      <div className="sd-usuario">
        <div className="sd-usuario-dados">
          <Avatar nome={user?.display_name || "?"} tam={34} />
          <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0, flex: 1 }}>
            <div className="sd-usuario-nome">{user?.display_name}</div>
            <div style={{ fontSize: 12, color: "var(--cor-suave)" }}>{user ? PAPEL[user.role] : ""}</div>
          </div>
        </div>
        <button
          type="button"
          className="sd-sair"
          title="Sair da conta"
          onClick={() => {
            logout();
            router.replace("/login");
          }}
        >
          <Icone nome="sair" tam={15} />
          Sair da conta
        </button>
      </div>
    </nav>
  );
}
