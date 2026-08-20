import { useContext, useState, useEffect, useRef } from "react";
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

    const playerContainerRef = useRef(null);
    const playerRef = useRef(null);
    const currentVideoIdRef = useRef(null);
    const apiReadyRef = useRef(false);

    const playNextRef = useRef(playNext);
    playNextRef.current = playNext;

    const queueRef = useRef(queue);
    queueRef.current = queue;

    useEffect(() => {
        function createPlayer() {
            if (playerRef.current) return;
            if (!playerContainerRef.current) return;

            playerRef.current = new window.YT.Player(playerContainerRef.current, {
                height: "1",
                width: "1",
                playerVars: {
                    autoplay: 1,
                    controls: 0,
                    rel: 0,
                    modestbranding: 1,
                    disablekb: 1
                },
                events: {
                    onStateChange: (event) => {
                        if (event.data === 0) {
                            if (queueRef.current.length > 0) {
                                playNextRef.current();
                            }
                        }
                    }
                }
            });
        }

        function onYouTubeIframeAPIReady() {
            apiReadyRef.current = true;
            createPlayer();
        }

        if (window.YT && window.YT.Player) {
            onYouTubeIframeAPIReady();
            return;
        }

        if (!document.getElementById("yt-iframe-api")) {
            const tag = document.createElement("script");
            tag.id = "yt-iframe-api";
            tag.src = "https://www.youtube.com/iframe_api";
            document.head.appendChild(tag);
        }

        window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;
    }, []);

    useEffect(() => {
        if (!currentSong) return;
        if (!playerRef.current) return;

        const vid = currentSong.videoId;
        if (vid === currentVideoIdRef.current) return;
        currentVideoIdRef.current = vid;

        const loadVideo = async () => {
            for (let attempt = 0; attempt < 20; attempt++) {
                try {
                    await playerRef.current.loadVideoById(vid);
                    return;
                } catch (e) {
                    await new Promise(r => setTimeout(r, 500));
                }
            }
        };
        loadVideo();
    }, [currentSong]);

    return (

        <>

            <div className="hidden-player">

                <div ref={playerContainerRef} id="yt-player" />

            </div>

            {currentSong && (

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

            )}

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
