"use client";

import Topo, { Conteudo } from "@/components/layout/Topo";
import AtalhoAssistente from "@/components/assistente/AtalhoAssistente";
import AgentTab from "@/components/tabs/AgentTab";
import { Botao } from "@/components/ui";

export default function Agente() {
  return (
    <>
      <Topo titulo="Agente" sub="O assistente que responde os pacientes" acoes={<Botao icone="ajustes" href="/configuracao/agente">Configurar o agente</Botao>} />
      <Conteudo>
        <div className="sd-linha sd-linha-quebra">
          <AtalhoAssistente icone="robo" titulo="Persona, modelo, regras e horário" desc="Assistente em 5 passos com conversa de exemplo." href="/configuracao/agente" />
          <AtalhoAssistente icone="plugue" titulo="WhatsApp e Telegram" desc="Leve o assistente para os canais de mensagem." href="/configuracao/canais" rotulo="Conectar canais" />
        </div>
        <AgentTab />
      </Conteudo>
    </>
  );
}
