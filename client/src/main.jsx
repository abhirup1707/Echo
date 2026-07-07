globalThis.global = globalThis;

import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import "./index.css";
import ProfileProvider from "./context/ProfileContext";
import MusicProvider from "./context/MusicContext";
import SessionProvider from "./context/SessionContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
<ProfileProvider>



<MusicProvider>

<SessionProvider>



<App/>



</SessionProvider>

</MusicProvider>



</ProfileProvider>
  </React.StrictMode>
);