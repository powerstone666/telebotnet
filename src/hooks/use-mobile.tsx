
"use client";

import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile(): boolean | undefined {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);
  const [hasMounted, setHasMounted] = React.useState(false);

  React.useEffect(() => {
    setHasMounted(true); 

    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    
    const onChange = () => {
      setIsMobile(mql.matches);
    };

    setIsMobile(mql.matches);

    mql.addEventListener("change", onChange);

    return () => mql.removeEventListener("change", onChange);
  }, []); 

  if (!hasMounted) {
    return undefined; // Return undefined on server and initial client render before effect runs
  }

  return isMobile; // Return the determined boolean value after mount
}
