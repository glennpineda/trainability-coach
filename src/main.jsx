import React from "react";
import { createRoot } from "react-dom/client";
/* Before anything renders: the browser's install offer fires once, early, and
   is gone for anybody who starts listening later. See lib/install.js. */
import "./lib/install";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
