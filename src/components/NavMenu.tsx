"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Users,
  MessageSquareText,
  Cable,
  Activity,
  Send,
  KeyRound,
  Group,
  Info,
  Wrench, // Added Wrench icon for Bot Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
} from '@/components/ui/sidebar';

const navItemsData = [
  { href: '/dashboard/token-management', label: 'Token Management', icon: KeyRound },
  { href: '/dashboard/webhook-operations', label: 'Webhook Operations', icon: Cable },
  { href: '/dashboard/get-updates', label: 'Get Updates', icon: Activity },
  { href: '/dashboard/message-log', label: 'Message Log', icon: MessageSquareText },
  { href: '/dashboard/users', label: 'Users', icon: Users },
  { href: '/dashboard/groups', label: 'Groups', icon: Group },
  { href: '/dashboard/send-message', label: 'Send Message/Media', icon: Send },
  { href: '/dashboard/chat-user-info', label: 'Chat/User Info', icon: Info },
  { href: '/dashboard/bot-settings', label: 'Bot Settings', icon: Wrench },
];

// Pre-calculate tooltip props to ensure stable object identity for each menu item
const navMenuItems = navItemsData.map(item => ({
  ...item,
  tooltipProps: { children: item.label, className: "text-xs" }
}));

export function NavMenu() {
  const pathname = usePathname();

  return (
    <SidebarMenu>
      <SidebarGroup>
        <SidebarGroupLabel>Menu</SidebarGroupLabel>
        {navMenuItems.map((item) => ( // Iterate over navMenuItems
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton
              asChild
              isActive={pathname.startsWith(item.href)}
              tooltip={item.tooltipProps} // Use the pre-calculated stable tooltipProps
              className="justify-start"
            >
              <Link href={item.href}>
                <item.icon />
                <span>{item.label}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarGroup>
    </SidebarMenu>
  );
}
