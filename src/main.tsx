import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ShopperApp } from "./shopper/ui/App";
import "./ui/styles.css";
import "./shopper/ui/shopper.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing #root");
}

createRoot(root).render(
  <StrictMode>
    <ShopperApp />
  </StrictMode>,
);
