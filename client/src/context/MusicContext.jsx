import { createContext, useEffect, useState, useContext } from "react";
import { ProfileContext } from "./ProfileContext";

export const MusicContext = createContext();

export default function MusicProvider({ children }) {
  const [currentSong, setCurrentSong] = useState(null);
  const { playSong: updateStats } = useContext(ProfileContext);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [songSyncCommand, setSongSyncCommand] = useState(null);
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
    setCurrentTime(0);
    updateStats(song);

    setRecentSongs((prev) => {
        const filtered = prev.filter(
            (s) => s.videoId !== song.videoId
        );

        return [song, ...filtered].slice(0, 10);
    });
  }

  function pauseSong() {
    setIsPlaying(false);
  }

  function resumeSong() {
    setIsPlaying(true);
  }

  function stopSong() {
    setCurrentSong(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
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
        currentTime,
        setCurrentTime,
        duration,
        setDuration,
        songSyncCommand,
        setSongSyncCommand,
        pauseSong,
        resumeSong,
        stopSong,
      }}
    >
      {children}
    </MusicContext.Provider>
  );
}