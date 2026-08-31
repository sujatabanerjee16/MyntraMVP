import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ShopperApp } from "./ui/App";
import "../ui/styles.css";
import "./ui/shopper.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing #root");
}

createRoot(root).render(
  <StrictMode>
    <ShopperApp />
  </StrictMode>,
);
