"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "antd";
import {
  BellOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  MessageOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
} from "@ant-design/icons";

const PASSOS = [
  {
    titulo: "Você fala com a SorriDente",
    texto:
      "Pelo WhatsApp ou pelo portal da clínica, sem menu de opções. No primeiro contato aparece o aviso de privacidade e o seu aceite fica registrado, como pede a LGPD.",
    icone: MessageOutlined,
  },
  {
    titulo: "O assistente entende o que você precisa",
    texto:
      "Agendar, remarcar, cancelar ou tirar uma dúvida frequente. Ele interpreta o pedido em linguagem natural e pergunta o que faltar antes de seguir.",
    icone: CheckCircleOutlined,
  },
  {
    titulo: "Ele consulta a agenda real dos dentistas",
    texto:
      "Nada de horário inventado: o assistente lê a agenda de cada profissional e só oferece o que está realmente livre, dentro do funcionamento da clínica.",
    icone: CalendarOutlined,
  },
  {
    titulo: "O horário é confirmado na hora",
    texto:
      "A consulta fica registrada na agenda e você recebe os detalhes do atendimento na mesma conversa.",
    icone: ClockCircleOutlined,
  },
  {
    titulo: "Um lembrete 24 horas antes",
    texto:
      "No dia anterior à consulta o assistente envia o aviso e pede a confirmação — uma resposta basta para confirmar a presença.",
    icone: BellOutlined,
  },
  {
    titulo: "Se precisar, uma pessoa assume",
    texto:
      "Quando o assunto foge do que o assistente resolve, ele transfere a conversa para a equipe da clínica, com todo o histórico junto.",
    icone: TeamOutlined,
  },
];

const REGRAS = [
  {
    titulo: "Horário de atendimento",
    itens: [
      "Segunda a sexta, das 8h às 18h",
      "Sábado, das 8h às 12h",
      "Não funciona em feriados",
    ],
  },
  {
    titulo: "Remarcar ou cancelar",
    itens: [
      "Avise com pelo menos 4 horas de antecedência",
      "Abaixo disso, o caso vai para o atendimento humano",
      "Lembretes são enviados 24 horas antes da consulta",
    ],
  },
];

const NAO_FAZ = [
  "Não toma decisões clínicas",
  "Não processa pagamentos",
  "Não faz ligações de voz",
  "Não faz previsão de comportamento",
];

export default function ComoFuncionaPage() {
  return (
    <main className="sd-como">
      <header className="sd-como-topo">
        <Link href="/" className="sd-como-marca">
          <Image src="/logo.svg" alt="" width={40} height={40} priority />
          <strong>SorriDente</strong>
        </Link>
        <Link href="/" className="sd-como-voltar">
          ← Voltar
        </Link>
      </header>

      <section className="sd-como-cabecalho">
        <h1>Como funciona o atendimento</h1>
        <p>
          Do primeiro “oi” à confirmação da consulta, o caminho é curto: um assistente
          virtual conversa com você pelo WhatsApp e pelo portal, consulta a agenda real
          dos dentistas e cuida dos lembretes. Quando o assunto pede gente, a equipe entra.
        </p>
      </section>

      <ol className="sd-como-passos">
        {PASSOS.map(({ titulo, texto, icone: Icone }, i) => (
          <li key={titulo} className="sd-como-passo">
            <span className="sd-como-numero" aria-hidden>
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="sd-como-passo-conteudo">
              <h2>
                <Icone className="sd-como-passo-icone" aria-hidden />
                {titulo}
              </h2>
              <p>{texto}</p>
            </div>
          </li>
        ))}
      </ol>

      <section className="sd-como-regras">
        {REGRAS.map(({ titulo, itens }) => (
          <article key={titulo} className="sd-como-regra">
            <h2>{titulo}</h2>
            <ul>
              {itens.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <section className="sd-como-limites">
        <div className="sd-como-limites-texto">
          <span className="sd-como-selo">
            <SafetyCertificateOutlined aria-hidden /> Transparência e LGPD
          </span>
          <h2>O que o assistente não faz</h2>
          <p>
            O atendimento automático cuida da agenda e das dúvidas frequentes. Decisões
            clínicas, pagamentos e casos fora do padrão continuam com a equipe da clínica.
          </p>
          <ul>
            {NAO_FAZ.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="sd-como-cta">
          <h2>Pronto para experimentar?</h2>
          <p>Entre no sistema e converse com a SorriDente pelo portal.</p>
          <Link href="/login">
            <Button type="primary" size="large" className="sd-como-cta-botao">
              Experimente o App
            </Button>
          </Link>
        </div>
      </section>

      <footer className="sd-como-rodape">
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
