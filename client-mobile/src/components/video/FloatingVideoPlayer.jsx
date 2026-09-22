import { useContext, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { SessionContext } from "../../context/SessionContext";
import {
    FaExpand,
    FaCompress,
    FaPowerOff
} from "react-icons/fa";
import "./FloatingVideoPlayer.css";

function FloatingVideoPlayer() {
    const {
        currentVideo,
        pauseVideo,
        resumeVideo,
        stopVideo,
        videoSyncCommand
    } = useContext(SessionContext);

    const location = useLocation();
    const isVideosPage = location.pathname === "/videos";

    const playerContainerRef = useRef(null);
    const playerRef = useRef(null);
    const isRemoteSyncRef = useRef(false);

    const [isExpanded, setIsExpanded] = useState(false);

    // Initialize or reload official YouTube player
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

        function applyIframePermissions() {
            try {
                const iframe = playerContainerRef.current?.querySelector("iframe") || playerRef.current?.getIframe?.();
                if (iframe) {
                    iframe.setAttribute("allowfullscreen", "true");
                    iframe.setAttribute("webkitallowfullscreen", "true");
                    iframe.setAttribute("mozallowfullscreen", "true");
                    iframe.setAttribute(
                        "allow",
                        "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                    );
                }
            } catch (e) {}
        }

        function initPlayer() {
            if (!isMounted || !playerContainerRef.current) return;

            if (playerRef.current && typeof playerRef.current.loadVideoById === "function") {
                try {
                    playerRef.current.loadVideoById(currentVideo.videoId);
                    playerRef.current.playVideo();
                    applyIframePermissions();
                    return;
                } catch (e) {}
            }

            playerRef.current = new window.YT.Player(playerContainerRef.current, {
                width: "100%",
                height: "100%",
                videoId: currentVideo.videoId,
                playerVars: {
                    autoplay: 1,
                    controls: 1,       // Official native YouTube controls (official settings gear, quality selector, fullscreen)
                    fs: 1,             // Official native YouTube fullscreen button
                    rel: 0,
                    modestbranding: 0,
                    enablejsapi: 1,
                    playsinline: 1,
                    origin: window.location.origin,
                    iv_load_policy: 3
                },
                events: {
                    onReady: (event) => {
                        if (!isMounted) return;
                        applyIframePermissions();
                        try {
                            event.target.playVideo();
                        } catch (e) {}
                    },
                    onStateChange: (event) => {
                        if (!isMounted) return;
                        if (isRemoteSyncRef.current) return;

                        // Synchronize official YouTube player state with the room
                        if (window.YT && event.data === window.YT.PlayerState.PLAYING) {
                            const cur = event.target.getCurrentTime ? event.target.getCurrentTime() : 0;
                            resumeVideo(cur);
                        } else if (window.YT && event.data === window.YT.PlayerState.PAUSED) {
                            const cur = event.target.getCurrentTime ? event.target.getCurrentTime() : 0;
                            pauseVideo(cur);
                        }
                    }
                }
            });

            // Ensure iframe permissions are set as soon as the DOM element is inserted
            setTimeout(applyIframePermissions, 50);
            setTimeout(applyIframePermissions, 300);
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
            isRemoteSyncRef.current = true;
            if (videoSyncCommand.type === "pause") {
                playerRef.current.pauseVideo();
                if (typeof videoSyncCommand.time === "number") {
                    playerRef.current.seekTo(videoSyncCommand.time, true);
                }
            } else if (videoSyncCommand.type === "resume") {
                if (typeof videoSyncCommand.time === "number") {
                    playerRef.current.seekTo(videoSyncCommand.time, true);
                }
                playerRef.current.playVideo();
            } else if (videoSyncCommand.type === "stop") {
                playerRef.current.stopVideo();
            } else if (videoSyncCommand.type === "seek") {
                if (typeof videoSyncCommand.time === "number") {
                    playerRef.current.seekTo(videoSyncCommand.time, true);
                }
            }
        } catch (e) {
            console.warn("YouTube video sync command error:", e);
        } finally {
            setTimeout(() => {
                isRemoteSyncRef.current = false;
            }, 400);
        }
    }, [videoSyncCommand]);

    function handleTurnOffVideo() {
        if (document.fullscreenElement) {
            try {
                document.exitFullscreen();
            } catch (e) {}
        }
        if (playerRef.current && typeof playerRef.current.stopVideo === "function") {
            try {
                playerRef.current.stopVideo();
            } catch (e) {}
        }
        stopVideo();
    }

    if (!currentVideo) return null;

    const playerModeClass = isVideosPage
        ? "video-page-mode video-large"
        : isExpanded
            ? "video-theater-mode video-large"
            : "video-mini-mode video-mini";

    return (
        <div className={`floating-video-root ${playerModeClass}`}>
            {/* Header / Room Actions */}
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
                        className="floating-btn stop-video-btn-top"
                        onClick={handleTurnOffVideo}
                        title="Turn Off Video (Syncs with Room)"
                    >
                        <FaPowerOff style={{ marginRight: 5, fontSize: 11 }} />
                        <span>Turn Off</span>
                    </button>
                </div>
            </div>

            {/* Official YouTube Video Frame */}
            <div className="floating-video-frame-wrap">
                <div ref={playerContainerRef} className="floating-yt-embed" />
            </div>
        </div>
    );
}

export default FloatingVideoPlayer;