import "./Home.css";
import { SessionContext } from "../context/SessionContext";
import { ProfileContext } from "../context/ProfileContext";
import { useContext } from "react";
import { MusicContext } from "../context/MusicContext";
import SongCard from "../components/music/SongCard";

function Home() {

    const { addToQueue } = useContext(SessionContext);
const { profile } = useContext(ProfileContext);

    const {

        recentSongs,

        playSong

    } = useContext(MusicContext);

    return (

        <div className="home-page">

            <h1 className="home-title">

                Recently Played

            </h1>

            <div className="home-grid">

                {

                    recentSongs.map(song=>(

<SongCard
    key={song.videoId}
    song={song}
    onPlay={playSong}
    onQueue={(song) => addToQueue(song, profile.username)}
/>

                    ))

                }

            </div>

        </div>

    );

}

export default Home;