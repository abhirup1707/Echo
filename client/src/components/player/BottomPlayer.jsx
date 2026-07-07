import { useContext, useState } from "react";
import { MusicContext } from "../../context/MusicContext";
import { SessionContext } from "../../context/SessionContext";
import {
    FaListUl,
    FaMusic,
    FaCompactDisc
} from "react-icons/fa";

import "./BottomPlayer.css";

function BottomPlayer() {

    const { currentSong } = useContext(MusicContext);

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

                    title="player"

                    allow="autoplay"

                />

            </div>

            <div className="bottom-player">

                <div className="player-left">

                    <img

                        src={currentSong.cover}

                        className="cover"

                        alt="cover"

                    />

                    <div className="song-details">

                        <h3 className="song-name">

                            {currentSong.title}

                        </h3>

                        <p className="artist-name">

                            {currentSong.artist}

                        </p>

                    </div>

                </div>

                <div className="player-center">

                    <FaCompactDisc className="disc"/>

                    <span>

                        Now Playing

                    </span>

                </div>

                <div className="player-right">

                    <button

                        className="queue-btn"

                        onClick={() => setShowQueue(true)}

                    >

                        <FaListUl/>

                        Queue

                    </button>

                </div>

            </div>

            {

                showQueue &&

                <div className="queue-overlay">

                    <div className="queue-panel">

                        <div className="queue-header">

                            <h2>

                                <FaMusic/>

                                Queue

                            </h2>

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

                                disabled={queue.length===0}

                                onClick={playNext}

                            >

                                ▶ Play Next

                            </button>

                        </div>

                        <div className="queue-now-playing">

                            <h4>

                                Now Playing

                            </h4>

                            <div className="queue-song">

                                <img

                                    src={currentSong.cover}

                                    alt=""

                                />

                                <div>

                                    <strong>

                                        {currentSong.title}

                                    </strong>

                                    <p>

                                        {currentSong.artist}

                                    </p>

                                </div>

                            </div>

                        </div>

                        <div className="queue-up-next">

                            <h4>

                                Up Next

                            </h4>

                            {

                                queue.length===0 ?

                                <div className="empty-queue">

                                    <h3>

                                        Queue Empty

                                    </h3>

                                    <p>

                                        Search songs and press +

                                    </p>

                                </div>

                                :

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

                                                👤 {item.addedBy.username}

                                            </small>

                                        </div>

                                    </div>

                                ))

                            }

                        </div>

                    </div>

                </div>

            }

        </>

    );

}

export default BottomPlayer;