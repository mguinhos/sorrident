import type { Metadata } from "next";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { ConfigProvider } from "antd";
import ptBR from "antd/locale/pt_BR";
import { AuthProvider } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "SorriDente — Clínica Ortodôntica",
  description: "Atendimento e agendamento inteligente da clínica ortodôntica SorriDente.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <AntdRegistry>
          <ConfigProvider
            locale={ptBR}
            theme={{
              token: { colorPrimary: "#1677ff", borderRadius: 8, fontSize: 14 },
            }}
          >
            <AuthProvider>{children}</AuthProvider>
          </ConfigProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
