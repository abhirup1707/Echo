import { BrowserRouter, Routes, Route } from "react-router-dom";

import "./App.css";
import { useContext } from "react";
import { ProfileContext } from "./context/ProfileContext";
import Welcome from "./pages/Welcome";
import Home from "./pages/Home";
import Search from "./pages/Search";
import Settings from "./pages/Settings";
import Room from "./pages/Room";
import Profile from "./pages/Profile";
import Videos from "./pages/Videos";
import FloatingVideoPlayer from "./components/video/FloatingVideoPlayer";
import Navbar from "./components/layout/Navbar";
import Sidebar from "./components/layout/Sidebar";
import BottomPlayer from "./components/player/BottomPlayer";
import MobileNav from "./components/layout/MobileNav";
import JoinRoom from "./pages/JoinRoom";
import MiniGames from "./pages/MiniGames";
import Scribble from "./pages/games/Scribble";

function App() {
  const { profile } = useContext(ProfileContext);

if (!profile.username) {

    return <Welcome />;

}
  return (
    <BrowserRouter>

      <Navbar />

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

            

          </Routes>

        </div>

      </div>

      <MobileNav/>

      <BottomPlayer />

    </BrowserRouter>
  );
}

export default App;