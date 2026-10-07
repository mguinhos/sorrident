"use client";

import Topo, { Conteudo } from "@/components/layout/Topo";
import PatientsTab from "@/components/tabs/PatientsTab";

export default function PacientesMedico() {
  return (
    <>
      <Topo titulo="Pacientes" sub="Abra o prontuário para ver odontograma e evoluções" />
      <Conteudo><PatientsTab prontuarioBase="/medico/pacientes" /></Conteudo>
    </>
  );
}
