import { createContext, useEffect, useState } from "react";

export const MusicContext = createContext();

export default function MusicProvider({ children }) {
  const [currentSong, setCurrentSong] = useState(null);
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