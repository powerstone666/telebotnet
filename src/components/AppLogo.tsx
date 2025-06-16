import { BotMessageSquare } from 'lucide-react';
import Link from 'next/link';

export function AppLogo() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5 px-2 py-1 font-headline text-xl font-semibold text-sidebar-foreground hover:text-sidebar-primary transition-colors">
      <BotMessageSquare className="h-7 w-7 text-sidebar-primary" />
      TeleMatrix
    </Link>
  );
}
