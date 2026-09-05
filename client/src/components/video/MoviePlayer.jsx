import { useContext, useEffect, useRef, useState, useCallback } from "react";
import { SessionContext } from "../../context/SessionContext";
import { FaPowerOff } from "react-icons/fa";
import socket from "../../socket";
import "./MoviePlayer.css";

function MoviePlayer() {

    const { currentMovie, roomCode, stopMovie } = useContext(SessionContext);
    const videoRef = useRef(null);
    const blobUrlRef = useRef(null);
    const seekingRef = useRef(false);
    const userActionRef = useRef(false);
    const bufferingRef = useRef(false);
    const syncIntervalRef = useRef(null);

    const [playing, setPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [muted, setMuted] = useState(false);
    const [buffering, setBuffering] = useState(false);

    const [downloadProgress, setDownloadProgress] = useState(0);
    const [downloading, setDownloading] = useState(false);
    const [downloadDone, setDownloadDone] = useState(false);
    const [readyCount, setReadyCount] = useState({ ready: 0, total: 0 });
    const [allReady, setAllReady] = useState(false);

    // Download the movie file into memory
    useEffect(() => {
        if (!currentMovie || !roomCode) return;

        // Reset states
        setDownloadProgress(0);
        setDownloading(true);
        setDownloadDone(false);
        setAllReady(false);
        setReadyCount({ ready: 0, total: 0 });
        setPlaying(false);
        setCurrentTime(0);
        setDuration(0);

        // Revoke old blob URL
        if (blobUrlRef.current) {
            URL.revokeObjectURL(blobUrlRef.current);
            blobUrlRef.current = null;
        }

        const fullUrl = `${import.meta.env.VITE_API_URL}${currentMovie.url}`;

        socket.emit("movie-download-start", { roomCode });

        let aborted = false;

        async function downloadMovie() {
            try {
                const response = await fetch(fullUrl);
                if (!response.ok) throw new Error("Download failed");
                if (aborted) return;

                const contentLength = parseInt(response.headers.get("content-length") || "0", 10);
                const reader = response.body.getReader();
                const chunks = [];
                let received = 0;

                while (true) {
                    const { done, value } = await reader.read();
                    if (done || aborted) break;
                    chunks.push(value);
                    received += value.length;
                    if (contentLength > 0) {
                        setDownloadProgress(Math.round((received / contentLength) * 100));
                    } else {
                        setDownloadProgress(-1);
                    }
                }

                if (aborted) return;

                const blob = new Blob(chunks, { type: response.headers.get("content-type") || "video/mp4" });
                const url = URL.createObjectURL(blob);
                blobUrlRef.current = url;

                setDownloadProgress(100);
                setDownloading(false);
                setDownloadDone(true);

                socket.emit("movie-download-done", { roomCode });

            } catch (err) {
                console.error("Movie download failed:", err);
                if (!aborted) {
                    setDownloading(false);
                }
            }
        }

        downloadMovie();

        return () => {
            aborted = true;
        };
    }, [currentMovie, roomCode]);

    // Listen for ready count and all-ready
    useEffect(() => {
        socket.on("movie-ready-count", ({ ready, total }) => {
            setReadyCount({ ready, total });
        });

        socket.on("all-ready", () => {
            setAllReady(true);
        });

        return () => {
            socket.off("movie-ready-count");
            socket.off("all-ready");
        };
    }, []);

    // Sync socket events — only active after all ready
    useEffect(() => {
        if (!currentMovie || !allReady) return;

        socket.on("play-movie", ({ time }) => {
            if (!videoRef.current || seekingRef.current) return;
            if (Math.abs(videoRef.current.currentTime - time) > 2) {
                videoRef.current.currentTime = time;
            }
            userActionRef.current = true;
            videoRef.current.play().then(() => {
                userActionRef.current = false;
            }).catch(() => {
                userActionRef.current = false;
            });
            setPlaying(true);
        });

        socket.on("pause-movie", ({ time }) => {
            if (!videoRef.current || seekingRef.current) return;
            videoRef.current.currentTime = time;
            userActionRef.current = true;
            videoRef.current.pause();
            userActionRef.current = false;
            setPlaying(false);
        });

        socket.on("seek-movie", ({ time }) => {
            if (!videoRef.current || seekingRef.current) return;
            videoRef.current.currentTime = time;
            setCurrentTime(time);
        });

        socket.on("movie-sync", ({ time, playing: isPlaying }) => {
            if (!videoRef.current) return;
            videoRef.current.currentTime = time;
            setCurrentTime(time);
            userActionRef.current = true;
            if (isPlaying) {
                videoRef.current.play().then(() => {
                    userActionRef.current = false;
                }).catch(() => {
                    userActionRef.current = false;
                });
                setPlaying(true);
            } else {
                videoRef.current.pause();
                userActionRef.current = false;
                setPlaying(false);
            }
        });

        socket.on("sync-heartbeat", ({ time }) => {
            if (!videoRef.current || seekingRef.current || bufferingRef.current) return;
            const diff = Math.abs(videoRef.current.currentTime - time);
            if (diff > 3) {
                videoRef.current.currentTime = time;
                setCurrentTime(time);
            }
        });

        socket.on("movie-stopped", () => {
            if (videoRef.current) {
                try {
                    videoRef.current.pause();
                    videoRef.current.src = "";
                } catch (e) {}
            }
            if (blobUrlRef.current) {
                try {
                    URL.revokeObjectURL(blobUrlRef.current);
                    blobUrlRef.current = null;
                } catch (e) {}
            }
            stopMovie();
        });

        return () => {
            socket.off("play-movie");
            socket.off("pause-movie");
            socket.off("seek-movie");
            socket.off("movie-sync");
            socket.off("sync-heartbeat");
            socket.off("movie-stopped");
        };
    }, [currentMovie, allReady]);

    // Periodic heartbeat
    useEffect(() => {
        if (!currentMovie || !roomCode || !allReady) return;

        syncIntervalRef.current = setInterval(() => {
            if (videoRef.current && playing && !bufferingRef.current) {
                socket.emit("heartbeat-movie", {
                    roomCode,
                    time: videoRef.current.currentTime
                });
            }
        }, 4000);

        return () => {
            if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
        };
    }, [currentMovie, roomCode, playing, allReady]);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.volume = muted ? 0 : volume;
        }
    }, [volume, muted]);

    function handlePlay() {
        if (!videoRef.current || !allReady) return;
        userActionRef.current = true;
        videoRef.current.play().then(() => {
            userActionRef.current = false;
        }).catch(() => {
            userActionRef.current = false;
        });
        setPlaying(true);
        socket.emit("play-movie", { roomCode, time: videoRef.current.currentTime });
    }

    function handlePause() {
        if (!videoRef.current || !allReady) return;
        userActionRef.current = true;
        videoRef.current.pause();
        userActionRef.current = false;
        setPlaying(false);
        socket.emit("pause-movie", { roomCode, time: videoRef.current.currentTime });
    }

    function handleSeek(e) {
        if (!videoRef.current || !allReady) return;
        const time = parseFloat(e.target.value);
        videoRef.current.currentTime = time;
        setCurrentTime(time);
        socket.emit("seek-movie", { roomCode, time });
    }

    function handleSeekStart() {
        seekingRef.current = true;
    }

    function handleSeekEnd() {
        seekingRef.current = false;
    }

    function skip(seconds) {
        if (!videoRef.current || !allReady) return;
        const newTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
        videoRef.current.currentTime = newTime;
        setCurrentTime(newTime);
        socket.emit("seek-movie", { roomCode, time: newTime });
    }

    function formatTime(sec) {
        if (!sec || isNaN(sec)) return "0:00";
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${m}:${s.toString().padStart(2, "0")}`;
    }

    function handleTurnOffMovie() {
        if (videoRef.current) {
            try {
                videoRef.current.pause();
                videoRef.current.src = "";
            } catch (e) {}
        }
        if (blobUrlRef.current) {
            try {
                URL.revokeObjectURL(blobUrlRef.current);
                blobUrlRef.current = null;
            } catch (e) {}
        }
        stopMovie();
    }

    if (!currentMovie) return null;

    return (
        <div className="mp-container">
            <div className="mp-header">
                <div className="mp-header-left">
                    <span className="mp-title">🎬 {currentMovie.title}</span>
                    {buffering && <span className="mp-buffering-badge">Buffering...</span>}
                    {downloading && <span className="mp-downloading-badge">Downloading...</span>}
                </div>
                <button
                    className="mp-turn-off-btn"
                    onClick={handleTurnOffMovie}
                    title="Turn Off Movie (Syncs with Room)"
                >
                    <FaPowerOff style={{ marginRight: 6 }} /> Turn Off Movie
                </button>
            </div>

            {/* Download phase */}
            {downloading && (
                <div className="mp-download-section">
                    <div className="mp-download-info">
                        <span className="mp-download-icon">📦</span>
                        <div className="mp-download-text">
                            <span className="mp-download-label">
                                {downloadProgress === -1
                                    ? "Downloading movie to your device..."
                                    : `Downloading movie to your device...`
                                }
                            </span>
                            <span className="mp-download-percent">
                                {downloadProgress === -1 ? "..." : `${downloadProgress}%`}
                            </span>
                        </div>
                    </div>
                    <div className="mp-download-bar-track">
                        <div
                            className="mp-download-bar-fill"
                            style={{
                                width: downloadProgress === -1 ? "100%" : `${downloadProgress}%`,
                                animation: downloadProgress === -1 ? "mpIndeterminate 1.5s ease-in-out infinite" : "none"
                            }}
                        />
                    </div>
                    <span className="mp-download-hint">
                        The movie will play once everyone has downloaded it
                    </span>
                </div>
            )}

            {/* Waiting for others phase */}
            {downloadDone && !allReady && (
                <div className="mp-download-section mp-waiting-section">
                    <div className="mp-download-info">
                        <span className="mp-download-icon">✅</span>
                        <div className="mp-download-text">
                            <span className="mp-download-label">You're ready!</span>
                            <span className="mp-download-count">
                                Waiting for others... ({readyCount.ready}/{readyCount.total})
                            </span>
                        </div>
                    </div>
                    <div className="mp-download-bar-track">
                        <div
                            className="mp-download-bar-fill mp-ready-bar"
                            style={{ width: `${(readyCount.ready / Math.max(readyCount.total, 1)) * 100}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Video player — visible once downloaded */}
            {downloadDone && (
                <>
                    <div className="mp-video-wrap">
                        <video
                            ref={videoRef}
                            src={blobUrlRef.current}
                            className="mp-video"
                            onTimeUpdate={() => {
                                if (!seekingRef.current && videoRef.current) {
                                    setCurrentTime(videoRef.current.currentTime);
                                }
                            }}
                            onLoadedMetadata={() => {
                                if (videoRef.current) {
                                    setDuration(videoRef.current.duration);
                                }
                            }}
                            onWaiting={() => {
                                bufferingRef.current = true;
                                setBuffering(true);
                            }}
                            onPlaying={() => {
                                bufferingRef.current = false;
                                setBuffering(false);
                                if (videoRef.current && !userActionRef.current) {
                                    socket.emit("heartbeat-movie", {
                                        roomCode,
                                        time: videoRef.current.currentTime
                                    });
                                }
                            }}
                            onCanPlay={() => {
                                bufferingRef.current = false;
                                setBuffering(false);
                            }}
                            onClick={() => playing ? handlePause() : handlePlay()}
                        />
                        {buffering && (
                            <div className="mp-buffering-overlay">
                                <div className="mp-buffering-spinner" />
                            </div>
                        )}
                    </div>

                    <div className="mp-controls">
                        <div className="mp-progress-row">
                            <span className="mp-time">{formatTime(currentTime)}</span>
                            <input
                                type="range"
                                className="mp-progress-bar"
                                min={0}
                                max={duration || 100}
                                step={0.1}
                                value={currentTime}
                                onMouseDown={handleSeekStart}
                                onTouchStart={handleSeekStart}
                                onMouseUp={handleSeekEnd}
                                onTouchEnd={handleSeekEnd}
                                onChange={handleSeek}
                                disabled={!allReady}
                            />
                            <span className="mp-time">{formatTime(duration)}</span>
                        </div>

                        <div className="mp-buttons">
                            <div className="mp-left-btns">
                                <button className="mp-btn" onClick={() => skip(-10)} title="Rewind 10s" disabled={!allReady}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
                                    </svg>
                                    <span className="mp-skip-label">10</span>
                                </button>

                                <button className="mp-btn mp-play-btn" onClick={playing ? handlePause : handlePlay} disabled={!allReady}>
                                    {playing ? (
                                        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="4" width="4" height="16" rx="1"/><rect x="15" y="4" width="4" height="16" rx="1"/></svg>
                                    ) : (
                                        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><polygon points="6,4 20,12 6,20"/></svg>
                                    )}
                                </button>

                                <button className="mp-btn mp-stop-btn" onClick={handleTurnOffMovie} title="Turn Off Movie (Syncs with Room)">
                                    <FaPowerOff />
                                </button>

                                <button className="mp-btn" onClick={() => skip(10)} title="Forward 10s" disabled={!allReady}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10"/>
                                    </svg>
                                    <span className="mp-skip-label">10</span>
                                </button>
                            </div>

                            <div className="mp-right-btns">
                                <button className="mp-btn mp-mute-btn" onClick={() => setMuted(!muted)}>
                                    {muted || volume === 0 ? (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
                                        </svg>
                                    ) : volume < 0.5 ? (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                                        </svg>
                                    ) : (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                                        </svg>
                                    )}
                                </button>
                                <input
                                    type="range"
                                    className="mp-volume-bar"
                                    min={0}
                                    max={1}
                                    step={0.05}
                                    value={muted ? 0 : volume}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        setVolume(val);
                                        setMuted(val === 0);
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export default MoviePlayer;
