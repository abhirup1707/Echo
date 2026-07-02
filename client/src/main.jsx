import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import "./index.css";

import MusicProvider from "./context/MusicContext";
import SessionProvider from "./context/SessionContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <MusicProvider>
      <SessionProvider>
        <App />
      </SessionProvider>
    </MusicProvider>
  </React.StrictMode>
);