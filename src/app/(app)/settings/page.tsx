"use client";

import { useState, useEffect, useCallback } from "react";
import { tauriService, CacheInfo } from "@/services/tauri";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Image,
  Trash2,
  Download,
  Upload,
  RefreshCw,
  HardDrive,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export default function SettingsPage() {
  const [cacheInfo, setCacheInfo] = useState<CacheInfo | null>(null);
  const [dataDirectory, setDataDirectory] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [exporting, setExporting] = useState(false);

  const loadInfo = useCallback(async () => {
    setLoading(true);
    try {
      const [info, dir] = await Promise.all([tauriService.getCacheInfo(), tauriService.getDataDirectory()]);
      setCacheInfo(info);
      setDataDirectory(dir);
    } catch (error) {
      console.error("Failed to load settings info:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInfo();
  }, [loadInfo]);

  const handleClearAllData = async () => {
    setClearing(true);
    try {
      await tauriService.clearAllData();
      await loadInfo();
      // Redirect to library page after clearing
      window.location.href = "/library";
    } catch (error) {
      console.error("Failed to clear data:", error);
      alert("Erro ao limpar dados: " + (error instanceof Error ? error.message : "Erro desconhecido"));
    } finally {
      setClearing(false);
    }
  };

  const handleExportData = async () => {
    setExporting(true);
    try {
      const data = await tauriService.exportData();

      // Create and download file
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `critix-vault-backup-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export data:", error);
      alert("Erro ao exportar dados: " + (error instanceof Error ? error.message : "Erro desconhecido"));
    } finally {
      setExporting(false);
    }
  };

  const handleImportData = async () => {
    try {
      // Create file input
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json";

      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        try {
          const text = await file.text();
          await tauriService.importData(text);
          await loadInfo();
          alert("Dados importados com sucesso!");
          window.location.href = "/library";
        } catch (error) {
          console.error("Failed to import data:", error);
          alert("Erro ao importar dados: " + (error instanceof Error ? error.message : "Erro desconhecido"));
        }
      };

      input.click();
    } catch (error) {
      console.error("Failed to import data:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/library">
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Configurações</h1>
            <p className="text-slate-400">Gerenciar armazenamento e dados do aplicativo</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Storage Information */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <HardDrive className="w-5 h-5 text-blue-400" />
                Informações de Armazenamento
              </CardTitle>
              <CardDescription>Visualize quanto espaço o aplicativo está usando</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="flex items-center gap-2 text-slate-400">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Carregando...
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Data File Size */}
                    <div className="bg-slate-800/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-slate-400 mb-2">
                        <Database className="w-4 h-4" />
                        <span className="text-sm">Dados da Biblioteca</span>
                      </div>
                      <p className="text-2xl font-bold text-white">
                        {cacheInfo ? formatBytes(cacheInfo.data_file_size) : "0 Bytes"}
                      </p>
                    </div>

                    {/* Image Cache Size */}
                    <div className="bg-slate-800/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-slate-400 mb-2">
                        <Image className="w-4 h-4" />
                        <span className="text-sm">Cache de Imagens</span>
                      </div>
                      <p className="text-2xl font-bold text-white">
                        {cacheInfo ? formatBytes(cacheInfo.total_size_bytes) : "0 Bytes"}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">{cacheInfo?.image_count || 0} imagens em cache</p>
                    </div>

                    {/* Total Size */}
                    <div className="bg-slate-800/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-slate-400 mb-2">
                        <FolderOpen className="w-4 h-4" />
                        <span className="text-sm">Total</span>
                      </div>
                      <p className="text-2xl font-bold text-white">
                        {cacheInfo ? formatBytes(cacheInfo.total_size_bytes + cacheInfo.data_file_size) : "0 Bytes"}
                      </p>
                    </div>
                  </div>

                  <Separator className="bg-slate-700" />

                  {/* Data Directory */}
                  <div>
                    <p className="text-sm text-slate-400 mb-1">Diretório de Dados:</p>
                    <code className="text-xs bg-slate-800 px-3 py-2 rounded block text-slate-300 break-all">
                      {dataDirectory}
                    </code>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadInfo}
                    className="border-slate-700 text-slate-300 hover:bg-slate-800"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Atualizar
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Export/Import */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Database className="w-5 h-5 text-green-400" />
                Backup e Restauração
              </CardTitle>
              <CardDescription>Exporte seus dados para backup ou importe dados existentes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <Button
                  variant="outline"
                  onClick={handleExportData}
                  disabled={exporting}
                  className="border-green-600 text-green-400 hover:bg-green-600/10"
                >
                  {exporting ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  Exportar Dados
                </Button>

                <Button
                  variant="outline"
                  onClick={handleImportData}
                  className="border-blue-600 text-blue-400 hover:bg-blue-600/10"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Importar Dados
                </Button>
           
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="bg-slate-900/50 border-red-900/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="w-5 h-5" />
                Zona de Perigo
              </CardTitle>
              <CardDescription className="text-red-300/70">Ações irreversíveis. Tenha cuidado!</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Clear All Data */}
                <div className="flex items-center justify-between p-4 bg-red-950/20 rounded-lg border border-red-900/30">
                  <div>
                    <h4 className="font-medium text-white">Limpar Todos os Dados</h4>
                    <p className="text-sm text-slate-400">
                      Remove todas as pastas, mídia e configurações. O aplicativo voltará ao estado inicial.
                    </p>
                  </div>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" disabled={clearing} className="bg-red-600 hover:bg-red-700">
                        {clearing ? (
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4 mr-2" />
                        )}
                        Resetar App
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-slate-900 border-slate-800">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-white">Tem certeza?</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-400">
                          Esta ação não pode ser desfeita. Isso irá remover permanentemente:
                          <ul className="list-disc list-inside mt-2 space-y-1">
                            <li>Todas as pastas adicionadas</li>
                            <li>Todos os metadados de filmes e séries</li>
                            <li>Todo o cache de imagens</li>
                            <li>Todas as configurações</li>
                          </ul>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="bg-slate-800 text-white border-slate-700 hover:bg-slate-700">
                          Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={handleClearAllData} className="bg-red-600 hover:bg-red-700">
                          Sim, resetar tudo
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* App Info */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="pt-6">
              <div className="text-center text-slate-500 text-sm">
                <p className="font-semibold text-slate-400">Critix Vault</p>
                <p>Gerencie sua biblioteca de mídia local</p>
                <p className="mt-2 text-xs">
                  Os dados são armazenados de forma persistente e segura no seu dispositivo.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
