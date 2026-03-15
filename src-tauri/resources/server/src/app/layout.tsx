import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { MediaProvider } from "@/context/mediaContext";
import { FoldersProvider } from "@/context/foldersContext";

export const metadata: Metadata = {
  title: "Critix Vault",
  description: "Your Local Media Library Manager",
};
const moonjelly = localFont({
  src: [
    {
      path: "./assets/fonts/Moonjelly-Light.otf",
      weight: "300",
      style: "normal",
    },
    {
      path: "./assets/fonts/Moonjelly-Bold.otf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-display",
});

const poppins = Poppins({
  variable: "--font-sans",
  weight: ["200", "300", "400", "500", "600", "700", "800"],
  subsets: ["latin"],
});
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-br" className={`${moonjelly.variable} ${poppins.variable} dark`} style={{ userSelect: "none" }}>
      <FoldersProvider>
        <MediaProvider>
          <body className="antialiased bg-[var(--bg-body)] font-sans">{children}</body>
        </MediaProvider>
      </FoldersProvider>
    </html>
  );
}
