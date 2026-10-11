import type { Metadata } from "next";
import { Bricolage_Grotesque, DM_Sans } from "next/font/google";
import Providers from "@/components/Providers";
import Footer from "@/components/Footer";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

const sans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Sistema Acadêmico",
  description:
    "Sistema administrativo acadêmico para gestão de alunos, professores, cursos e disciplinas.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="pt-BR"
      className={`${sans.variable} ${display.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Applies a saved theme before the first paint, so nothing flashes. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="font-sans antialiased">
        <Providers>
          {children}
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
