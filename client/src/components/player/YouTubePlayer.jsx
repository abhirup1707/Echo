import { useEffect, useRef } from "react";
import YouTubePlayer from "youtube-player";

function Player({ videoId }) {
  const containerRef = useRef(null);
  const playerRef = useRef(null);

  useEffect(() => {
    playerRef.current = YouTubePlayer(containerRef.current, {
      width: "1",
      height: "1",
      playerVars: {
        autoplay: 1,
        controls: 0,
        rel: 0,
      },
    });

    return () => {
      playerRef.current?.destroy();
    };
  }, []);

  useEffect(() => {
    if (!videoId || !playerRef.current) return;

    // Wait until YouTube player is actually ready
    const interval = setInterval(async () => {
      try {
        const state = await playerRef.current.getPlayerState();

        clearInterval(interval);

        await playerRef.current.loadVideoById(videoId);

        await playerRef.current.playVideo();
      } catch (e) {
        // still not ready
      }
    }, 200);

    return () => clearInterval(interval);
  }, [videoId]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        left: "-9999px",
        width: "1px",
        height: "1px",
      }}
    />
  );
}

export default Player;