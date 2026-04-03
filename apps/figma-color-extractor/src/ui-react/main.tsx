/* @refresh reload */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./app";

import "./app.css";

const root = document.querySelector("#app");

if (!root) {
  throw new Error("#app is missing");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
