import { useContext, useEffect, useRef, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { SessionContext } from "../../context/SessionContext";
import {
    FaPlay,
    FaPause,
    FaPowerOff,
    FaVolumeUp,
    FaVolumeMute,
    FaExpand,
    FaCompress,
    FaTimes
} from "react-icons/fa";
import "./FloatingVideoPlayer.css";

function formatTime(seconds) {
    if (!seconds || isNaN(seconds) || seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

function FloatingVideoPlayer() {
    const {
        currentVideo,
        pauseVideo,
        resumeVideo,
        stopVideo,
        seekVideo,
        videoSyncCommand
    } = useContext(SessionContext);

    const location = useLocation();
    const isVideosPage = location.pathname === "/videos";

    const playerContainerRef = useRef(null);
    const playerRef = useRef(null);
    const isSeekingRef = useRef(false);
    const ignoreTimerUntilRef = useRef(0);
    const pendingSeekTimeRef = useRef(null);

    const [isPlaying, setIsPlaying] = useState(true);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    // Initialize or reload YouTube player
    useEffect(() => {
        if (!currentVideo) {
            if (playerRef.current) {
                try {
                    playerRef.current.destroy();
                } catch (e) {}
                playerRef.current = null;
            }
            return;
        }

        let isMounted = true;

        function initPlayer() {
            if (!isMounted || !playerContainerRef.current) return;

            if (playerRef.current && typeof playerRef.current.loadVideoById === "function") {
                try {
                    playerRef.current.loadVideoById(currentVideo.videoId);
                    playerRef.current.playVideo();
                    setIsPlaying(true);
                    return;
                } catch (e) {}
            }

            playerRef.current = new window.YT.Player(playerContainerRef.current, {
                width: "100%",
                height: "100%",
                videoId: currentVideo.videoId,
                playerVars: {
                    autoplay: 1,
                    controls: 0,
                    rel: 0,
                    modestbranding: 1,
                    enablejsapi: 1
                },
                events: {
                    onReady: (event) => {
                        if (!isMounted) return;
                        event.target.playVideo();
                        setIsPlaying(true);
                    },
                    onStateChange: (event) => {
                        if (!isMounted) return;
                        if (event.data === 1) {
                            setIsPlaying(true);
                        } else if (event.data === 2) {
                            setIsPlaying(false);
                        } else if (event.data === 0) {
                            setIsPlaying(false);
                        }
                    }
                }
            });
        }

        if (window.YT && window.YT.Player) {
            initPlayer();
        } else {
            if (!document.getElementById("yt-iframe-api")) {
                const tag = document.createElement("script");
                tag.id = "yt-iframe-api";
                tag.src = "https://www.youtube.com/iframe_api";
                document.head.appendChild(tag);
            }
            const checkYt = setInterval(() => {
                if (window.YT && window.YT.Player) {
                    clearInterval(checkYt);
                    initPlayer();
                }
            }, 200);
            return () => clearInterval(checkYt);
        }

        return () => {
            isMounted = false;
        };
    }, [currentVideo?.videoId]);

    // Handle remote synchronization commands (pause, resume, seek, stop)
    useEffect(() => {
        if (!videoSyncCommand || !playerRef.current) return;
        try {
            if (videoSyncCommand.type === "pause") {
                playerRef.current.pauseVideo();
                if (typeof videoSyncCommand.time === "number") {
                    playerRef.current.seekTo(videoSyncCommand.time, true);
                    setCurrentTime(videoSyncCommand.time);
                    ignoreTimerUntilRef.current = Date.now() + 800;
                }
                setIsPlaying(false);
            } else if (videoSyncCommand.type === "resume") {
                if (typeof videoSyncCommand.time === "number") {
                    playerRef.current.seekTo(videoSyncCommand.time, true);
                    setCurrentTime(videoSyncCommand.time);
                    ignoreTimerUntilRef.current = Date.now() + 800;
                }
                playerRef.current.playVideo();
                setIsPlaying(true);
            } else if (videoSyncCommand.type === "stop") {
                playerRef.current.stopVideo();
                setIsPlaying(false);
            } else if (videoSyncCommand.type === "seek") {
                if (typeof videoSyncCommand.time === "number") {
                    playerRef.current.seekTo(videoSyncCommand.time, true);
                    setCurrentTime(videoSyncCommand.time);
                    ignoreTimerUntilRef.current = Date.now() + 800;
                }
            }
        } catch (e) {
            console.warn("YouTube video sync command error:", e);
        }
    }, [videoSyncCommand]);

    // Polling current video playback time
    useEffect(() => {
        if (!isPlaying || !currentVideo) return;

        const timer = setInterval(() => {
            if (
                playerRef.current &&
                typeof playerRef.current.getCurrentTime === "function" &&
                !isSeekingRef.current &&
                Date.now() > ignoreTimerUntilRef.current
            ) {
                try {
                    const cur = playerRef.current.getCurrentTime() || 0;
                    const dur = playerRef.current.getDuration() || 0;
                    setCurrentTime(cur);
                    if (dur > 0 && dur !== duration) setDuration(dur);
                } catch (e) {}
            }
        }, 400);

        return () => clearInterval(timer);
    }, [isPlaying, currentVideo, duration]);

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
            pauseVideo(cur);
            setIsPlaying(false);
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
            resumeVideo(cur);
            setIsPlaying(true);
        }
    }

    function handleTurnOffVideo() {
        if (playerRef.current && typeof playerRef.current.stopVideo === "function") {
            try {
                playerRef.current.stopVideo();
            } catch (e) {}
        }
        stopVideo();
    }

    function handleSeekStart() {
        isSeekingRef.current = true;
    }

    function handleSeekChange(e) {
        const val = parseFloat(e.target.value);
        if (!isNaN(val)) {
            isSeekingRef.current = true;
            pendingSeekTimeRef.current = val;
            setCurrentTime(val);
        }
    }

    const handleSeekCommit = useCallback((e) => {
        if (!isSeekingRef.current && pendingSeekTimeRef.current === null) return;

        let targetTime = pendingSeekTimeRef.current;
        if (targetTime === null && e && e.target && e.target.value !== undefined) {
            targetTime = parseFloat(e.target.value);
        }
        if (targetTime === null || isNaN(targetTime)) {
            targetTime = currentTime;
        }

        const maxDuration = duration > 0 ? duration : (playerRef.current?.getDuration?.() || 0);
        if (maxDuration > 0) {
            targetTime = Math.max(0, Math.min(targetTime, maxDuration));
        }

        if (playerRef.current && typeof playerRef.current.seekTo === "function") {
            try {
                playerRef.current.seekTo(targetTime, true);
            } catch (err) {}
        }
        setCurrentTime(targetTime);
        if (typeof seekVideo === "function") {
            seekVideo(targetTime);
        }
        ignoreTimerUntilRef.current = Date.now() + 800;
        isSeekingRef.current = false;
        pendingSeekTimeRef.current = null;
    }, [duration, currentTime, seekVideo]);

    useEffect(() => {
        function handleGlobalPointerUp(e) {
            if (isSeekingRef.current) {
                handleSeekCommit(e);
            }
        }
        window.addEventListener("pointerup", handleGlobalPointerUp);
        window.addEventListener("touchend", handleGlobalPointerUp);
        return () => {
            window.removeEventListener("pointerup", handleGlobalPointerUp);
            window.removeEventListener("touchend", handleGlobalPointerUp);
        };
    }, [handleSeekCommit]);

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

    if (!currentVideo) return null;

    const playerModeClass = isVideosPage
        ? "video-page-mode video-large"
        : isExpanded
            ? "video-theater-mode video-large"
            : "video-mini-mode video-mini";
    const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div className={`floating-video-root ${playerModeClass}`}>
            {/* Header / Quick Actions */}
            <div className="floating-video-top-bar">
                <div className="floating-video-title-wrap">
                    <span className="live-badge">SYNCED VIDEO</span>
                    <span className="video-title-text" title={currentVideo.title}>
                        {currentVideo.title}
                    </span>
                </div>
                <div className="floating-video-top-actions">
                    {!isVideosPage && (
                        <button
                            className="floating-btn"
                            onClick={() => setIsExpanded(!isExpanded)}
                            title={isExpanded ? "Collapse to Mini" : "Expand to Theater"}
                        >
                            {isExpanded ? <FaCompress /> : <FaExpand />}
                        </button>
                    )}
                    <button
                        className="floating-btn close-video"
                        onClick={handleTurnOffVideo}
                        title="Turn Off Video (Syncs with Room)"
                    >
                        <FaTimes />
                    </button>
                </div>
            </div>

            {/* Video Container Frame */}
            <div className="floating-video-frame-wrap">
                <div ref={playerContainerRef} className="floating-yt-embed" />
            </div>

            {/* Custom Synchronized Controls Deck */}
            <div className="floating-video-controls-deck">
                {/* Progress Slider */}
                <div className="video-progress-wrap">
                    <input
                        type="range"
                        className="video-progress-slider"
                        min="0"
                        max={duration > 0 ? duration : 100}
                        step="any"
                        value={currentTime}
                        disabled={!currentVideo || duration === 0}
                        onPointerDown={handleSeekStart}
                        onTouchStart={handleSeekStart}
                        onMouseDown={handleSeekStart}
                        onChange={handleSeekChange}
                        onPointerUp={handleSeekCommit}
                        onMouseUp={handleSeekCommit}
                        onTouchEnd={handleSeekCommit}
                        style={{
                            background: `linear-gradient(to right, #ec4899 0%, #8b5cf6 ${progressPercent}%, rgba(255,255,255,0.15) ${progressPercent}%, rgba(255,255,255,0.15) 100%)`
                        }}
                    />
                </div>

                <div className="video-controls-row">
                    <div className="video-controls-left">
                        {/* Play / Pause Button */}
                        <button
                            className="video-control-btn play-btn"
                            onClick={handleTogglePlay}
                            title={isPlaying ? "Pause Video (Syncs with Room)" : "Play Video (Syncs with Room)"}
                        >
                            {isPlaying ? <FaPause /> : <FaPlay style={{ marginLeft: 2 }} />}
                        </button>

                        {/* Turn Off Button */}
                        <button
                            className="video-control-btn stop-video-btn"
                            onClick={handleTurnOffVideo}
                            title="Turn Off Video (Syncs with Room)"
                        >
                            <FaPowerOff />
                            <span className="stop-video-label">Turn Off</span>
                        </button>

                        {/* Time */}
                        <div className="video-time-display">
                            <span>{formatTime(currentTime)}</span>
                            <span className="time-sep">/</span>
                            <span>{formatTime(duration)}</span>
                        </div>
                    </div>

                    <div className="video-controls-right">
                        {/* Volume Mute */}
                        <button
                            className="video-control-btn mute-btn"
                            onClick={toggleMute}
                            title={isMuted ? "Unmute" : "Mute"}
                        >
                            {isMuted ? <FaVolumeMute /> : <FaVolumeUp />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default FloatingVideoPlayer;