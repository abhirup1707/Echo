import { useContext, useEffect, useRef } from "react";

import { MusicContext } from "../../context/MusicContext";

function SessionPlayer() {
  const { currentSong } = useContext(MusicContext);

  const containerRef = useRef(null);
  const playerRef = useRef(null);

  // Create the player ONLY ONCE
  useEffect(() => {
    playerRef.current = YouTubePlayer(containerRef.current, {
      width: "900",
      height: "500",
      playerVars: {
        autoplay: 1,
        controls: 1,
        rel: 0,
        modestbranding: 1,
      },
    });

    return () => {
      playerRef.current?.destroy();
    };
  }, []);

  // Whenever the song changes, load it
  useEffect(() => {
    if (!currentSong || !playerRef.current) return;

    playerRef.current.loadVideoById(currentSong.videoId);

    playerRef.current.playVideo().catch(() => {
      console.log("Browser blocked autoplay. User interaction required.");
    });

  }, [currentSong]);

  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        justifyContent: "center",
        marginTop: "30px",
      }}
    >
      <div
        ref={containerRef}
        id="session-player"
      />
    </div>
  );
}

export default SessionPlayer;