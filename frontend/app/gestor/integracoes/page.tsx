"use client";

import Topo, { Conteudo } from "@/components/layout/Topo";
import AtalhoAssistente from "@/components/assistente/AtalhoAssistente";
import IntegrationsTab from "@/components/tabs/IntegrationsTab";
import { Botao } from "@/components/ui";

export default function Integracoes() {
  return (
    <>
      <Topo titulo="Integrações" sub="Canais de mensagem e provedores de IA" acoes={<Botao icone="plugue" href="/configuracao/canais">Conectar WhatsApp ou Telegram</Botao>} />
      <Conteudo>
        <AtalhoAssistente icone="chat" titulo="Conectar canais de mensagem" desc="Passo a passo para WhatsApp (API oficial) e Telegram (bot), com teste da conexão." href="/configuracao/canais" rotulo="Abrir assistente" />
        <IntegrationsTab />
      </Conteudo>
    </>
  );
}
