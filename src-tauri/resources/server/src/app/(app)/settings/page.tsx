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
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

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
  counts: {
    folders: number;
    movies: number;
    series: number;
    episodes: number;
    watchHistory: number;
  };
}

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
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showStatus = (type: "success" | "error", text: string) => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg(null), 4000);
  };

  const loadInfo = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/info", { cache: "no-store" });
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

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/settings/backup");
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
        const res = await fetch("/api/settings/backup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed),
        });
        if (!res.ok) throw new Error("Failed to import");
        showStatus("success", "Dados importados com sucesso!");
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
      const res = await fetch("/api/settings/backup", { method: "DELETE" });
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

  const totalItems = info ? info.counts.movies + info.counts.series : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
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
          <Link href="/library">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">Configurações</h1>
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
                  <h2 className="text-lg font-semibold text-white">Armazenamento</h2>
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

                {/* DB Path */}
                <div className="flex items-start gap-3">
                  <FolderOpen className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-500 mb-1">Localização do banco de dados</p>
                    <code className="text-xs text-slate-300 bg-slate-800/80 px-3 py-1.5 rounded-lg block break-all border border-slate-700">
                      {info.dbPath}
                    </code>
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
                <h2 className="text-lg font-semibold text-white">Backup e Restauração</h2>
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

          {/* Danger Zone */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-red-950/20 border border-red-900/40 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-600/30 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-red-400">Zona de Perigo</h2>
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
                <h3 className="text-lg font-bold text-white">Critix Vault</h3>
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
