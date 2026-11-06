"use client";

import { Alert } from "antd";
import Topo, { Conteudo } from "@/components/layout/Topo";
import AtalhoAssistente from "@/components/assistente/AtalhoAssistente";
import SettingsTab from "@/components/tabs/SettingsTab";

/** Seção do gestor dentro da área médica: configurações administrativas da clínica. */
export default function ConfiguracoesAdministrador() {
  return (
    <>
      <Topo
        migalha={["Gestor", "Administrador"]}
        titulo="Configurações de Administrador"
        sub="Dados da clínica, quiosque, painel de senha e expediente"
      />
      <Conteudo>
        <Alert
          type="info"
          showIcon
          message="Área do gestor"
          description="Estas configurações valem para toda a clínica. Alterações aqui afetam a agenda, o quiosque e o atendimento dos pacientes."
        />
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
