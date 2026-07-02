import { useContext, useState } from "react";
import { MusicContext } from "../../context/MusicContext";
import { SessionContext } from "../../context/SessionContext";
import {
  FaVolumeUp,
  FaListUl,
} from "react-icons/fa";

import "./BottomPlayer.css";

function BottomPlayer() {
  const {
    currentSong,
    isPlaying,
    setIsPlaying,
  } = useContext(MusicContext);
  const {
    queue,
    playNext
} = useContext(SessionContext);
const [showQueue, setShowQueue] = useState(false);
  if (!currentSong) return null;

  return (
    <>
      <div className="hidden-player">
        <iframe
          width="1"
          height="1"
          src={`https://www.youtube.com/embed/${currentSong.videoId}?autoplay=1`}
          title="YouTube Player"
          allow="autoplay"
        />
      </div>

      <div className="bottom-player">

        <div className="player-left">

          <img
            src={currentSong.cover}
            alt={currentSong.title}
            className="cover"
          />

          <div>

            <div className="song-name">
              {currentSong.title}
            </div>

            <div className="artist-name">
              {currentSong.artist}
            </div>

          </div>

        </div>

<div className="player-center">

  <button
    className="queue-btn"
    onClick={() => setShowQueue(true)}
  >
    <FaListUl />

    <span>Queue</span>

  </button>

</div>

        <div className="player-right">

          <FaVolumeUp />

          <span>Echo Music</span>

        </div>

      </div>
      {showQueue && (
  <div className="queue-overlay">

    <div className="queue-panel">

      <div className="queue-header">

        <h2>🎵 Queue</h2>

        <button
          className="close-btn"
          onClick={() => setShowQueue(false)}
        >
          ✕
        </button>

      </div>
<div className="queue-controls">

    <button
        className="play-next-btn"
        onClick={playNext}
        disabled={queue.length === 0}
    >
        ▶ Play Next
    </button>

</div>
      <div className="queue-now-playing">

        <h4>Now Playing</h4>

        <div className="queue-song">

          <img
            src={currentSong.cover}
            alt={currentSong.title}
          />

          <div>

            <strong>{currentSong.title}</strong>

            <p>{currentSong.artist}</p>

          </div>

        </div>

      </div>

<div className="queue-up-next">

    <h4>Up Next</h4>

    {

        queue.length === 0 ?

        (

            <>

                <p>No songs in queue.</p>

                <small>

                    Search songs and click +

                </small>

            </>

        )

        :

        (

            queue.map((item,index)=>(

                <div
                    className="queued-song"
                    key={index}
                >

                    <img
                        src={item.song.cover}
                        alt=""
                    />

                    <div className="queued-info">

                        <strong>

                            {item.song.title}

                        </strong>

                        <p>

                            {item.song.artist}

                        </p>

                        <small>

                            👤 Queued by {item.addedBy.username}

                        </small>

                    </div>

                </div>

            ))

        )

    }

</div>

    </div>

  </div>
)}
    </>
  );
}

export default BottomPlayer;