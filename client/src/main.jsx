globalThis.global = globalThis;

import React from "react";
import ReactDOM from "react-dom/client";
import WebRTCProvider from "./context/WebRTCContext";
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

<WebRTCProvider>

<App/>

</WebRTCProvider>

</SessionProvider>

</MusicProvider>



</ProfileProvider>
  </React.StrictMode>
);