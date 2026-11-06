"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BellOutlined, CalendarOutlined, ScheduleOutlined } from "@ant-design/icons";
import { Button } from "antd";
import { HOME_BY_ROLE, useAuth } from "@/app/providers";
import Transicao from "@/components/layout/Transicao";
import { Icone } from "@/components/ui";

const PILARES = [
  {
    titulo: "Agendamento a qualquer hora",
    texto: "Marque, remarque ou cancele pelo WhatsApp e pelo portal — inclusive fora do horário comercial.",
    icone: ScheduleOutlined,
  },
  {
    titulo: "Horários compatíveis com os dentistas",
    texto: "O assistente consulta a agenda real dos dentistas e só oferece horários livres.",
    icone: CalendarOutlined,
  },
  {
    titulo: "Lembrete antes da consulta",
    texto: "Um aviso 24 horas antes, com confirmação em um toque, para reduzir faltas e espera na recepção.",
    icone: BellOutlined,
  },
];

export default function ApresentacaoPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [abrindo, setAbrindo] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);

  const destino = user ? HOME_BY_ROLE[user.role] : "/chat";

  // deixa a rota pronta antes do clique
  useEffect(() => {
    router.prefetch(destino);
  }, [router, destino]);

  // segura a tela de transição por um instante antes de trocar de rota
  useEffect(() => {
    if (!abrindo) return;
    const id = window.setTimeout(() => router.push(destino), 750);
    return () => window.clearTimeout(id);
  }, [abrindo, destino, router]);

  function abrirAcesso() {
    if (abrindo) return;
    const semAnimacao =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (user || semAnimacao) {
      router.push(destino);
      return;
    }
    setAbrindo(true);
  }

  if (abrindo) return <Transicao mensagem="Abrindo o acesso…" />;

  return (
    <main className="sd-apresentacao">
      <header className="sd-apresentacao-topo">
        <div className="sd-apresentacao-marca">
          <Image src="/logo.svg" alt="" width={40} height={40} priority />
          <strong>SorriDente</strong>
        </div>
        <button
          type="button"
          className="sd-apresentacao-hamburguer"
          aria-label={menuAberto ? "Fechar menu" : "Abrir menu"}
          aria-expanded={menuAberto}
          onClick={() => setMenuAberto((v) => !v)}
        >
          <Icone nome={menuAberto ? "fechar" : "lista"} tam={20} />
        </button>
        <nav className={`sd-apresentacao-atalhos${menuAberto ? " sd-apresentacao-atalhos-aberta" : ""}`} aria-label="Atalhos">
          <Link href="/como-funciona" className="sd-apresentacao-secundario" onClick={() => setMenuAberto(false)}>
            Como funciona
          </Link>
          {!user && (
            <Link href="/login" className="sd-apresentacao-secundario" onClick={() => setMenuAberto(false)}>
              Logar
            </Link>
          )}
        </nav>
      </header>

      <section className="sd-apresentacao-hero">
        <div className="sd-apresentacao-texto">
          <h1>
            Seu sorriso cuidado <em>sem espera</em> na recepção
          </h1>
          <p>
            A SorriDente une ortodontia e atendimento inteligente: um assistente virtual
            conversa com você pelo WhatsApp e pelo portal, encontra o melhor horário na
            agenda dos dentistas e cuida dos lembretes da sua consulta.
          </p>

          <div className="sd-apresentacao-acoes">
            <Button
              type="primary"
              size="large"
              className="sd-apresentacao-cta"
              onClick={abrirAcesso}
              loading={abrindo}
            >
              {user ? "Ir para o painel" : "Falar com o SorriDente"}
            </Button>
          </div>
        </div>

        <div className="sd-apresentacao-cartao" aria-hidden>
          <div className="sd-apresentacao-cartao-topo">
            <Image src="/logo.svg" alt="" width={56} height={56} priority />
            <div>
              <strong>SorriDente</strong>
              <span>Atendimento e gestão da clínica</span>
            </div>
          </div>
          <ul>
            <li>
              <span className="sd-apresentacao-ponto" />
              Agende sua avaliação em minutos
            </li>
            <li>
              <span className="sd-apresentacao-ponto" />
              Confirme a consulta por mensagem
            </li>
            <li>
              <span className="sd-apresentacao-ponto" />
              Tire as suas dúvidas antes de vir
            </li>
          </ul>
          <div className="sd-apresentacao-cartao-rodape">
            <span>Seg a sex · 8h às 18h</span>
            <span>Sábado · 8h às 12h</span>
          </div>
        </div>
      </section>

      <section className="sd-apresentacao-pilares">
        {PILARES.map(({ titulo, texto, icone: IconePilar }) => (
          <article key={titulo} className="sd-apresentacao-pilar">
            <span className="sd-apresentacao-pilar-icone" aria-hidden>
              <IconePilar />
            </span>
            <h2>{titulo}</h2>
            <p>{texto}</p>
          </article>
        ))}
      </section>

      <footer className="sd-apresentacao-rodape">
        <div>
          <strong>SorriDente</strong> · para sua clínica ortodôntica
        </div>
        <div className="sd-apresentacao-lgpd">
          Seus dados são tratados conforme a LGPD.
        </div>
      </footer>
    </main>
  );
}
