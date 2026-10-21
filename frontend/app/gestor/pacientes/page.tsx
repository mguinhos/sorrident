"use client";

import Topo, { Conteudo } from "@/components/layout/Topo";
import PatientsTab from "@/components/tabs/PatientsTab";

export default function PacientesGestor() {
  return (
    <>
      <Topo titulo="Pacientes" sub="Cadastro, ficha e histórico de consultas" />
      <Conteudo><PatientsTab /></Conteudo>
    </>
  );
}
