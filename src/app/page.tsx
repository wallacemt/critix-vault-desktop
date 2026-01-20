"use client";

import { useCallback, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

type TauriStatus = "idle" | "running" | "success" | "error";

const roadmap = [
  {
    title: "Setup do Tauri + Next",
    detail: "Gerar build estática com next build (output export) e servir pelo shell do Tauri.",
  },
  {
    title: "Adicionar pastas monitoradas",
    detail: "Persistir diretórios e iniciar watcher para novas mídias.",
  },
  {
    title: "Listar arquivos de mídia",
    detail: "Indexar .mkv / .mp4 / .avi com metadados mínimos e hashes.",
  },
  {
    title: "Parser determinístico",
    detail: "Normalizar nomes com regex/heurísticas antes de acionar IA.",
  },
  {
    title: "Cache local",
    detail: "Usar SQLite para resultados de parsing e TMDB (via API Critix).",
  },
  {
    title: "Grid de visualização",
    detail: "Renderizar cards com capas, progresso e ação de play no player externo.",
  },
];

const features = [
  {
    title: "Biblioteca local",
    description: "Colete pastas do usuário, mantenha a lista viva com watcher e apresente tudo como catálogo.",
    tag: "MVP",
  },
  {
    title: "Normalização inteligente",
    description: "Parser determinístico primeiro; IA só como fallback controlado para nomes ambíguos.",
    tag: "Robustez",
  },
  {
    title: "Metadados + Cache",
    description: "Consultar API Critix/TMDB e armazenar localmente para navegação offline-first.",
    tag: "Performance",
  },
  {
    title: "Interface streaming",
    description: "Grid de capas, detalhes, temporadas/episódios e abertura no player preferido.",
    tag: "UX",
  },
];

const isTauriAvailable = () =>
  typeof window !== "undefined" && typeof (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ !== "undefined";

export default function HomePage() {
  const [libraryName, setLibraryName] = useState("Critix");
  const [status, setStatus] = useState<TauriStatus>("idle");
  const [feedback, setFeedback] = useState("Pronto para chamar o backend Rust.");

  const statusLabel = useMemo(() => {
    switch (status) {
      case "running":
        return "Chamando comando Tauriss...";
      case "success":
        return "Tauri respondeu";
      case "error":
        return "Tauri indisponível";
      default:
        return "Idle";
    }
  }, [status]);

  const callTauri = useCallback(async () => {
    if (!isTauriAvailable()) {
      setStatus("error");
      setFeedback("Execute via Tauri (dev/build) para acessar os comandos nativos.");
      return;
    }

    try {
      setStatus("running");
      const response = await invoke<string>("greet", { name: libraryName || "Critix" });
      setFeedback(response);
      setStatus("success");
    } catch (error) {
      setStatus("error");
      setFeedback(
        error instanceof Error ? error.message : "Não foi possível chamar o comando Tauri. Verifique o console.",
      );
    }
  }, [libraryName]);

  return (
    <div className="page">
      <header className="hero">
        <p className="eyebrow">Desktop · Tauri 2 + Next</p>
        <h1 className="title">Critix Vault</h1>
        <p className="lead">
          Catálogo local com experiência de streaming. Monitore pastas, normalize nomes, consulte TMDB via Critix e
          navegue por capas, temporadas e episódios — tudo offline-first.
        </p>
        <div className="cta-row">
          <button className="btn" onClick={callTauri} aria-label="Testar integração com backend Tauri">
            Testar integração Tauri
          </button>
          <span className="pill">Próximos passos guiados</span>
        </div>
        <div className="stats">
          <div className="stat-card">
            <p className="stat-label">Stack</p>
            <p className="stat-value">Next · React · Tauri · Rust</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Fluxo principal</p>
            <p className="stat-value">Watcher → Parser → Cache → UI</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">IA</p>
            <p className="stat-value">Somente fallback controlado</p>
          </div>
        </div>
      </header>

      <section className="panel">
        <h2>Shadcn Integration</h2>
      </section>
    </div>
  );
}
