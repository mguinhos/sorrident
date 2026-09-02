"use client";

import { Tabs } from "antd";
import {
  ApiOutlined,
  CalendarOutlined,
  DashboardOutlined,
  MessageOutlined,
  BookOutlined,
  QuestionCircleOutlined,
  RobotOutlined,
  ScheduleOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import AppShell from "@/components/AppShell";
import AgendaTab from "@/components/tabs/AgendaTab";
import AgentTab from "@/components/tabs/AgentTab";
import AppointmentsTab from "@/components/tabs/AppointmentsTab";
import ConversationsTab from "@/components/tabs/ConversationsTab";
import FaqTab from "@/components/tabs/FaqTab";
import KnowledgeTab from "@/components/tabs/KnowledgeTab";
import IntegrationsTab from "@/components/tabs/IntegrationsTab";
import OverviewTab from "@/components/tabs/OverviewTab";
import PatientsTab from "@/components/tabs/PatientsTab";
import SettingsTab from "@/components/tabs/SettingsTab";
import TeamTab from "@/components/tabs/TeamTab";
import { useRequireRole } from "@/app/providers";

export default function GestorPage() {
  const user = useRequireRole("gestor");
  if (!user) return null;

  return (
    <AppShell title="Painel de gestão" showNotifications>
      <Tabs
        defaultActiveKey="overview"
        destroyInactiveTabPane
        items={[
          { key: "overview", label: "Visão geral", icon: <DashboardOutlined />, children: <OverviewTab /> },
          { key: "conversations", label: "Conversas", icon: <MessageOutlined />, children: <ConversationsTab /> },
          { key: "appointments", label: "Agendamentos", icon: <ScheduleOutlined />, children: <AppointmentsTab /> },
          { key: "agenda", label: "Agenda", icon: <CalendarOutlined />, children: <AgendaTab /> },
          { key: "patients", label: "Pacientes", icon: <UserOutlined />, children: <PatientsTab /> },
          { key: "team", label: "Equipe e serviços", icon: <TeamOutlined />, children: <TeamTab /> },
          { key: "faq", label: "Dúvidas frequentes", icon: <QuestionCircleOutlined />, children: <FaqTab /> },
          { key: "knowledge", label: "Base de conhecimento", icon: <BookOutlined />, children: <KnowledgeTab /> },
          { key: "agent", label: "Agente", icon: <RobotOutlined />, children: <AgentTab /> },
          { key: "integrations", label: "Integrações", icon: <ApiOutlined />, children: <IntegrationsTab /> },
          { key: "settings", label: "Configurações", icon: <SettingOutlined />, children: <SettingsTab /> },
        ]}
      />
    </AppShell>
  );
}
