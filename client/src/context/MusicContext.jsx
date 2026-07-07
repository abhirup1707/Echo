import { createContext, useEffect, useState } from "react";
import { useContext } from "react";
import { ProfileContext } from "./ProfileContext";
export const MusicContext = createContext();

export default function MusicProvider({ children }) {
  const [currentSong, setCurrentSong] = useState(null);
  const { playSong: updateStats } = useContext(ProfileContext);
const [isPlaying, setIsPlaying] = useState(false);
  const [recentSongs, setRecentSongs] = useState(() => {
    const saved = localStorage.getItem("recentSongs");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem("recentSongs", JSON.stringify(recentSongs));
  }, [recentSongs]);

function playSong(song) {

    setCurrentSong(song);

    setIsPlaying(true);
    updateStats(song);

    setRecentSongs((prev) => {

        const filtered = prev.filter(
            (s) => s.videoId !== song.videoId
        );

        return [song, ...filtered].slice(0, 10);

    });

}

  return (
    <MusicContext.Provider
value={{
    currentSong,
    setCurrentSong,
    playSong,
    recentSongs,
    isPlaying,
    setIsPlaying,
    
}}
    >
      {children}
    </MusicContext.Provider>
  );
}