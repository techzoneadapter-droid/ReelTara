import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./styles.css";

// Measured on a 2 GB Android tablet: backdrop blur dominates scroll draw time.
const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
if (/Android/i.test(navigator.userAgent) && memory !== undefined && memory <= 2) {
  document.documentElement.dataset.lowMemoryAndroid = 'true';
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary><App /></ErrorBoundary>
  </StrictMode>,
);
