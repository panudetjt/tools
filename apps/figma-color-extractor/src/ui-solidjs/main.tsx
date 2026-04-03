/* @refresh reload */
import { render } from "solid-js/web";

import App from "./app";

import "./app.css";

const root = document.querySelector("#app");

if (!root) {
  throw new Error("#app is missing");
}

render(() => <App />, root);
