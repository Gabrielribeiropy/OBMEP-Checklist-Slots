import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OBMEP – Controle de Lotes",
  description: "Controle das duas etapas de pistolagem dos lotes OBMEP por nível.",
  icons: { icon: "/obmep-favicon.png", shortcut: "/obmep-favicon.png", apple: "/obmep-favicon.png" },
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
