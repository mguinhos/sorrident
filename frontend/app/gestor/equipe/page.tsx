"use client";

import Topo, { Conteudo } from "@/components/layout/Topo";
import TeamTab from "@/components/tabs/TeamTab";
import { Botao } from "@/components/ui";

export default function Equipe() {
  return (
    <>
      <Topo
        titulo="Equipe e serviços"
        sub="Profissionais, agenda de atendimento e procedimentos"
        acoes={<Botao icone="mais" href="/gestor/equipe/novo">Cadastrar profissional</Botao>}
      />
      <Conteudo><TeamTab /></Conteudo>
    </>
  );
}
