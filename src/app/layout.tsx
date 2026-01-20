import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Critix Vault",
  description: "Catálogo local com experiência de streaming",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
