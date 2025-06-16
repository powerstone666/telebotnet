
"use client";

import React, { useState, useEffect } from 'react';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarInset,
  SidebarTrigger,
  SidebarRail,
} from "@/components/ui/sidebar";
import { AppLogo } from "@/components/AppLogo";
import { NavMenu } from "@/components/NavMenu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from 'lucide-react';

export function DashboardClientLayout({ children }: { children: React.ReactNode }) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    // Render a minimal loader on the server and initial client render
    return (
      <div className="flex items-center justify-center" style={{minHeight: '100vh'}}>
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  // Actual layout rendered only on the client after mount
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
