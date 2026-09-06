import { BrowserRouter, Routes, Route } from "react-router-dom";

import "./App.css";
import { useContext, useState } from "react";
import { ProfileContext } from "./context/ProfileContext";
import SplashScreen from "./components/common/SplashScreen";
import Welcome from "./pages/Welcome";
import Home from "./pages/Home";
import Search from "./pages/Search";
import Settings from "./pages/Settings";
import Room from "./pages/Room";
import Profile from "./pages/Profile";
import Videos from "./pages/Videos";
import FloatingVideoPlayer from "./components/video/FloatingVideoPlayer";
import VoiceBar from "./components/voice/VoiceBar";
import Navbar from "./components/layout/Navbar";
import Sidebar from "./components/layout/Sidebar";
import BottomPlayer from "./components/player/BottomPlayer";
import MobileNav from "./components/layout/MobileNav";
import BraveInstallBanner from "./components/common/BraveInstallBanner";
import JoinRoom from "./pages/JoinRoom";
import MiniGames from "./pages/MiniGames";
import Scribble from "./pages/games/Scribble";
import Playlist from "./pages/Playlist";
import TicTacToe from "./pages/games/TicTacToe";
import SnakeLadder from "./pages/games/SnakeLadder";
import Uno from "./pages/games/Uno";
import Chess from "./pages/games/Chess";
import Ludo from "./pages/games/Ludo";

function App() {
  const { profile } = useContext(ProfileContext);
  const [showSplash, setShowSplash] = useState(true);

  return (
    <>
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}

      {!profile.username ? (
        <Welcome />
      ) : (
        <BrowserRouter>
          <BraveInstallBanner />
          <Navbar />
          <VoiceBar />
          <div className="app">
            <div className="sidebar-container">
              <Sidebar />
            </div>
            <div className="main-content">
              <FloatingVideoPlayer />
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/search" element={<Search />} />
                <Route path="/videos" element={<Videos />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/room" element={<Room />} />
                <Route path="/join/:roomCode" element={<JoinRoom />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/games" element={<MiniGames />} />
                <Route path="/games/scribble" element={<Scribble />} />
                <Route path="/games/tictactoe" element={<TicTacToe />} />
                <Route path="/games/snakeandladder" element={<SnakeLadder />} />
                <Route path="/games/uno" element={<Uno />} />
                <Route path="/games/chess" element={<Chess />} />
                <Route path="/games/ludo" element={<Ludo />} />
                <Route path="/playlist/:id" element={<Playlist />} />
                <Route path="/playlist/collab/:code" element={<Playlist />} />
              </Routes>
            </div>
          </div>
          <MobileNav />
          <BottomPlayer />
        </BrowserRouter>
      )}
    </>
  );
}

export default App;