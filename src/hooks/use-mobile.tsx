
import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  // Default to false (desktop) for SSR and initial client render before useEffect.
  const [isMobile, setIsMobile] = React.useState(false);
  const [hasMounted, setHasMounted] = React.useState(false);

  React.useEffect(() => {
    setHasMounted(true); // Signal that the component has mounted client-side.

    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    
    // Handler to update state when media query match status changes.
    const onChange = () => {
      setIsMobile(mql.matches);
    };

    // Set the initial state based on the current media query status on the client.
    setIsMobile(mql.matches);

    // Listen for changes.
    mql.addEventListener("change", onChange);

    // Cleanup listener on unmount.
    return () => mql.removeEventListener("change", onChange);
  }, []); // Empty dependency array ensures this runs once on mount.

  // Return the default value (false) if not yet mounted (SSR or pre-hydration client).
  // Return the actual client-side value once mounted.
  return hasMounted ? isMobile : false;
}
