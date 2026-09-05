globalThis.global = globalThis;

import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import "./index.css";
import ProfileProvider from "./context/ProfileContext";
import MusicProvider from "./context/MusicContext";
import SessionProvider from "./context/SessionContext";
import VoiceProvider from "./context/VoiceContext";
import { ScribbleProvider } from "./context/ScribbleContext";
import { PlaylistProvider } from "./context/PlaylistContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
<ProfileProvider>



<MusicProvider>

<SessionProvider>

<VoiceProvider>

<ScribbleProvider>

<PlaylistProvider>

<App/>

</PlaylistProvider>

</ScribbleProvider>

</VoiceProvider>

</SessionProvider>

</MusicProvider>



</ProfileProvider>
  </React.StrictMode>
);