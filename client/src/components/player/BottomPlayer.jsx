import { useContext, useState, useEffect, useRef } from "react";
import { MusicContext } from "../../context/MusicContext";
import { SessionContext } from "../../context/SessionContext";
import {
    FaListUl,
    FaMusic,
    FaPlay,
    FaPause,
    FaForward,
    FaPowerOff,
    FaVolumeUp,
    FaVolumeMute
} from "react-icons/fa";
import {
    startBackgroundAudio,
    stopBackgroundAudio,
    updateMediaSession
} from "../../utils/backgroundAudio";

import "./BottomPlayer.css";

function formatTime(seconds) {
    if (!seconds || isNaN(seconds) || seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

function BottomPlayer() {
    const {
        currentSong,
        isPlaying,
        setIsPlaying,
        currentTime,
        setCurrentTime,
        duration,
        setDuration,
        songSyncCommand
    } = useContext(MusicContext);

    const {
        queue,
        playNext,
        pauseSong,
        resumeSong,
        stopSong,
        seekSong
    } = useContext(SessionContext);

    const [showQueue, setShowQueue] = useState(false);
    const [isMuted, setIsMuted] = useState(false);

    const playerContainerRef = useRef(null);
    const playerRef = useRef(null);
    const currentVideoIdRef = useRef(null);
    const apiReadyRef = useRef(false);
    const isSeekingRef = useRef(false);

    const playNextRef = useRef(playNext);
    playNextRef.current = playNext;

    const queueRef = useRef(queue);
    queueRef.current = queue;

    useEffect(() => {
        function createPlayer() {
            if (playerRef.current) return;
            if (!playerContainerRef.current) return;

            playerRef.current = new window.YT.Player(playerContainerRef.current, {
                height: "100%",
                width: "100%",
                playerVars: {
                    autoplay: 1,
                    controls: 0,
                    rel: 0,
                    modestbranding: 1,
                    disablekb: 1,
                    playsinline: 1
                },
                events: {
                    onStateChange: (event) => {
                        if (event.data === 1) {
                            // Playing
                            setIsPlaying(true);
                            startBackgroundAudio();
                        } else if (event.data === 2) {
                            // Paused by user or background restriction
                            setIsPlaying(false);
                            // On mobile, if paused because user left the tab, keep the OS audio channel
                            // active so Android keeps the Media Notification ready to resume with one tap!
                            if (document.visibilityState !== "hidden") {
                                stopBackgroundAudio();
                            }
                        } else if (event.data === 0) {
                            // Ended
                            setIsPlaying(false);
                            stopBackgroundAudio();
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

    // Load new song when currentSong changes
    useEffect(() => {
        if (!currentSong) {
            if (playerRef.current && typeof playerRef.current.stopVideo === "function") {
                try {
                    playerRef.current.stopVideo();
                } catch (e) {}
            }
            currentVideoIdRef.current = null;
            return;
        }
        if (!playerRef.current) return;

        const vid = currentSong.videoId;
        if (vid === currentVideoIdRef.current) return;
        currentVideoIdRef.current = vid;

        const loadVideo = async () => {
            for (let attempt = 0; attempt < 20; attempt++) {
                try {
                    await playerRef.current.loadVideoById(vid);
                    await playerRef.current.playVideo();
                    setIsPlaying(true);
                    return;
                } catch (e) {
                    await new Promise(r => setTimeout(r, 400));
                }
            }
        };
        loadVideo();
    }, [currentSong]);

    // Handle remote or local synchronized commands
    useEffect(() => {
        if (!songSyncCommand || !playerRef.current) return;
        try {
            if (songSyncCommand.type === "pause") {
                playerRef.current.pauseVideo();
                if (typeof songSyncCommand.time === "number") {
                    playerRef.current.seekTo(songSyncCommand.time, true);
                    setCurrentTime(songSyncCommand.time);
                }
                stopBackgroundAudio();
            } else if (songSyncCommand.type === "resume") {
                if (typeof songSyncCommand.time === "number") {
                    playerRef.current.seekTo(songSyncCommand.time, true);
                    setCurrentTime(songSyncCommand.time);
                }
                playerRef.current.playVideo();
                startBackgroundAudio();
            } else if (songSyncCommand.type === "stop") {
                playerRef.current.stopVideo();
                currentVideoIdRef.current = null;
                stopBackgroundAudio();
            } else if (songSyncCommand.type === "seek") {
                if (typeof songSyncCommand.time === "number") {
                    playerRef.current.seekTo(songSyncCommand.time, true);
                    setCurrentTime(songSyncCommand.time);
                }
            }
        } catch (e) {
            console.warn("YouTube player command error:", e);
        }
    }, [songSyncCommand]);

    // Keep active audio stream alive across tab visibility & screen locks
    useEffect(() => {
        function handleVisibilityChange() {
            if (document.visibilityState === "hidden") {
                if (isPlaying) {
                    startBackgroundAudio();
                    if (playerRef.current && typeof playerRef.current.getPlayerState === "function") {
                        try {
                            const state = playerRef.current.getPlayerState();
                            if (state !== 1) {
                                playerRef.current.playVideo();
                            }
                        } catch (e) {}
                    }
                }
            } else {
                if (isPlaying && playerRef.current && typeof playerRef.current.getPlayerState === "function") {
                    try {
                        const state = playerRef.current.getPlayerState();
                        if (state === 2) {
                            playerRef.current.playVideo();
                        }
                    } catch (e) {}
                }
            }
        }

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    }, [isPlaying]);

    // Synchronize OS Lock Screen & Media Center (Media Session API)
    useEffect(() => {
        if (!currentSong) {
            stopBackgroundAudio();
            if (typeof navigator !== "undefined" && "mediaSession" in navigator) {
                navigator.mediaSession.playbackState = "none";
            }
            return;
        }

        updateMediaSession({
            title: currentSong.title,
            artist: currentSong.artist,
            cover: currentSong.cover,
            isPlaying,
            duration,
            currentTime,
            onPlay: () => {
                if (playerRef.current && typeof playerRef.current.playVideo === "function") {
                    try { playerRef.current.playVideo(); } catch (e) {}
                }
                resumeSong(currentTime);
                setIsPlaying(true);
                startBackgroundAudio();
            },
            onPause: () => {
                if (playerRef.current && typeof playerRef.current.pauseVideo === "function") {
                    try { playerRef.current.pauseVideo(); } catch (e) {}
                }
                pauseSong(currentTime);
                setIsPlaying(false);
                stopBackgroundAudio();
            },
            onNext: () => {
                if (queueRef.current.length > 0) {
                    playNextRef.current();
                }
            },
            onSeek: (seekTime) => {
                if (playerRef.current && typeof playerRef.current.seekTo === "function") {
                    try { playerRef.current.seekTo(seekTime, true); } catch (e) {}
                }
                seekSong(seekTime);
                setCurrentTime(seekTime);
            },
            onStop: () => {
                handleTurnOff();
            }
        });
    }, [currentSong, isPlaying, duration, Math.floor(currentTime)]);

    // Track playback time
    useEffect(() => {
        if (!isPlaying || !currentSong) return;

        const timer = setInterval(() => {
            if (
                playerRef.current &&
                typeof playerRef.current.getCurrentTime === "function" &&
                !isSeekingRef.current
            ) {
                try {
                    const cur = playerRef.current.getCurrentTime() || 0;
                    const dur = playerRef.current.getDuration() || 0;
                    setCurrentTime(cur);
                    if (dur > 0) setDuration(dur);
                } catch (e) {}
            }
        }, 400);

        return () => clearInterval(timer);
    }, [isPlaying, currentSong]);

    function handleTogglePlay() {
        if (isPlaying) {
            const cur =
                playerRef.current && typeof playerRef.current.getCurrentTime === "function"
                    ? playerRef.current.getCurrentTime()
                    : currentTime;
            if (playerRef.current && typeof playerRef.current.pauseVideo === "function") {
                try {
                    playerRef.current.pauseVideo();
                } catch (e) {}
            }
            pauseSong(cur);
            stopBackgroundAudio();
        } else {
            const cur =
                playerRef.current && typeof playerRef.current.getCurrentTime === "function"
                    ? playerRef.current.getCurrentTime()
                    : currentTime;
            if (playerRef.current && typeof playerRef.current.playVideo === "function") {
                try {
                    playerRef.current.playVideo();
                } catch (e) {}
            }
            resumeSong(cur);
            startBackgroundAudio();
        }
    }

    function handleTurnOff() {
        stopSong();
        stopBackgroundAudio();
        if (playerRef.current && typeof playerRef.current.stopVideo === "function") {
            try {
                playerRef.current.stopVideo();
            } catch (e) {}
        }
        currentVideoIdRef.current = null;
    }

    function handleSeekChange(e) {
        const val = parseFloat(e.target.value);
        setCurrentTime(val);
        isSeekingRef.current = true;
    }

    function handleSeekCommit(e) {
        const val = parseFloat(e.target.value);
        if (playerRef.current && typeof playerRef.current.seekTo === "function") {
            try {
                playerRef.current.seekTo(val, true);
            } catch (err) {}
        }
        seekSong(val);
        isSeekingRef.current = false;
    }

    function toggleMute() {
        if (!playerRef.current) return;
        try {
            if (isMuted) {
                playerRef.current.unMute();
                setIsMuted(false);
            } else {
                playerRef.current.mute();
                setIsMuted(true);
            }
        } catch (e) {}
    }

    const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <>
            <div className="hidden-player">
                <div ref={playerContainerRef} id="yt-player" />
            </div>

            {currentSong && (
                <div className={`bottom-player ${isPlaying ? "is-playing" : "is-paused"}`}>
                    {/* Top edge progress bar */}
                    <div className="player-progress-bar-wrap">
                        <input
                            type="range"
                            className="player-progress-slider"
                            min="0"
                            max={duration || 100}
                            value={currentTime}
                            onChange={handleSeekChange}
                            onMouseUp={handleSeekCommit}
                            onTouchEnd={handleSeekCommit}
                            style={{
                                background: `linear-gradient(to right, #a855f7 0%, #7c3aed ${progressPercent}%, rgba(255,255,255,0.12) ${progressPercent}%, rgba(255,255,255,0.12) 100%)`
                            }}
                        />
                    </div>

                    <div className="player-content">
                        <div className="player-left">
                            <div className={`ambient-album-glow-wrap ${isPlaying ? "playing" : "paused"}`}>
                                <div 
                                    className="ambient-album-glow" 
                                    style={{ backgroundImage: `url(${currentSong.cover})` }} 
                                />
                                <img
                                    src={currentSong.cover}
                                    className="cover"
                                    alt="cover"
                                />
                            </div>
                            <div className="song-details">
                                <div className="song-title-row">
                                    <h3 className="song-name" title={currentSong.title}>
                                        {currentSong.title}
                                    </h3>
                                    <div 
                                        className={`music-wave-visualizer ${isPlaying ? "playing" : "paused"}`} 
                                        title={isPlaying ? "Live Audio" : "Paused"}
                                    >
                                        <span className="wave-bar bar-1" />
                                        <span className="wave-bar bar-2" />
                                        <span className="wave-bar bar-3" />
                                        <span className="wave-bar bar-4" />
                                    </div>
                                </div>
                                <p className="artist-name">
                                    {currentSong.artist}
                                </p>
                            </div>
                        </div>

                        {/* Center Controls */}
                        <div className="player-center">
                            <div className="player-controls-row">
                                {/* Turn Off / Stop Button */}
                                <button
                                    className="player-control-btn stop-btn"
                                    onClick={handleTurnOff}
                                    title="Turn Off Music (Syncs with Room)"
                                >
                                    <FaPowerOff />
                                    <span className="stop-btn-text">Turn Off</span>
                                </button>

                                {/* Play / Pause Button */}
                                <button
                                    className="player-control-btn play-pause-btn"
                                    onClick={handleTogglePlay}
                                    title={isPlaying ? "Pause (Syncs with Room)" : "Play (Syncs with Room)"}
                                >
                                    {isPlaying ? <FaPause /> : <FaPlay style={{ marginLeft: 2 }} />}
                                </button>

                                {/* Next Track Button */}
                                <button
                                    className="player-control-btn next-btn"
                                    onClick={playNext}
                                    disabled={queue.length === 0}
                                    title={queue.length > 0 ? "Play Next in Queue" : "Queue is empty"}
                                >
                                    <FaForward />
                                </button>
                            </div>

                            <div className="player-time-row">
                                <span>{formatTime(currentTime)}</span>
                                <span className="time-divider">/</span>
                                <span>{formatTime(duration)}</span>
                            </div>
                        </div>

                        {/* Right Section */}
                        <div className="player-right">
                            <button
                                className="player-icon-btn mute-btn"
                                onClick={toggleMute}
                                title={isMuted ? "Unmute Audio" : "Mute Audio"}
                            >
                                {isMuted ? <FaVolumeMute /> : <FaVolumeUp />}
                            </button>

                            <button
                                className="queue-btn"
                                onClick={() => setShowQueue(true)}
                                title="View Queue"
                            >
                                <FaListUl />
                                <span className="queue-btn-text">Queue</span>
                                {queue.length > 0 && (
                                    <span className="queue-badge">{queue.length}</span>
                                )}
                            </button>

                            <button
                                className="player-close-quick-btn"
                                onClick={handleTurnOff}
                                title="Turn Off Music"
                            >
                                ✕
                            </button>
                        </div>
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
