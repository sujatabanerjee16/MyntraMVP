import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { DiscoverApp } from "./ui/App";
import "./ui/styles.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing #root");
}

createRoot(root).render(
  <StrictMode>
    <DiscoverApp />
  </StrictMode>,
);
