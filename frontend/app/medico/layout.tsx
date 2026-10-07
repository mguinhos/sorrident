import AreaInterna from "@/components/layout/AreaInterna";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AreaInterna perfil="medico">{children}</AreaInterna>;
}
