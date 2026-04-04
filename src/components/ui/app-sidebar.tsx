"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarTrigger,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import Image from "next/image";
import { Button } from "./button";
import { CircleHelp, FolderPlus, Home, Settings } from "lucide-react";
import { FolderList } from "../features/library/_components/folder-list";
import { Folder } from "@/types/folder";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface AppSidebarProps {
  onAddFolder: () => void;
  folders: Folder[];
  selectedFolder: Folder | null;
  handleFolderSelect: (folder: Folder | null) => Promise<void>;

  removeFolder: (folderId: string) => Promise<void>;
}
export function AppSidebar({
  onAddFolder,
  folders,
  selectedFolder,
  handleFolderSelect,
  removeFolder,
}: AppSidebarProps) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar variant="floating" collapsible="icon" className="border-r border-[var(--border-color)] group-data-[collapsible=icon]:w-24">
      <div
        className="absolute inset-0 z-0 opacity-90 pointer-events-none"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1514306191717-452ec28c7814?q=80&w=400&auto=format&fit=crop')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0   bg-gradient-to-b from-[#121212]/80 via-[#121212]/95 to-[#121212]"></div>
      </div>
      <SidebarHeader className="z-10 border-b border-[var(--border-color)] p-4 md:p-5">
        <div className="flex items-center justify-between gap-2">
          <Link
            href="/library"
            className="flex items-center transition-all hover:scale-105 group-data-[collapsible=icon]:hidden cursor-pointer"
          >
            <Image src={"/images/logo-full.png"} width={100} height={100} alt="Critix Logo" title="Critix" />
            <span className="h-3 w-3 rounded-tl-full rounded-tr-full rounded-bl-full bg-amber-400" />
            <span className="font-display text-4xl font-bold text-text-primary">
              <span className="animate-pulse text-primary">V</span>ault
            </span>
          </Link>

          <Tooltip>
            <TooltipTrigger asChild>
              <SidebarTrigger className="shrink-0 rounded-md border border-[var(--border-color)] bg-[var(--bg-surface-light)] hover:bg-[var(--bg-surface-light)]/70 group-data-[collapsible=icon]:mx-auto" />
            </TooltipTrigger>
            {isCollapsed && (
              <TooltipContent side="right" sideOffset={8}>
                Expandir Menu
              </TooltipContent>
            )}
          </Tooltip>
        </div>

        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onAddFolder}
                size="lg"
                className="w-full rounded-md bg-gradient-to-r from-[var(--color-primary)] to-amber-500 px-4 py-2.5 text-md font-display font-semibold text-on-primary-crx shadow-lg transition-colors hover:from-yellow-500 hover:to-amber-600 group-data-[collapsible=icon]:h-11 group-data-[collapsible=icon]:w-11 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-0"
              >
                <FolderPlus className="h-4 w-4 shrink-0 md:mr-2 group-data-[collapsible=icon]:mr-0" />
                <span className="group-data-[collapsible=icon]:hidden">Adicionar Pasta</span>
              </Button>
            </TooltipTrigger>
            {isCollapsed && (
              <TooltipContent side="right" sideOffset={8}>
                Adicionar Pasta
              </TooltipContent>
            )}
          </Tooltip>
        </motion.div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs text-[var(--text-secondary)] px-4 py-2">
            Pastas Monitoradas
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <FolderList
              folders={folders}
              handleFolderSelect={handleFolderSelect}
              selectedFolder={selectedFolder!}
              removeFolder={removeFolder}
            />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="z-10">
        {/* Settings Link */}
        <SidebarSeparator />
        <div className="p-4 space-y-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="/landing?home=true">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-light)] group-data-[collapsible=icon]:justify-center"
                >
                  <Home className="mr-2 h-4 w-4 group-data-[collapsible=icon]:mr-0" />
                  <span className="group-data-[collapsible=icon]:hidden">Início</span>
                </Button>
              </Link>
            </TooltipTrigger>
            {isCollapsed && (
              <TooltipContent side="right" sideOffset={8}>
                Início
              </TooltipContent>
            )}
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="/settings">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-light)] group-data-[collapsible=icon]:justify-center"
                >
                  <Settings className="mr-2 h-4 w-4 group-data-[collapsible=icon]:mr-0" />
                  <span className="group-data-[collapsible=icon]:hidden">Configurações</span>
                </Button>
              </Link>
            </TooltipTrigger>
            {isCollapsed && (
              <TooltipContent side="right" sideOffset={8}>
                Configurações
              </TooltipContent>
            )}
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="/help">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-light)] group-data-[collapsible=icon]:justify-center"
                >
                  <CircleHelp className="mr-2 h-4 w-4 group-data-[collapsible=icon]:mr-0" />
                  <span className="group-data-[collapsible=icon]:hidden">Ajuda e FAQ</span>
                </Button>
              </Link>
            </TooltipTrigger>
            {isCollapsed && (
              <TooltipContent side="right" sideOffset={8}>
                Ajuda e FAQ
              </TooltipContent>
            )}
          </Tooltip>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
