
import {
  SidebarProvider,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DashboardClientLayout } from './dashboard-client-layout';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TooltipProvider delayDuration={0}>
      <SidebarProvider defaultOpen>
        <DashboardClientLayout>{children}</DashboardClientLayout>
      </SidebarProvider>
    </TooltipProvider>
  );
}
