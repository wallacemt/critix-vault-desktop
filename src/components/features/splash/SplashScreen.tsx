/**
 * Splash Screen Component
 * Displays logo and checks API status on app startup
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useApiConnectivity } from "@/context/apiConnectivityContext";
import { useFoldersContext } from "@/context/foldersContext";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import Image from "next/image";
import { APP_VERSION } from "@/lib/config";

const MAX_AUTO_RETRIES = 3;
const AUTO_RETRY_DELAY_MS = 2_000;
const AUTO_CONTINUE_OFFLINE_SECONDS = 5;

interface SplashScreenProps {
  onReady: () => void;
}

export function SplashScreen({ onReady }: SplashScreenProps) {
  const { status, isOnline, isChecking, hasChecked, lastError, retryConnection } = useApiConnectivity();
  const { isLoading: foldersLoading } = useFoldersContext();
  const [autoRetryCount, setAutoRetryCount] = useState(0);
  const [autoContinueCountdown, setAutoContinueCountdown] = useState<number | null>(null);
  const hasNavigatedRef = useRef(false);

  const proceedToApp = useCallback(() => {
    if (hasNavigatedRef.current) return;
    hasNavigatedRef.current = true;
    onReady();
  }, [onReady]);

  useEffect(() => {
    if (hasNavigatedRef.current || foldersLoading || !hasChecked || isChecking) return;

    if (!isOnline && autoRetryCount < MAX_AUTO_RETRIES) {
      const timer = setTimeout(() => {
        setAutoRetryCount((prev) => prev + 1);
        retryConnection();
      }, AUTO_RETRY_DELAY_MS);
      return () => clearTimeout(timer);
    }
  }, [isOnline, autoRetryCount, retryConnection, foldersLoading, hasChecked, isChecking]);

  useEffect(() => {
    if (hasNavigatedRef.current || foldersLoading || !hasChecked) return;

    if (isOnline) {
      setAutoContinueCountdown(null);
      const timer = setTimeout(() => {
        proceedToApp();
      }, 1000);
      return () => clearTimeout(timer);
    }

    if (autoRetryCount >= MAX_AUTO_RETRIES && autoContinueCountdown === null) {
      setAutoContinueCountdown(AUTO_CONTINUE_OFFLINE_SECONDS);
    }
  }, [isOnline, autoRetryCount, autoContinueCountdown, foldersLoading, hasChecked, proceedToApp]);

  useEffect(() => {
    if (hasNavigatedRef.current || isOnline || autoContinueCountdown === null) return;

    if (autoContinueCountdown <= 0) {
      proceedToApp();
      return;
    }

    const timer = setTimeout(() => {
      setAutoContinueCountdown((prev) => {
        if (prev === null) return null;
        return prev - 1;
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [autoContinueCountdown, isOnline, proceedToApp]);

  const handleManualRetry = () => {
    setAutoRetryCount(0);
    setAutoContinueCountdown(null);
    retryConnection();
  };

  const handleContinueOffline = () => {
    proceedToApp();
  };

  const isLoading = foldersLoading || !hasChecked || isChecking;

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
          <h1 className="text-4xl font-display text-white mb-2">Critix Vault</h1>
          <p className="text-slate-400">Sua Bliblioteca Local Aprimorada</p>
        </div>

        {/* Status */}
        <div className="flex flex-col items-center gap-4 min-h-[100px]">
          {isLoading && (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              <p className="text-sm text-slate-400">
                {autoRetryCount > 0
                  ? `Tentando reconectar (${autoRetryCount}/${MAX_AUTO_RETRIES})...`
                  : "Verificando conexao com API externa..."}
              </p>
            </div>
          )}

          {!isLoading && isOnline && (
            <div className="flex flex-col items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
              <p className="text-sm text-green-400">Conectado Com Sucesso</p>
            </div>
          )}

          {!isLoading && !isOnline && autoRetryCount < MAX_AUTO_RETRIES && (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
              <p className="text-sm text-slate-400">API externa indisponivel. Tentando novamente...</p>
            </div>
          )}

          {!isLoading && !isOnline && autoRetryCount >= MAX_AUTO_RETRIES && (
            <div className="flex flex-col items-center gap-4 max-w-md">
              <AlertCircle className="w-8 h-8 text-amber-500" />
              <div className="text-center">
                <p className="text-sm text-amber-300 mb-2">Nao foi possivel conectar com a API externa</p>
                <p className="text-xs text-slate-500">{status?.message || lastError || "Sem detalhes adicionais."}</p>
                {autoContinueCountdown !== null && (
                  <p className="text-xs text-slate-400 mt-2">
                    Entrando em modo offline automaticamente em {autoContinueCountdown}s...
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleManualRetry}
                  variant="outline"
                  className="bg-slate-800/50 border-slate-700 hover:bg-slate-800 hover:border-slate-600"
                >
                  Tentar Novamente
                </Button>
                <Button onClick={handleContinueOffline} className="bg-amber-500 text-slate-900 hover:bg-amber-400">
                  Entrar Offline
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Version */}
        <p className="text-xs text-slate-600 absolute bottom-8">{`v${APP_VERSION} • `}</p>
      </div>
    </div>
  );
}
