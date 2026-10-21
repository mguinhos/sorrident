"use client";

import Topo, { Conteudo } from "@/components/layout/Topo";
import ConversationsTab from "@/components/tabs/ConversationsTab";

export default function Conversas() {
  return (
    <>
      <Topo titulo="Conversas" sub="Chat do site, WhatsApp e Telegram em um só lugar" />
      <Conteudo><ConversationsTab /></Conteudo>
    </>
  );
}
