import { BrowserRouter, Routes, Route } from "react-router-dom";

import "./App.css";

import Home from "./pages/Home";
import Search from "./pages/Search";
import Library from "./pages/Library";
import Playlist from "./pages/Playlist";
import Room from "./pages/Room";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import Signup from "./pages/Signup";

import Navbar from "./components/layout/Navbar";
import Sidebar from "./components/layout/Sidebar";
import BottomPlayer from "./components/player/BottomPlayer";

function App() {
  return (
    <BrowserRouter>

      <Navbar />

      <div className="app">

        <div className="sidebar-container">

          <Sidebar />

        </div>

        <div className="main-content">

          <Routes>

            <Route path="/" element={<Home />} />

            <Route path="/search" element={<Search />} />

            <Route path="/library" element={<Library />} />

            <Route path="/playlist" element={<Playlist />} />

            <Route path="/room" element={<Room />} />

            <Route path="/profile" element={<Profile />} />

            <Route path="/login" element={<Login />} />

            <Route path="/signup" element={<Signup />} />

          </Routes>

        </div>

      </div>

      <BottomPlayer />

    </BrowserRouter>
  );
}

export default App;