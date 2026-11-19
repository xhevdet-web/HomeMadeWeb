import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
// The website's single i18next instance; imported first so every page can translate.
import "./i18n";
import App from "./App";
import { initAnalytics } from "./analytics/analytics";

// Google Analytics, only when VITE_GA_MEASUREMENT_ID is set (production builds).
initAnalytics();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
