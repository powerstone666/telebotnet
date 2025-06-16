"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Users,
  MessageSquareText,
  Settings2,
  Cable,
  DownloadCloud,
  Send,
  Activity,
  KeyRound,
  Group,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
} from '@/components/ui/sidebar';

const navItems = [
  { href: '/dashboard/token-management', label: 'Token Management', icon: KeyRound },
  { href: '/dashboard/webhook-operations', label: 'Webhook Operations', icon: Cable },
  { href: '/dashboard/get-updates', label: 'Get Updates', icon: Activity },
  { href: '/dashboard/message-log', label: 'Message Log', icon: MessageSquareText },
  { href: '/dashboard/users', label: 'Users', icon: Users },
  { href: '/dashboard/groups', label: 'Groups', icon: Group },
  { href: '/dashboard/send-message', label: 'Send Message', icon: Send },
];

export function NavMenu() {
  const pathname = usePathname();

  return (
    <SidebarMenu>
      <SidebarGroup>
        <SidebarGroupLabel>Menu</SidebarGroupLabel>
        {navItems.map((item) => (
          <SidebarMenuItem key={item.href}>
            <Link href={item.href} passHref legacyBehavior>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith(item.href)}
                tooltip={{ children: item.label, className: "text-xs" }}
                className="justify-start"
              >
                <a>
                  <item.icon />
                  <span>{item.label}</span>
                </a>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        ))}
      </SidebarGroup>
    </SidebarMenu>
  );
}
