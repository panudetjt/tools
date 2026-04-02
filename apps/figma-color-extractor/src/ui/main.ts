import { mount } from "svelte";

import App from "./app.svelte";

import "./app.css";

const app = document.querySelector("#app");

if (!app) {
  throw new Error("#app is missing");
}

mount(App, {
  target: app,
});
