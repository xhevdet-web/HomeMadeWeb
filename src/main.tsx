import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
// The website's single i18next instance; imported first so every page can translate.
import "./i18n";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
