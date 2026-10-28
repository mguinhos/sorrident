"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BellOutlined, CalendarOutlined, ScheduleOutlined } from "@ant-design/icons";
import { Button } from "antd";
import { HOME_BY_ROLE, useAuth } from "@/app/providers";
import Transicao from "@/components/layout/Transicao";

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
  const { user, loading } = useAuth();
  const router = useRouter();
  const [abrindo, setAbrindo] = useState(false);

  const destino = user ? HOME_BY_ROLE[user.role] : "/login";

  // quem já tem sessão aberta vai direto para o seu painel
  useEffect(() => {
    if (!loading && user) router.replace(HOME_BY_ROLE[user.role]);
  }, [loading, user, router]);

  // deixa o login pronto antes do clique
  useEffect(() => {
    router.prefetch("/login");
  }, [router]);

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
              {user ? "Ir para o painel" : "Experimente o App"}
            </Button>
            <Link href="/como-funciona" className="sd-apresentacao-secundario">
              Como funciona
            </Link>
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
        {PILARES.map(({ titulo, texto, icone: Icone }) => (
          <article key={titulo} className="sd-apresentacao-pilar">
            <span className="sd-apresentacao-pilar-icone" aria-hidden>
              <Icone />
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
