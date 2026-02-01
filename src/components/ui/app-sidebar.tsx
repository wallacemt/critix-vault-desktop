"use client";

import * as React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import Link from "next/link";
import { Separator } from "./separator";
import { usePathname } from "next/navigation";
import Image from "next/image";


export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathName = usePathname();
  const { state } = useSidebar();
  if (pathName.endsWith("auth")) return null;
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5  flex items-center justify-center"
            >
              <Link href="/owner" role="img" aria-label="Logo">
                <h1
                  className={`font-principal xl:text-4xl md:text-2xl text-[1.8rem] ${
                    state === "collapsed" ? "hidden" : "block"
                  }`}
                >
                  Wallace<span className="text-Destaque">.Dev</span>
                </h1>
                <Image
                  src="https://res.cloudinary.com/dg9hqvlas/image/upload/v1751925493/Black_Creative_W_Letter_Logo-removebg-preview_yka3ae.png"
                  alt="Logo"
                  width={80}
                  height={80}
                  className={`${state === "collapsed" ? "block" : "hidden"} object-cover hover:scale-110`}
                />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <Separator />
      <SidebarContent className="relative z-1">
       {/* Carregar as pastas aqui */}
      </SidebarContent>
      <SidebarFooter>
      {/* Mostrar opcao que leva para configuracoes */}
      </SidebarFooter>
    </Sidebar>
  );
}
