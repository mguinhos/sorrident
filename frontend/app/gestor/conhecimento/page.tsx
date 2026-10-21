"use client";

import { Tabs } from "antd";
import Topo, { Conteudo } from "@/components/layout/Topo";
import FaqTab from "@/components/tabs/FaqTab";
import KnowledgeTab from "@/components/tabs/KnowledgeTab";

export default function BaseConhecimento() {
  return (
    <>
      <Topo titulo="Base de conhecimento" sub="O que o assistente usa para responder os pacientes" />
      <Conteudo>
        <Tabs
          items={[
            { key: "docs", label: "Documentos", children: <KnowledgeTab /> },
            { key: "faq", label: "Dúvidas frequentes", children: <FaqTab /> },
          ]}
        />
      </Conteudo>
    </>
  );
}
