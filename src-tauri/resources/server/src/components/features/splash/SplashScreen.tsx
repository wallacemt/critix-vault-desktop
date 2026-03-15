/**
 * Splash Screen Component
 * Displays logo and checks API status on app startup
 */

"use client";

import { useEffect, useState } from "react";
import { useApiStatus } from "@/hooks/useApiStatus";
import { useFoldersContext } from "@/context/foldersContext";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import Image from "next/image";

interface SplashScreenProps {
  onReady: () => void;
}

export function SplashScreen({ onReady }: SplashScreenProps) {
  const { data: status, loading, error, retry } = useApiStatus();
  const {  isLoading: foldersLoading } = useFoldersContext();
  const [autoRetryCount, setAutoRetryCount] = useState(0);

  useEffect(() => {
    // Wait for folders to load
    if (foldersLoading) return;

    // Auto-retry up to 3 times if API is offline
    if (status && !status.online && autoRetryCount < 3) {
      const timer = setTimeout(() => {
        setAutoRetryCount((prev) => prev + 1);
        retry();
      }, 2000);
      return () => clearTimeout(timer);
    }

    // If API is online and folders loaded, proceed after a brief delay
    if (status?.online && !foldersLoading) {
      const timer = setTimeout(() => {
        onReady();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [status, autoRetryCount, retry, onReady, foldersLoading]);

  const handleManualRetry = () => {
    setAutoRetryCount(0);
    retry();
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-on-primary-crx">
      <div className="flex flex-col items-center gap-8 p-8">
        {/* Logo */}
        <div className="relative">
          <div className="relative flex items-center justify-center w-32 h-32 rounded-2xl bg-gradient-to-br ">
            <Image src={"/images/logo-short.png"} alt="App Image" fill />
          </div>
        </div>

        {/* Title */}
        <div className="text-center">
          <h1 className="text-4xl font-display font-bold text-white mb-2">Critix Vault</h1>
          <p className="text-slate-400">Sua Bliblioteca Local Aprimorada</p>
        </div>

        {/* Status */}
        <div className="flex flex-col items-center gap-4 min-h-[100px]">
          {loading && (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              <p className="text-sm text-slate-400">
                {autoRetryCount > 0 ? `Retrying (${autoRetryCount}/3)...` : "Checking API status..."}
              </p>
            </div>
          )}

          {!loading && status?.online && (
            <div className="flex flex-col items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
              <p className="text-sm text-green-400">Conectado Com Sucesso</p>
            </div>
          )}

          {!loading && status && !status.online && autoRetryCount >= 3 && (
            <div className="flex flex-col items-center gap-4 max-w-md">
              <AlertCircle className="w-8 h-8 text-red-500" />
              <div className="text-center">
                <p className="text-sm text-red-400 mb-2">Falha ao estabelecer conexão com Critix API</p>
                <p className="text-xs text-slate-500">{status.message}</p>
              </div>
              <Button
                onClick={handleManualRetry}
                variant="outline"
                className="bg-slate-800/50 border-slate-700 hover:bg-slate-800 hover:border-slate-600"
              >
                Tentar Novamente
              </Button>
            </div>
          )}

          {error && !status && (
            <div className="flex flex-col items-center gap-4 max-w-md">
              <AlertCircle className="w-8 h-8 text-red-500" />
              <div className="text-center">
                <p className="text-sm text-red-400 mb-2">Erro de Conexão</p>
                <p className="text-xs text-slate-500">{error}</p>
              </div>
              <Button
                onClick={handleManualRetry}
                variant="outline"
                className="bg-slate-800/50 border-slate-700 hover:bg-slate-800 hover:border-slate-600"
              >
               Tentar Novamente
              </Button>
            </div>
          )}
        </div>

        {/* Version */}
        <p className="text-xs text-slate-600 absolute bottom-8">{status?.version && `v${status.version} • `}</p>
      </div>
    </div>
  );
}
