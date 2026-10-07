import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { ConfigProvider } from "antd";
import ptBR from "antd/locale/pt_BR";
import { AuthProvider } from "./providers";
import { tema } from "@/lib/tema";
import "./tokens.css";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--fonte-inter", display: "swap" });

export const metadata: Metadata = {
  title: "SorriDente — Clínica Ortodôntica",
  description: "Atendimento e agendamento inteligente da clínica ortodôntica SorriDente.",
  icons: { icon: "/logo.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body>
        <AntdRegistry>
          <ConfigProvider locale={ptBR} theme={tema}>
            <AuthProvider>{children}</AuthProvider>
          </ConfigProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
