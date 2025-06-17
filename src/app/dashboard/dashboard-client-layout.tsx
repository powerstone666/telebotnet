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
import { MessageCardSkeleton } from '@/components/messages/MessageCardSkeleton'; // Import the skeleton component

export function DashboardClientLayout({ children }: { children: React.ReactNode }) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return (
      <div 
        className="flex flex-col h-screen w-screen items-center justify-center p-4 md:p-6 space-y-4 bg-background"
        suppressHydrationWarning={true}
      >
        {/* Simulate a simplified header/top bar loading state */}
        <div className="h-14 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4"></div>
        
        {/* Display a few skeletons to indicate content loading */}
        <div className="w-full max-w-4xl space-y-4">
            <MessageCardSkeleton />
            <MessageCardSkeleton />
            <MessageCardSkeleton />
        </div>
      </div>
    );
  }

  return (
    // Using React.Fragment shorthand, can't directly apply suppressHydrationWarning here.
    // If the direct children <Sidebar> or <SidebarInset> are getting the attributes, apply it to them.
    <>
      <Sidebar collapsible="icon" className="border-r border-sidebar-border" suppressHydrationWarning={true}>
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

      <SidebarInset suppressHydrationWarning={true}>
        <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 py-4 md:hidden">
            <SidebarTrigger />
            <div className="font-headline text-lg font-semibold">TelebotNet</div>
          </header>
          <main className="flex-1 p-4 md:p-6">
            {children}
          </main>
      </SidebarInset>
    </>
  );
}
