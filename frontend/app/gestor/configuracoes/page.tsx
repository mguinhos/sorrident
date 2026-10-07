"use client";

import Topo, { Conteudo } from "@/components/layout/Topo";
import AtalhoAssistente from "@/components/assistente/AtalhoAssistente";
import SettingsTab from "@/components/tabs/SettingsTab";

export default function Configuracoes() {
  return (
    <>
      <Topo titulo="Configurações" sub="Dados da clínica, quiosque, painel de senha e expediente" />
      <Conteudo>
        <div className="sd-linha sd-linha-quebra">
          <AtalhoAssistente icone="predio" titulo="Primeiro acesso e quiosque" desc="Dados da clínica, aparência do quiosque e tipos de atendimento." href="/configuracao/primeiro-acesso" />
          <AtalhoAssistente icone="tv" titulo="Painel de senha" desc="TV da sala de espera: o que mostrar e como a chamada soa." href="/configuracao/painel-de-senha" />
          <AtalhoAssistente icone="robo" titulo="Agente" desc="Persona, modelo, regras e horário do assistente." href="/configuracao/agente" />
        </div>
        <SettingsTab />
      </Conteudo>
    </>
  );
}
