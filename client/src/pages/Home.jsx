import { useContext } from "react";
import { MusicContext } from "../context/MusicContext";
import SongCard from "../components/music/SongCard";

function Home() {

  const { recentSongs, playSong } = useContext(MusicContext);

  return (
    <div>

      <h1
        style={{
          marginBottom: "30px",
          fontSize: "38px",
        }}
      >
        Recently Played
      </h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(430px,1fr))",
          gap: "18px",
        }}
      >

        {recentSongs.map((song) => (

          <SongCard

            key={song.videoId}

            song={song}

            onPlay={playSong}

          />

        ))}

      </div>

    </div>
  );
}

export default Home;