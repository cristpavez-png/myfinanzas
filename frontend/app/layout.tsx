import type { Metadata } from "next";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { AuthProvider } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "MyFinanzas – Gestión inteligente de deudas",
  description:
    "Administra tus deudas personales y distribuye automáticamente las deudas del hogar según los ingresos de cada miembro.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <AntdRegistry>
          <AuthProvider>{children}</AuthProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
