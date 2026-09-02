"use client";

import { Tabs } from "antd";
import { CalendarOutlined, MessageOutlined, ScheduleOutlined, UserOutlined } from "@ant-design/icons";
import AppShell from "@/components/AppShell";
import AgendaTab from "@/components/tabs/AgendaTab";
import AppointmentsTab from "@/components/tabs/AppointmentsTab";
import ConversationsTab from "@/components/tabs/ConversationsTab";
import PatientsTab from "@/components/tabs/PatientsTab";
import { useRequireRole } from "@/app/providers";

export default function MedicoPage() {
  const user = useRequireRole("medico");
  if (!user) return null;

  return (
    <AppShell title="Área clínica" subtitle={user.display_name} showNotifications>
      <Tabs
        defaultActiveKey="agenda"
        destroyInactiveTabPane
        items={[
          {
            key: "agenda",
            label: "Minha agenda",
            icon: <CalendarOutlined />,
            children: <AgendaTab dentistId={user.linked_id} />,
          },
          {
            key: "appointments",
            label: "Agendamentos",
            icon: <ScheduleOutlined />,
            children: <AppointmentsTab />,
          },
          { key: "patients", label: "Pacientes", icon: <UserOutlined />, children: <PatientsTab /> },
          {
            key: "conversations",
            label: "Conversas",
            icon: <MessageOutlined />,
            children: <ConversationsTab />,
          },
        ]}
      />
    </AppShell>
  );
}
