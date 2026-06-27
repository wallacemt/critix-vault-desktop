import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { MediaProvider } from "@/context/mediaContext";
import { FoldersProvider } from "@/context/foldersContext";
import { ApiConnectivityProvider } from "@/context/apiConnectivityContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { OfflineStatusBanner } from "@/components/ui/offline-status-banner";

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-br" className={`${moonjelly.variable} dark`} style={{ userSelect: "none" }}>
      <FoldersProvider>
        <ApiConnectivityProvider>
          <TooltipProvider>
            <MediaProvider>
              <body className="antialiased bg-[var(--bg-body)] font-sans">
                <OfflineStatusBanner />
                {children}
              </body>
            </MediaProvider>
          </TooltipProvider>
        </ApiConnectivityProvider>
      </FoldersProvider>
    </html>
  );
}
