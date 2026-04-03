/* @refresh reload */
import { render } from "preact";

import App from "./app";

import "./app.css";

const root = document.querySelector("#app");

if (!root) {
  throw new Error("#app is missing");
}

render(<App />, root);
