import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Handle chunk loading errors automatically (typical after new deployments due to browser caching)
window.addEventListener('error', (e) => {
  if (e.message && (
    e.message.includes('Failed to fetch dynamically imported module') ||
    e.message.includes('dynamically imported module') ||
    e.message.includes('MIME type')
  )) {
    console.warn('Dynamic chunk import failed, reloading page...', e);
    window.location.reload();
  }
}, true);

window.addEventListener('unhandledrejection', (e) => {
  if (e.reason && e.reason.message && (
    e.reason.message.includes('Failed to fetch dynamically imported module') ||
    e.reason.message.includes('dynamically imported module')
  )) {
    console.warn('Dynamic chunk import promise rejected, reloading page...', e.reason);
    window.location.reload();
  }
});

createRoot(document.getElementById("root")!).render(<App />);
