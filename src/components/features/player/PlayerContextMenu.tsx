"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMediaState, useMediaRemote } from "@vidstack/react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Gauge,
  Maximize,
  ExternalLink,
  PictureInPicture,
} from "lucide-react";

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;

interface PlayerContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onOpenExternal: () => void;
}

/** Custom right-click menu rendered inside <MediaPlayer> so Vidstack hooks work. */
export function PlayerContextMenu({ x, y, onClose, onOpenExternal }: PlayerContextMenuProps) {
  const paused = useMediaState("paused");
  const currentTime = useMediaState("currentTime");
  const playbackRate = useMediaState("playbackRate");
  const remote = useMediaRemote();

  const menuRef = useRef<HTMLDivElement>(null);
  const [showSpeeds, setShowSpeeds] = useState(false);

  // Adjust position so the menu never overflows the viewport.
  const [pos, setPos] = useState({ x, y });
  useEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    setPos({
      x: rect.right > vw ? Math.max(0, x - rect.width) : x,
      y: rect.bottom > vh ? Math.max(0, y - rect.height) : y,
    });
  }, [x, y]);

  // Close on outside click or Escape.
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  function action(fn: () => void) {
    return () => { fn(); onClose(); };
  }

  const menu = (
    <div
      ref={menuRef}
      style={{ position: "fixed", left: pos.x, top: pos.y, zIndex: 9999 }}
      className="min-w-[170px] rounded-xl border border-white/10 bg-zinc-950/95
                 backdrop-blur-xl shadow-2xl py-1 text-sm select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Play / Pause */}
      <MenuItem
        icon={paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
        label={paused ? "Reproduzir" : "Pausar"}
        shortcut="Espaço"
        onClick={action(() => paused ? remote.play() : remote.pause())}
      />

      <Divider />

      {/* Seek */}
      <MenuItem
        icon={<SkipBack className="w-3.5 h-3.5" />}
        label="Voltar 10s"
        shortcut="←"
        onClick={action(() => remote.seek(Math.max(0, currentTime - 10)))}
      />
      <MenuItem
        icon={<SkipForward className="w-3.5 h-3.5" />}
        label="Avançar 10s"
        shortcut="→"
        onClick={action(() => remote.seek(currentTime + 10))}
      />

      <Divider />

      {/* Speed submenu */}
      <div
        className="relative"
        onMouseEnter={() => setShowSpeeds(true)}
        onMouseLeave={() => setShowSpeeds(false)}
      >
        <MenuItem
          icon={<Gauge className="w-3.5 h-3.5" />}
          label="Velocidade"
          badge={`${playbackRate}×`}
          hasSubmenu
          onClick={() => setShowSpeeds((v) => !v)}
        />
        {showSpeeds && (
          <div
            className="absolute left-full top-0 ml-1 min-w-[100px] rounded-xl border
                       border-white/10 bg-zinc-950/95 backdrop-blur-xl shadow-2xl py-1"
          >
            {SPEEDS.map((rate) => (
              <button
                key={rate}
                onClick={action(() => remote.changePlaybackRate(rate))}
                className={`w-full flex items-center justify-between px-4 py-1.5 text-sm
                            transition-colors text-left
                            ${rate === playbackRate
                              ? "text-amber-400 font-semibold bg-amber-500/10"
                              : "text-white/70 hover:text-white hover:bg-white/5"
                            }`}
              >
                {rate}×
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Picture-in-Picture */}
      <MenuItem
        icon={<PictureInPicture className="w-3.5 h-3.5" />}
        label="Picture in Picture"
        onClick={action(() => remote.requestPictureInPicture())}
      />

      {/* Fullscreen */}
      <MenuItem
        icon={<Maximize className="w-3.5 h-3.5" />}
        label="Tela cheia"
        shortcut="F"
        onClick={action(() => remote.requestFullscreen())}
      />

      <Divider />

      {/* External player */}
      <MenuItem
        icon={<ExternalLink className="w-3.5 h-3.5" />}
        label="Abrir externamente"
        onClick={action(onOpenExternal)}
        muted
      />
    </div>
  );

  // Dismiss overlay behind menu
  const backdrop = (
    <div className="fixed inset-0" style={{ zIndex: 9998 }} onClick={onClose} />
  );

  return createPortal(
    <>
      {backdrop}
      {menu}
    </>,
    document.body,
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  badge?: string;
  hasSubmenu?: boolean;
  muted?: boolean;
  onClick: () => void;
}

function MenuItem({ icon, label, shortcut, badge, hasSubmenu, muted, onClick }: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-1.5 transition-colors text-left
                  hover:bg-white/8 ${muted ? "text-white/40 hover:text-white/60" : "text-white/80 hover:text-white"}`}
    >
      <span className="shrink-0 text-white/50">{icon}</span>
      <span className="flex-1 text-sm">{label}</span>
      {badge && <span className="text-xs text-amber-400 font-mono">{badge}</span>}
      {shortcut && !hasSubmenu && (
        <span className="text-xs text-white/30 font-mono">{shortcut}</span>
      )}
      {hasSubmenu && <span className="text-white/30 text-xs">›</span>}
    </button>
  );
}

function Divider() {
  return <div className="mx-2 my-1 border-t border-white/8" />;
}
