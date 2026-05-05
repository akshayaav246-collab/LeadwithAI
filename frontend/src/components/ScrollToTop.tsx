import { useEffect } from "react";
import { useLocation } from "wouter";

export function ScrollToTop() {
  const [location] = useLocation();

  useEffect(() => {
    // Wait for the next paint before scrolling so the new DOM is fully laid out
    // and browser's native scroll restoration doesn't override it.
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    });
  }, [location]);

  return null;
}
