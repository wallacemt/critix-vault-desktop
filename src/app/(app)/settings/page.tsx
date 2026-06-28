"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  ArrowUpRight,
  Database,
  FolderOpen,
  Film,
  Tv,
  Trash2,
  Download,
  Upload,
  RefreshCw,
  HardDrive,
  AlertTriangle,
  CheckCircle2,
  Eye,
  BarChart3,
  Shield,
  Info,
  Clock,
  FileJson,
  Library,
  Play,
  Magnet,
  Keyboard,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { AppSettings } from "@/services/tauri";
import type { PreferredPlayer } from "@/services/tauri";
import Link from "next/link";
import { motion } from "framer-motion";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { tauriService } from "@/services/tauri";
import { openExternalLink } from "@/lib/external-link";
import { APP_VERSION } from "@/lib/config";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

interface DbInfo {
  dbPath: string;
  dbSize: number;
  dataDirectory: string;
  transcodeSize?: number;
  counts: {
    folders: number;
    movies: number;
    series: number;
    episodes: number;
    watchHistory: number;
  };
}

interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
  isUpdateAvailable: boolean;
  releaseUrl: string;
  releaseName?: string;
  prerelease: boolean;
  publishedAt: string | null;
  checkedAt: string;
  source: "native" | "api";
}

interface NativeUpdatePayload {
  version: string;
  currentVersion: string;
  date?: string;
  body?: string;
  downloadAndInstall: (...args: unknown[]) => Promise<void>;
}

const isTauriRuntime = () => typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

type ApiEnvelope<T> =
  | T
  | {
      success: boolean;
      data?: T;
      error?: {
        message?: string;
      };
    };

function unwrapApiResponse<T>(payload: ApiEnvelope<T>): T {
  if (payload && typeof payload === "object" && "success" in payload && typeof payload.success === "boolean") {
    if (!payload.success || !payload.data) {
      throw new Error(payload.error?.message || "Invalid API response");
    }
    return payload.data;
  }

  return payload as T;
}

