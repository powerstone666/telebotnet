
"use client";

import { useState, useEffect, type ReactNode } from 'react';
import { Toaster } from "@/components/ui/toaster";

export function ClientOnlyToaster(): ReactNode {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return <Toaster />;
}
