/* @refresh reload */
import { hydrate } from "preact";

import App from "./app";

import "./app.css";

const root = document.querySelector("#app");

if (!root) {
  throw new Error("#app is missing");
}

hydrate(<App />, root);
