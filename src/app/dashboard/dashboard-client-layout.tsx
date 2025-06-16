
"use client";

import React from 'react';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarInset,
  SidebarTrigger,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { AppLogo } from "@/components/AppLogo";
import { NavMenu } from "@/components/NavMenu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";

export function DashboardClientLayout({ children }: { children: React.ReactNode }) {
  const { isMobile } = useSidebar();

  if (isMobile === undefined) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Loading layout...</p>
      </div>
    );
  }

  return (
    <>
      <Sidebar collapsible="icon" className="border-r border-sidebar-border">
        <SidebarHeader className="p-3 border-b border-sidebar-border">
            <div className="flex items-center justify-between">
              <AppLogo />
              <div className="block group-data-[collapsible=icon]:hidden md:hidden">
                <SidebarTrigger />
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <ScrollArea className="h-full">
              <NavMenu />
            </ScrollArea>
          </SidebarContent>
          <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 py-4 md:hidden">
            <SidebarTrigger />
            <div className="font-headline text-lg font-semibold">TeleMatrix</div>
          </header>
          <main className="flex-1 p-4 md:p-6">
            {children}
          </main>
      </SidebarInset>
    </>
  );
}
