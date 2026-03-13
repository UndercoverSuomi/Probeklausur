import type { Metadata } from "next";
import { Source_Serif_4, DM_Sans, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-serif",
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Probeklausur",
  description:
    "AI-powered practice exam platform for rigorous academic preparation.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="de"
      className={`${sourceSerif.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}
    >
      <body className="grain-overlay min-h-screen font-sans antialiased">
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            className: "font-sans",
            style: {
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border)",
              background: "var(--color-surface)",
              color: "var(--color-ink)",
            },
          }}
        />
      </body>
    </html>
  );
}