export default function SettingsPage() {
  const [info, setInfo] = useState<DbInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [clearingTranscode, setClearingTranscode] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [installingUpdate, setInstallingUpdate] = useState(false);
  const [installProgress, setInstallProgress] = useState<number | null>(null);
  const [nativeUpdate, setNativeUpdate] = useState<NativeUpdatePayload | null>(null);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  // Credential inputs are write-only: the password is never returned from
  // getSettings (Rust redacts it). We keep ephemeral local state for the
  // current editing session and call setTorrentCredentials on commit.
  const [torrentUser, setTorrentUser] = useState("");
  const [torrentPass, setTorrentPass] = useState("");
  const [savingCredentials, setSavingCredentials] = useState(false);
  const [bgTranscode, setBgTranscode] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("critix_bg_transcode") === "true";
  });

  const handleBgTranscodeToggle = () => {
    const next = !bgTranscode;
    setBgTranscode(next);
    localStorage.setItem("critix_bg_transcode", String(next));
  };

  const [speedUpKey, setSpeedUpKey] = useState<string>(() =>
    typeof window === "undefined" ? "]" : (localStorage.getItem("critix_speed_up_key") ?? "]"),
  );
  const [speedDownKey, setSpeedDownKey] = useState<string>(() =>
    typeof window === "undefined" ? "[" : (localStorage.getItem("critix_speed_down_key") ?? "["),
  );
  const [recordingKey, setRecordingKey] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    if (!recordingKey) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === "Escape") {
        setRecordingKey(null);
        return;
      }
      if (recordingKey === "up") {
        setSpeedUpKey(e.key);
        localStorage.setItem("critix_speed_up_key", e.key);
      } else {
        setSpeedDownKey(e.key);
        localStorage.setItem("critix_speed_down_key", e.key);
      }
      setRecordingKey(null);
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [recordingKey]);

  // ── Library keyboard shortcuts ──────────────────────────────────────────────
  type LibShortcutKey = "select_all" | "delete" | "mark_watched";
  const LIB_SHORTCUT_DEFAULTS: Record<LibShortcutKey, string> = {
    select_all: "ctrl+a",
    delete: "Delete",
    mark_watched: "w",
  };
  const [libShortcuts, setLibShortcuts] = useState<Record<LibShortcutKey, string>>(() => {
    if (typeof window === "undefined") return LIB_SHORTCUT_DEFAULTS;
    return {
      select_all: localStorage.getItem("critix_key_select_all") ?? LIB_SHORTCUT_DEFAULTS.select_all,
      delete: localStorage.getItem("critix_key_delete") ?? LIB_SHORTCUT_DEFAULTS.delete,
      mark_watched: localStorage.getItem("critix_key_mark_watched") ?? LIB_SHORTCUT_DEFAULTS.mark_watched,
    };
  });
  const [recordingLib, setRecordingLib] = useState<LibShortcutKey | null>(null);

  useEffect(() => {
    if (!recordingLib) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === "Escape") {
        setRecordingLib(null);
        return;
      }
      if (["Control", "Shift", "Alt", "Meta"].includes(e.key)) return;
      const parts: string[] = [];
      if (e.ctrlKey) parts.push("ctrl");
      if (e.shiftKey) parts.push("shift");
      if (e.altKey) parts.push("alt");
      parts.push(e.key === " " ? "Space" : e.key);
      const combo = parts.join("+");
      localStorage.setItem(`critix_key_${recordingLib}`, combo);
      setLibShortcuts((s) => ({ ...s, [recordingLib]: combo }));
      setRecordingLib(null);
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [recordingLib]);

  function fmtKey(s: string) {
    return s
      .split("+")
      .map((k) => (k === "ctrl" ? "Ctrl" : k === "shift" ? "Shift" : k === "alt" ? "Alt" : k))
      .join(" + ");
  }

  const showStatus = (type: "success" | "error", text: string) => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg(null), 4000);
  };

  const loadInfo = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/info/", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load info");
      const payload = (await res.json()) as ApiEnvelope<DbInfo>;
      const data = unwrapApiResponse(payload);
      setInfo(data);
    } catch (error) {
      console.error("Failed to load settings info:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInfo();
  }, [loadInfo]);

  useEffect(() => {
    tauriService
      .getSettings()
      .then((settings) => {
        setAppSettings(settings);
        // Pre-populate the username field (password is always redacted server-side).
        setTorrentUser(settings.torrent_client_user ?? "");
      })
      .catch((err) => console.error("Failed to load app settings:", err));
  }, []);

  const handleAutoscanToggle = async () => {
    if (!appSettings) return;
    const updated: AppSettings = {
      ...appSettings,
      auto_scan_on_startup: !appSettings.auto_scan_on_startup,
    };
    try {
      await tauriService.saveSettings(updated);
      setAppSettings(updated);
    } catch (err) {
      console.error("Failed to save app settings:", err);
      showStatus("error", "Erro ao salvar configuração.");
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/settings/backup/");
      if (!res.ok) throw new Error("Failed to export");
      const data = await res.json();
      const jsonString = JSON.stringify(data, null, 2);
      const fileName = `critix-vault-backup-${new Date().toISOString().split("T")[0]}.json`;

      let saved = false;
      try {
        // Tauri environment: use native save dialog + custom write command
        const { save } = await import("@tauri-apps/plugin-dialog");
        const { invoke } = await import("@tauri-apps/api/core");
        const filePath = await save({
          defaultPath: fileName,
          filters: [{ name: "JSON", extensions: ["json"] }],
        });
        if (filePath) {
          await invoke("write_text_file", { path: filePath, content: jsonString });
          saved = true;
          showStatus("success", "Backup exportado com sucesso!");
        }
      } catch {
        // Browser fallback
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        await new Promise((resolve) => setTimeout(resolve, 100));
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        saved = true;
        showStatus("success", "Backup exportado com sucesso!");
      }

      if (!saved) {
        showStatus("error", "Exportação cancelada.");
      }
    } catch (error) {
      showStatus("error", "Erro ao exportar: " + (error instanceof Error ? error.message : "Erro desconhecido"));
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setImporting(true);
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        const res = await fetch("/api/settings/backup/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed),
        });
        const payload = await res.json().catch(() => ({}) as { error?: string; summary?: any });

        if (!res.ok) {
          throw new Error(payload.error || "Nao foi possivel importar o backup.");
        }

        const restoredMovies = payload?.summary?.movies?.restored ?? 0;
        const restoredSeries = payload?.summary?.series?.restored ?? 0;
        showStatus("success", `Backup importado com sucesso! Filmes: ${restoredMovies} | Series: ${restoredSeries}`);
        await loadInfo();
      } catch (error) {
        showStatus("error", "Erro ao importar: " + (error instanceof Error ? error.message : "Erro desconhecido"));
      } finally {
        setImporting(false);
      }
    };
    input.click();
  };

  const handleClearAll = async () => {
    setClearing(true);
    try {
      const res = await fetch("/api/settings/backup/", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to clear data");
      showStatus("success", "Todos os dados foram removidos.");
      await loadInfo();
      setTimeout(() => {
        window.location.href = "/landing";
      }, 1500);
    } catch (error) {
      showStatus("error", "Erro ao limpar: " + (error instanceof Error ? error.message : "Erro desconhecido"));
    } finally {
      setClearing(false);
    }
  };

  const handleClearTranscodeCache = async () => {
    setClearingTranscode(true);
    try {
      const res = await fetch("/api/transcode-cache/", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to clear transcode cache");
      showStatus("success", "Cache de transcode limpo com sucesso.");
      await loadInfo();
    } catch (error) {
      showStatus("error", "Erro ao limpar cache: " + (error instanceof Error ? error.message : "Erro desconhecido"));
    } finally {
      setClearingTranscode(false);
    }
  };

  const handleCheckUpdates = async () => {
    setCheckingUpdates(true);
    setUpdateError(null);
    setInstallProgress(null);
    setNativeUpdate(null);

    try {
      if (isTauriRuntime()) {
        try {
          const { check } = await import("@tauri-apps/plugin-updater");
          const result = (await check()) as NativeUpdatePayload | null;

          if (result) {
            setNativeUpdate(result);
            setUpdateInfo({
              currentVersion: result.currentVersion || APP_VERSION,
              latestVersion: result.version,
              isUpdateAvailable: true,
              releaseUrl: `https://github.com/wallacemt/critix-vault-desktop/releases/tag/v${result.version}`,
              releaseName: `v${result.version}`,
              prerelease: false,
              publishedAt: result.date || null,
              checkedAt: new Date().toISOString(),
              source: "native",
            });

            showStatus("success", `Nova versão disponível: ${result.version}`);
            return;
          }

          setUpdateInfo({
            currentVersion: APP_VERSION,
            latestVersion: APP_VERSION,
            isUpdateAvailable: false,
            releaseUrl: "https://github.com/wallacemt/critix-vault-desktop/releases",
            releaseName: `v${APP_VERSION}`,
            prerelease: false,
            publishedAt: null,
            checkedAt: new Date().toISOString(),
            source: "native",
          });

          showStatus("success", "Você já está usando a versão mais recente.");
          return;
        } catch (nativeError) {
          const nativeMessage =
            nativeError instanceof Error ? nativeError.message : "Falha no updater nativo. Tentando fallback web.";
          console.error("Native updater check failed:", nativeError);
          setUpdateError(
            nativeMessage.includes("pubkey") || nativeMessage.includes("signature")
              ? "Updater nativo não está configurado com chave pública válida. Usando fallback para checar releases."
              : `Updater nativo indisponível: ${nativeMessage}`,
          );
        }
      }

      const res = await fetch("/api/settings/update/", { cache: "no-store" });
      if (!res.ok) {
        throw new Error("Não foi possível verificar atualizações");
      }

      const payload = (await res.json()) as ApiEnvelope<UpdateInfo>;
      const data = unwrapApiResponse(payload);
      setUpdateInfo({ ...data, source: "api" });

      showStatus(
        "success",
        data.isUpdateAvailable
          ? `Nova versão disponível: ${data.latestVersion}`
          : "Você já está usando a versão mais recente.",
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro desconhecido ao verificar atualizações";
      setUpdateError(message);
      showStatus("error", message);
    } finally {
      setCheckingUpdates(false);
    }
  };

  const handleInstallNativeUpdate = async () => {
    if (!nativeUpdate) {
      showStatus("error", "Nenhuma atualização nativa pendente para instalação.");
      return;
    }

    setInstallingUpdate(true);
    setInstallProgress(0);

    try {
      let downloaded = 0;
      let total = 0;

      await nativeUpdate.downloadAndInstall((event: any) => {
        const eventName = event?.event as string | undefined;

        if (eventName === "Started") {
          total = Number(event?.data?.contentLength ?? 0);
          downloaded = 0;
          setInstallProgress(0);
          return;
        }

        if (eventName === "Progress") {
          const chunk = Number(event?.data?.chunkLength ?? 0);
          downloaded += chunk;

          if (total > 0) {
            const progress = Math.min(100, Math.round((downloaded / total) * 100));
            setInstallProgress(progress);
          }
          return;
        }

        if (eventName === "Finished") {
          setInstallProgress(100);
        }
      });

      setNativeUpdate(null);
      showStatus("success", "Atualização instalada com sucesso. Reiniciando o aplicativo...");

      try {
        const { relaunch } = await import("@tauri-apps/plugin-process");
        await relaunch();
      } catch (restartError) {
        const restartMessage = restartError instanceof Error ? restartError.message : "Erro desconhecido";
        console.error("Failed to relaunch after update:", restartError);
        setUpdateError(`Atualização instalada, mas não foi possível reiniciar automaticamente: ${restartMessage}`);
        showStatus("success", "Atualização instalada. Reinicie manualmente o aplicativo para concluir a atualização.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao instalar atualização";
      setUpdateError(message);
      showStatus("error", `Falha ao instalar atualização: ${message}`);
    } finally {
      setInstallingUpdate(false);
    }
  };

  const totalItems = info ? info.counts.movies + info.counts.series : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white ">
      {/* Status Toast */}
      {statusMsg && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl ${
            statusMsg.type === "success"
              ? "bg-green-900/90 border-green-700 text-green-200"
              : "bg-red-900/90 border-red-700 text-red-200"
          }`}
        >
          {statusMsg.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          )}
          <span className="text-sm font-medium">{statusMsg.text}</span>
        </motion.div>
      )}

      <div className="max-w-5xl mx-auto p-6 pb-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-10"
        >
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <Link href="/library" aria-label="Voltar para Biblioteca">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-display font-bold text-white">Configurações</h1>
            <p className="text-slate-400 text-sm mt-0.5">Gerencie armazenamento, backups e dados do aplicativo</p>
          </div>
        </motion.div>

        <div className="space-y-6">
          {/* Storage Overview */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-600/30 flex items-center justify-center">
                  <HardDrive className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white font-display">Armazenamento</h2>
                  <p className="text-xs text-slate-500">Banco de dados SQLite local</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={loadInfo}
                disabled={loading}
                className="text-slate-400 hover:text-white"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Atualizar
              </Button>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-24 bg-slate-800/50 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : info ? (
              <>
                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <StatCard
                    icon={<Database className="w-5 h-5 text-blue-400" />}
                    label="Banco de Dados"
                    value={formatBytes(info.dbSize)}
                    sub="arquivo .db"
                    color="blue"
                  />
                  <StatCard
                    icon={<Film className="w-5 h-5 text-purple-400" />}
                    label="Filmes"
                    value={info.counts.movies.toString()}
                    sub="cadastrados"
                    color="purple"
                  />
                  <StatCard
                    icon={<Tv className="w-5 h-5 text-pink-400" />}
                    label="Séries"
                    value={info.counts.series.toString()}
                    sub={`${info.counts.episodes} episódios`}
                    color="pink"
                  />
                  <StatCard
                    icon={<Eye className="w-5 h-5 text-green-400" />}
                    label="Histórico"
                    value={info.counts.watchHistory.toString()}
                    sub="registros"
                    color="green"
                  />
                </div>

                <Separator className="bg-slate-800 mb-4" />

                {/* Transcode cache row */}
                {info.transcodeSize !== undefined && (
                  <div className="flex items-center justify-between mb-4 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                    <div className="flex items-center gap-3">
                      <BarChart3 className="w-4 h-4 text-amber-400 shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-slate-300">Cache de áudios transcodificados</p>
                        <p className="text-xs text-amber-300 font-semibold">{formatBytes(info.transcodeSize)}</p>
                      </div>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={clearingTranscode || info.transcodeSize === 0}
                          className="text-amber-400 hover:text-amber-200 hover:bg-amber-500/10 text-xs"
                        >
                          {clearingTranscode ? (
                            <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                          )}
                          Limpar cache
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-slate-900 border-slate-700">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-white">Limpar cache de transcode?</AlertDialogTitle>
                          <AlertDialogDescription className="text-slate-400">
                            Isso apaga todos os arquivos de áudio pré-processados ({formatBytes(info.transcodeSize ?? 0)}).
                            O player vai reprocessar o áudio da mídia ao abrir novamente.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="border-slate-700 text-slate-300">Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleClearTranscodeCache}
                            className="bg-amber-600 hover:bg-amber-500 text-white"
                          >
                            Limpar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}

                {/* DB Path */}
                <div className="flex items-start gap-3">
                  <FolderOpen className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-500 mb-1">Localização do banco de dados</p>
                    <div className="flex gap-2">
                      <code className="text-xs text-slate-300 bg-slate-800/80 px-3 py-1.5 rounded-lg block break-all border border-slate-700 flex-1">
                        {info.dbPath}
                      </code>
                      <Tooltip>
                        <TooltipTrigger>
                          <Button
                            onClick={async () => {
                              try {
                                await tauriService.openFileLocation(info.dbPath);
                              } catch (error) {
                                alert("Erro ao abrir Pasta");
                              }
                            }}
                            className="rounded-md"
                            size={"icon"}
                            variant={"ghost"}
                          >
                            <FolderOpen />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Abrir Pasta do Banco</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-slate-500 text-sm text-center py-4">Não foi possível carregar as informações.</p>
            )}
          </motion.section>

          {/* Backup & Restore */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-green-600/20 border border-green-600/30 flex items-center justify-center">
                <Shield className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white font-display">Backup e Restauração</h2>
                <p className="text-xs text-slate-500">Exporte ou importe todos os seus dados</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Export */}
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 hover:border-green-700/50 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <Download className="w-4 h-4 text-green-400" />
                  <h3 className="font-medium text-white text-sm">Exportar Backup</h3>
                </div>
                <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                  Salva todos os seus filmes, séries, pastas e histórico em um arquivo JSON.
                </p>
                <Button
                  onClick={handleExport}
                  disabled={exporting}
                  variant="outline"
                  size="sm"
                  className="w-full border-green-700/50 text-green-400 hover:bg-green-600/10 hover:border-green-600"
                >
                  {exporting ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  {exporting ? "Exportando..." : "Exportar .json"}
                </Button>
              </div>

              {/* Import */}
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 hover:border-blue-700/50 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <Upload className="w-4 h-4 text-blue-400" />
                  <h3 className="font-medium text-white text-sm">Importar Backup</h3>
                </div>
                <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                  Restaura seus dados a partir de um arquivo de backup exportado anteriormente.
                </p>
                <Button
                  onClick={handleImport}
                  disabled={importing}
                  variant="outline"
                  size="sm"
                  className="w-full border-blue-700/50 text-blue-400 hover:bg-blue-600/10 hover:border-blue-600"
                >
                  {importing ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  {importing ? "Importando..." : "Selecionar arquivo"}
                </Button>
              </div>
            </div>

            <div className="mt-4 flex items-start gap-2 p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
              <Info className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-slate-500 leading-relaxed">
                O backup inclui: pastas monitoradas, metadados de filmes e séries, histórico de visualizações e ações do
                usuário. <strong className="text-slate-400">Arquivos de vídeo não são incluídos.</strong>
              </p>
            </div>
          </motion.section>

          {/* Updates */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div>
                <h2 className="text-lg font-semibold text-white font-display">Atualizações do Aplicativo</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Verifique se existe uma nova versão disponível para instalar.
                </p>
              </div>
              <Button
                onClick={handleCheckUpdates}
                disabled={checkingUpdates}
                variant="outline"
                className="border-amber-600/60 text-amber-300 hover:bg-amber-500/10 hover:text-amber-200"
              >
                {checkingUpdates ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Clock className="w-4 h-4 mr-2" />
                )}
                {checkingUpdates ? "Verificando..." : "Verificar atualização"}
              </Button>
            </div>

            <div
              className="rounded-xl border border-slate-700 bg-slate-800/40 p-4 space-y-2"
              role="status"
              aria-live="polite"
            >
              <p className="text-sm text-slate-200">
                Versão atual: <span className="font-semibold">{APP_VERSION}</span>
              </p>
              {updateInfo ? (
                <>
                  <p className="text-sm text-slate-300">
                    Última versão disponível: <span className="font-semibold">{updateInfo.latestVersion}</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    Fonte da verificação: {updateInfo.source === "native" ? "Updater nativo (Tauri)" : "Fallback API"}
                  </p>
                  <p className={`text-sm ${updateInfo.isUpdateAvailable ? "text-emerald-300" : "text-slate-400"}`}>
                    {updateInfo.isUpdateAvailable
                      ? "Nova versão encontrada. Recomendado atualizar para a release mais recente."
                      : "Seu aplicativo já está atualizado."}
                  </p>

                  {updateInfo.isUpdateAvailable && nativeUpdate && (
                    <Button
                      onClick={handleInstallNativeUpdate}
                      disabled={installingUpdate}
                      className="mt-2 bg-emerald-600 hover:bg-emerald-500 text-white"
                    >
                      <ArrowUpRight className="w-4 h-4 mr-2" />
                      {installingUpdate ? "Instalando atualização..." : "Atualizar automaticamente agora"}
                    </Button>
                  )}

                  {updateInfo.isUpdateAvailable && (
                    <Button
                      onClick={() => openExternalLink(updateInfo.releaseUrl)}
                      variant="outline"
                      className="mt-2 border-emerald-600/60 text-emerald-300 hover:bg-emerald-600/10"
                    >
                      <ArrowUpRight className="w-4 h-4 mr-2" />
                      Abrir release manual
                    </Button>
                  )}

                  {installProgress !== null && (
                    <p className="text-xs text-amber-200">Progresso da instalação: {installProgress}%</p>
                  )}
                </>
              ) : (
                <p className="text-sm text-slate-400">Nenhuma verificação realizada ainda nesta sessão.</p>
              )}

              {updateError && <p className="text-sm text-red-300">{updateError}</p>}
            </div>
          </motion.section>

          {/* Biblioteca */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.14 }}
            className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-600/30 flex items-center justify-center">
                <Library className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white font-display">Biblioteca</h2>
                <p className="text-xs text-slate-500">Comportamento de escaneamento de mídia</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700">
              <div className="flex-1 pr-4">
                <h4 className="font-medium text-white text-sm mb-1">Verificar novas mídias ao iniciar</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Ao abrir o app, procura por mídias novas nas pastas monitoradas e pergunta se deseja adicioná-las.
                </p>
              </div>
              <button
                role="switch"
                aria-checked={appSettings?.auto_scan_on_startup ?? false}
                onClick={handleAutoscanToggle}
                disabled={appSettings === null}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40 ${
                  appSettings?.auto_scan_on_startup ? "bg-indigo-600" : "bg-slate-600"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform duration-200 ${
                    appSettings?.auto_scan_on_startup ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border mt-4 border-slate-700">
              <div className="flex-1 pr-4">
                <h4 className="font-medium text-white text-sm mb-1">Transcode de áudio em segundo plano</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Pré-processa o áudio de arquivos MKV/AVI em segundo plano após carregar a biblioteca. Quando ativo, o
                  player abre instantaneamente para mídias já transcodificadas (cache). Processa apenas arquivos que
                  precisam de transcode, priorizando a faixa em português (por/pt). Os arquivos processados são
                  removidos automaticamente ao marcar a mídia como assistida.
                </p>
              </div>
              <button
                role="switch"
                aria-checked={bgTranscode}
                onClick={handleBgTranscodeToggle}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                  bgTranscode ? "bg-amber-500" : "bg-slate-600"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform duration-200 ${
                    bgTranscode ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </motion.section>

          {/* Player preference */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-600/30 flex items-center justify-center">
                <Play className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white font-display">Player de Vídeo</h2>
                <p className="text-xs text-slate-500">Escolha como as mídias serão reproduzidas</p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {(["ASK", "INTERNAL", "EXTERNAL"] as const).map((opt) => {
                const labels: Record<PreferredPlayer, string> = {
                  ASK: "Perguntar sempre",
                  INTERNAL: "Sempre player interno",
                  EXTERNAL: "Sempre app externo",
                };
                const descriptions: Record<PreferredPlayer, string> = {
                  ASK: "Pergunta qual player usar cada vez que você abre uma mídia.",
                  INTERNAL: "Usa o player embutido do Critix Vault (Vidstack).",
                  EXTERNAL: "Abre sempre no player de vídeo padrão do sistema.",
                };
                const isSelected = (appSettings?.preferred_player ?? "ASK") === opt;

                return (
                  <label
                    key={opt}
                    className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${
                      isSelected
                        ? "border-indigo-600/60 bg-indigo-600/10"
                        : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
                    }`}
                  >
                    <input
                      type="radio"
                      name="preferred_player"
                      value={opt}
                      checked={isSelected}
                      disabled={appSettings === null}
                      onChange={async () => {
                        if (!appSettings) return;
                        const updated: AppSettings = { ...appSettings, preferred_player: opt };
                        try {
                          await tauriService.saveSettings(updated);
                          setAppSettings(updated);
                        } catch (err) {
                          console.error("Failed to save player preference:", err);
                          showStatus("error", "Erro ao salvar preferência de player.");
                        }
                      }}
                      className="mt-0.5 w-4 h-4 accent-indigo-500 cursor-pointer shrink-0"
                    />
                    <div>
                      <p className="text-sm font-medium text-white">{labels[opt]}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{descriptions[opt]}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </motion.section>

          {/* Player speed shortcuts */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.17 }}
            className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-amber-600/20 border border-amber-600/30 flex items-center justify-center">
                <Keyboard className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white font-display">Atalhos de Velocidade</h2>
                <p className="text-xs text-slate-500">
                  Teclas para aumentar / diminuir a velocidade no player interno. Scroll também funciona.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {(
                [
                  { label: "Aumentar velocidade", icon: ChevronUp, key: speedUpKey, which: "up" as const },
                  { label: "Diminuir velocidade", icon: ChevronDown, key: speedDownKey, which: "down" as const },
                ] as const
              ).map(({ label, icon: Icon, key, which }) => (
                <div
                  key={which}
                  className="flex items-center justify-between p-4 rounded-xl border border-slate-700 bg-slate-800/50"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-white">{label}</span>
                  </div>
                  <button
                    onClick={() => setRecordingKey(recordingKey === which ? null : which)}
                    className={`min-w-[80px] px-3 py-1.5 rounded-lg border text-sm font-mono transition-colors ${
                      recordingKey === which
                        ? "border-amber-500 bg-amber-500/15 text-amber-300 animate-pulse"
                        : "border-slate-600 bg-slate-700/50 text-slate-300 hover:border-slate-500"
                    }`}
                  >
                    {recordingKey === which ? "Pressione…" : key}
                  </button>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-slate-600">
              Clique no botão de tecla e pressione qualquer tecla para redefinir. Esc cancela.
            </p>
          </motion.section>

          {/* Library keyboard shortcuts */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.19 }}
            className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-600/30 flex items-center justify-center">
                <Keyboard className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white font-display">Atalhos da Biblioteca</h2>
                <p className="text-xs text-slate-500">
                  Atalhos de teclado para ações na biblioteca. Clique para redefinir.
                </p>
              </div>
            </div>

            {/* Guide table — fixed shortcuts */}
            <div className="mb-4 rounded-xl border border-slate-700 overflow-hidden">
              {[{ label: "Limpar seleção", key: "Esc", fixed: true }].map(({ label, key }) => (
                <div
                  key={label}
                  className="flex items-center justify-between px-4 py-2.5 border-b border-slate-700/60 last:border-0 bg-slate-800/30"
                >
                  <span className="text-sm text-slate-300">{label}</span>
                  <kbd className="px-2 py-1 rounded bg-slate-700 text-slate-300 text-xs font-mono">{key}</kbd>
                </div>
              ))}
            </div>

            {/* Configurable shortcuts */}
            <div className="flex flex-col gap-2">
              {(
                [
                  { id: "select_all" as LibShortcutKey, label: "Selecionar todos", icon: ChevronDown },
                  { id: "delete" as LibShortcutKey, label: "Deletar selecionados", icon: ChevronDown },
                  { id: "mark_watched" as LibShortcutKey, label: "Marcar como assistido", icon: ChevronDown },
                ] as const
              ).map(({ id, label }) => (
                <div
                  key={id}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-700 bg-slate-800/50"
                >
                  <span className="text-sm text-white">{label}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setRecordingLib(recordingLib === id ? null : id)}
                      className={`min-w-[100px] px-3 py-1.5 rounded-lg border text-xs font-mono transition-colors ${
                        recordingLib === id
                          ? "border-indigo-500 bg-indigo-500/15 text-indigo-300 animate-pulse"
                          : "border-slate-600 bg-slate-700/50 text-slate-300 hover:border-slate-500"
                      }`}
                    >
                      {recordingLib === id ? "Pressione…" : fmtKey(libShortcuts[id])}
                    </button>
                    <button
                      onClick={() => {
                        const def = LIB_SHORTCUT_DEFAULTS[id];
                        localStorage.setItem(`critix_key_${id}`, def);
                        setLibShortcuts((s) => ({ ...s, [id]: def }));
                      }}
                      className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
                      title="Restaurar padrão"
                    >
                      reset
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-slate-600">
              Esc cancela a gravação. Combinações com Ctrl/Shift/Alt são suportadas.
            </p>
          </motion.section>

          {/* Torrent Client */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
            className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-600/30 flex items-center justify-center">
                <Magnet className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white font-display">Cliente Torrent</h2>
                <p className="text-xs text-slate-500">
                  Integração com o cliente BitTorrent local (uTorrent / qBittorrent)
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Enable/disable toggle — must be on before other fields matter */}
              <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                <div className="flex-1 pr-4">
                  <h4 className="font-medium text-white text-sm mb-1">Ativar monitoramento de torrents</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Habilita o proxy de status do cliente BitTorrent local. Quando desativado, nenhuma conexão de rede é
                    iniciada para o cliente torrent.
                  </p>
                </div>
                <button
                  role="switch"
                  aria-checked={appSettings?.torrent_proxy_enabled ?? false}
                  onClick={async () => {
                    if (!appSettings) return;
                    const updated: AppSettings = {
                      ...appSettings,
                      torrent_proxy_enabled: !appSettings.torrent_proxy_enabled,
                    };
                    try {
                      await tauriService.saveSettings(updated);
                      setAppSettings(updated);
                    } catch (err) {
                      console.error("Failed to save torrent proxy toggle:", err);
                      showStatus("error", "Erro ao salvar configuração de torrent.");
                    }
                  }}
                  disabled={appSettings === null}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40 ${
                    appSettings?.torrent_proxy_enabled ? "bg-emerald-600" : "bg-slate-600"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform duration-200 ${
                      appSettings?.torrent_proxy_enabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Port */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="torrent-port" className="text-sm font-medium text-slate-200">
                  Porta da interface web
                </label>
                <p className="text-xs text-slate-500">
                  Porta em que o cliente torrent escuta. O padrão é <code className="text-slate-400">10800</code> para
                  evitar conflito com a porta interna <code className="text-slate-400">8080</code> do app.
                </p>
                <input
                  id="torrent-port"
                  type="number"
                  min={1}
                  max={65535}
                  value={appSettings?.torrent_client_port ?? 10800}
                  disabled={appSettings === null}
                  onChange={async (e) => {
                    if (!appSettings) return;
                    const port = Math.max(1, Math.min(65535, parseInt(e.target.value, 10) || 10800));
                    const updated: AppSettings = { ...appSettings, torrent_client_port: port };
                    try {
                      await tauriService.saveSettings(updated);
                      setAppSettings(updated);
                    } catch (err) {
                      console.error("Failed to save torrent port:", err);
                      showStatus("error", "Erro ao salvar porta do torrent.");
                    }
                  }}
                  className="w-40 rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2 text-sm text-white focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
                />
              </div>

              {/* Credentials — write-only section */}
              <div className="space-y-3 rounded-xl border border-slate-700/60 bg-slate-800/30 p-4">
                <p className="text-xs font-medium text-slate-300">Credenciais de autenticação (opcional)</p>

                {/* Username */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="torrent-user" className="text-sm font-medium text-slate-200">
                    Usuário
                  </label>
                  <input
                    id="torrent-user"
                    type="text"
                    autoComplete="off"
                    value={torrentUser}
                    disabled={appSettings === null}
                    placeholder="Deixe em branco se não usar autenticação"
                    onChange={(e) => setTorrentUser(e.target.value)}
                    className="w-64 rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
                  />
                </div>

                {/* Password — write-only: never populated from getSettings */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="torrent-pass" className="text-sm font-medium text-slate-200">
                    Senha
                  </label>
                  <input
                    id="torrent-pass"
                    type="password"
                    autoComplete="new-password"
                    value={torrentPass}
                    disabled={appSettings === null}
                    placeholder="••••••••"
                    onChange={(e) => setTorrentPass(e.target.value)}
                    className="w-64 rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
                  />
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  disabled={appSettings === null || savingCredentials}
                  onClick={async () => {
                    setSavingCredentials(true);
                    try {
                      await tauriService.setTorrentCredentials(torrentUser || null, torrentPass || null);
                      // Clear the password field after a successful save — the
                      // value now lives only on the Rust side.
                      setTorrentPass("");
                      showStatus("success", "Credenciais salvas.");
                    } catch (err) {
                      console.error("Failed to save torrent credentials:", err);
                      showStatus("error", "Erro ao salvar credenciais.");
                    } finally {
                      setSavingCredentials(false);
                    }
                  }}
                  className="border-emerald-700/50 text-emerald-400 hover:bg-emerald-600/10 hover:border-emerald-600"
                >
                  {savingCredentials ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Shield className="w-4 h-4 mr-2" />
                  )}
                  Salvar credenciais
                </Button>
              </div>

              <div className="flex items-start gap-2 p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
                <Info className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-slate-500 leading-relaxed">
                  As credenciais são armazenadas localmente no arquivo de configuração do app. A senha nunca é retornada
                  ao renderer após ser salva.
                </p>
              </div>
            </div>
          </motion.section>

          {/* Danger Zone */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.17 }}
            className="bg-red-950/20 border border-red-900/40 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-600/30 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-red-400 font-display">Zona de Perigo</h2>
                <p className="text-xs text-red-400/60">Ações irreversíveis — tenha cuidado</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-red-950/30 rounded-xl border border-red-900/30">
              <div>
                <h4 className="font-medium text-white text-sm mb-1">Resetar Aplicativo</h4>
                <p className="text-xs text-slate-400">
                  Remove permanentemente todas as pastas, mídias e configurações.
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={clearing}
                    className="border-red-700 text-red-400 hover:bg-red-700 hover:text-white flex-shrink-0 ml-4"
                  >
                    {clearing ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 mr-2" />
                    )}
                    Resetar Tudo
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-slate-900 border-slate-700">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-white flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-400" />
                      Tem certeza absoluta?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-slate-400">
                      Esta ação <strong className="text-red-400">não pode ser desfeita</strong>. Serão removidos
                      permanentemente:
                      <ul className="list-disc list-inside mt-3 space-y-1 text-slate-400">
                        <li>Todas as {info?.counts.folders || 0} pasta(s) monitorada(s)</li>
                        <li>Todos os {info?.counts.movies || 0} filme(s)</li>
                        <li>Todas as {info?.counts.series || 0} série(s)</li>
                        <li>Todo o histórico de visualizações</li>
                      </ul>
                      <p className="mt-3 text-slate-500 text-xs">Recomendamos exportar um backup antes de continuar.</p>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="bg-slate-800 text-white border-slate-700 hover:bg-slate-700">
                      Cancelar
                    </AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearAll} className="bg-red-600 hover:bg-red-700 text-white">
                      Sim, apagar tudo
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </motion.section>

          {/* App Info */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-6"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-amber-600/20 border border-yellow-600/30 flex items-center justify-center">
                <Database className="w-7 h-7 text-yellow-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white font-display">Critix Vault</h3>
                <p className="text-sm text-slate-400">Gerenciador de biblioteca de mídia local</p>
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-xs text-slate-600 flex items-center gap-1">
                    <FileJson className="w-3 h-3" />
                    SQLite + Prisma
                  </span>
                  <span className="text-xs text-slate-600 flex items-center gap-1">
                    <BarChart3 className="w-3 h-3" />
                    {totalItems} itens na biblioteca
                  </span>
                  <span className="text-xs text-slate-600 flex items-center gap-1">
                    <Clock className="w-3 h-3" />v{APP_VERSION}
                  </span>
                </div>
              </div>
            </div>
          </motion.section>
        </div>
      </div>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  color: "blue" | "purple" | "pink" | "green";
}) {
  const bg: Record<string, string> = {
    blue: "bg-blue-600/10 border-blue-600/20",
    purple: "bg-purple-600/10 border-purple-600/20",
    pink: "bg-pink-600/10 border-pink-600/20",
    green: "bg-green-600/10 border-green-600/20",
  };

  return (
    <div className={`rounded-xl p-4 border ${bg[color]}`}>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <span className="text-xs text-slate-400">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white mb-0.5">{value}</p>
      <p className="text-xs text-slate-500">{sub}</p>
    </div>
  );
}
