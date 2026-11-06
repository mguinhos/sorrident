import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { ConfigProvider } from "antd";
import ptBR from "antd/locale/pt_BR";
import { AuthProvider } from "./providers";
import ProgressoRota from "@/components/layout/ProgressoRota";
import { tema } from "@/lib/tema";
import "./tokens.css";
import "./globals.css";
import "./design.css";

const inter = Inter({ subsets: ["latin"], variable: "--fonte-inter", display: "swap" });
const poppins = Poppins({ subsets: ["latin"], variable: "--fonte-poppins", weight: ["400", "500", "600", "700"], display: "swap" });

export const metadata: Metadata = {
  title: "SorriDente — Clínica Ortodôntica",
  description: "Atendimento e agendamento inteligente da clínica ortodôntica SorriDente.",
  icons: { icon: "/logo.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${poppins.variable}`}>
      <head>
        {/* Ícones Material Symbols do fonts.google.com (substituem os SVGs genéricos) */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
        />
      </head>
      <body>
        <ProgressoRota />
        <AntdRegistry>
          <ConfigProvider locale={ptBR} theme={tema}>
            <AuthProvider>{children}</AuthProvider>
          </ConfigProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
