import { useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { StreamContext } from "../context/StreamContext";
import { SessionContext } from "../context/SessionContext";
import { ProfileContext } from "../context/ProfileContext";
import {
  FaDesktop,
  FaTv,
  FaPlay,
  FaPause,
  FaVolumeUp,
  FaVolumeMute,
  FaExpand,
  FaCompress,
  FaClone,
  FaUsers,
  FaInfoCircle,
  FaStop,
  FaRedo
} from "react-icons/fa";
import "./WatchParty.css";

export default function WatchParty() {
  const navigate = useNavigate();
  const { roomCode } = useContext(SessionContext);
  const { profile } = useContext(ProfileContext);

  const {
    isStreaming,
    activeStream,
    streamError,
    isConnectingStream,
    viewers,
    localStream,
    remoteStream,
    streamVolume,
    setStreamVolume,
    isStreamMuted,
    setIsStreamMuted,
    startStream,
    stopStream,
    joinStream,
    leaveStream
  } = useContext(StreamContext);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const stageContainerRef = useRef(null);

  const [streamTitle, setStreamTitle] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [isPlayingLocally, setIsPlayingLocally] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef(null);

  // Attach local stream to local video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isStreaming]);

  // Attach remote stream to remote video element
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.volume = isStreamMuted ? 0 : streamVolume;
      remoteVideoRef.current.play().catch(err => {
        console.warn("Auto-play failed, waiting for user click:", err);
      });
    }
  }, [remoteStream, streamVolume, isStreamMuted]);

  // Sync volume with remote video element
  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.volume = isStreamMuted ? 0 : streamVolume;
    }
  }, [streamVolume, isStreamMuted]);

  // Track fullscreen changes
  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Auto-hide controls when watching
  function handleMouseMove() {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isFullscreen || isTheaterMode) {
        setShowControls(false);
      }
    }, 3000);
  }

  // Toggle fullscreen
  function toggleFullscreen() {
    if (!stageContainerRef.current) return;
    if (!document.fullscreenElement) {
      stageContainerRef.current.requestFullscreen().catch(err => {
        console.error("Fullscreen error:", err);
      });
    } else {
      document.exitFullscreen().catch(err => {
        console.error("Exit fullscreen error:", err);
      });
    }
  }

  // Toggle Picture-in-Picture
  async function togglePiP() {
    const video = remoteVideoRef.current || localVideoRef.current;
    if (!video) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await video.requestPictureInPicture();
      }
    } catch (err) {
      console.warn("Picture-in-Picture error:", err);
    }
  }

  // Toggle Play / Pause locally
  function toggleLocalPlayback() {
    const video = remoteVideoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().then(() => setIsPlayingLocally(true)).catch(() => {});
    } else {
      video.pause();
      setIsPlayingLocally(false);
    }
  }

  return (
    <div className={`watch-party-page ${isTheaterMode ? "theater-mode-active" : ""}`}>
      {/* Header Bar */}
      <div className="watch-party-top-bar">
        <div className="watch-party-title-wrap">
          <div className="watch-party-title">
            <FaTv className="title-icon" />
            <h1>Watch Party</h1>
          </div>
          <p className="watch-party-subtitle">
            Zero-buffering real-time movie & screen streaming with friends
          </p>
        </div>

        <div className="watch-party-status-group">
          {roomCode && (
            <div className="watch-party-room-badge" onClick={() => navigate("/room")}>
              <span className="room-badge-dot" />
              <span>Room: {roomCode}</span>
            </div>
          )}

          {activeStream && (
            <div className="watch-party-live-pill">
              <span className="live-pulsing-dot" />
              <span className="live-pill-text">LIVE</span>
              <span className="live-streamer-name">
                {isStreaming ? "You" : activeStream.streamerUsername}
              </span>
              {activeStream.hasAudio && (
                <span className="live-audio-pill" title="Audio is streamed">
                  <FaVolumeUp /> Audio
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Container */}
      <div className="watch-party-main-content">
        {/* CASE 1: Not in a Room */}
        {!roomCode ? (
          <div className="watch-party-empty-card">
            <div className="empty-icon-glow">
              <FaUsers />
            </div>
            <h2>Join a Room First</h2>
            <p>
              Watch Party allows you to stream local movies, browser tabs, or your screen directly to your friends with zero buffering and pristine real-time sync.
            </p>
            <div className="empty-card-actions">
              <button
                type="button"
                className="watch-party-primary-btn"
                onClick={() => navigate("/room")}
              >
                Go to Room Session
              </button>
            </div>
          </div>
        ) : isStreaming ? (
          /* CASE 2: Current User is the Host Streamer */
          <div className="streamer-dashboard-stage" ref={stageContainerRef}>
            <div className="streamer-live-header">
              <div className="streamer-badge">
                <span className="live-pulsing-dot" />
                <span>YOU ARE STREAMING LIVE</span>
              </div>

              <div className="streamer-meta">
                <span className="streamer-viewers-count">
                  <FaUsers /> {viewers.length} Watching
                </span>
                <button
                  type="button"
                  className="streamer-stop-btn"
                  onClick={stopStream}
                  title="End Screen Share"
                >
                  <FaStop /> End Stream
                </button>
              </div>
            </div>

            <div className="streamer-monitor-wrapper">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="streamer-monitor-video"
              />
              <div className="streamer-watermark">
                <span>Broadcast Preview (Muted Locally)</span>
              </div>
            </div>

            <div className="streamer-footer-info">
              <div className="streamer-tip">
                <FaInfoCircle />
                <span>
                  Tip: When sharing a movie, select <strong>Chrome Tab</strong> or <strong>Entire Screen</strong> with <em>Share Audio</em> checked for synchronized sound!
                </span>
              </div>
              <div className="streamer-quick-actions">
                <button type="button" className="theater-mode-btn" onClick={togglePiP} title="Picture in Picture">
                  <FaClone /> PiP Preview
                </button>
                <button type="button" className="theater-mode-btn" onClick={toggleFullscreen}>
                  {isFullscreen ? <FaCompress /> : <FaExpand />}
                  <span>{isFullscreen ? "Exit Fullscreen" : "Fullscreen"}</span>
                </button>
              </div>
            </div>
          </div>
        ) : activeStream ? (
          /* CASE 3: A Friend is Streaming (Viewer Stage) */
          <div
            className="viewer-theater-stage"
            ref={stageContainerRef}
            onMouseMove={handleMouseMove}
          >
            <div className="ambient-stream-glow" />

            <div className="viewer-video-container">
              {isConnectingStream && !remoteStream && (
                <div className="viewer-connecting-overlay">
                  <div className="stream-loading-spinner" />
                  <p>Connecting to {activeStream.streamerUsername}'s stream...</p>
                  <button
                    type="button"
                    className="reconnect-stream-btn"
                    onClick={joinStream}
                  >
                    <FaRedo /> Reconnect
                  </button>
                </div>
              )}

              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="viewer-main-video"
                onClick={toggleLocalPlayback}
              />

              {/* Floating Cinema Controls Overlay */}
              <div className={`viewer-controls-bar ${showControls ? "visible" : "hidden"}`}>
                <div className="viewer-controls-left">
                  <button
                    type="button"
                    className="control-icon-btn"
                    onClick={toggleLocalPlayback}
                    title={isPlayingLocally ? "Pause Video" : "Play Video"}
                  >
                    {isPlayingLocally ? <FaPause /> : <FaPlay />}
                  </button>

                  <div className="volume-slider-group">
                    <button
                      type="button"
                      className="control-icon-btn"
                      onClick={() => setIsStreamMuted(!isStreamMuted)}
                      title={isStreamMuted ? "Unmute Stream" : "Mute Stream"}
                    >
                      {isStreamMuted || streamVolume === 0 ? <FaVolumeMute /> : <FaVolumeUp />}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={isStreamMuted ? 0 : streamVolume}
                      onChange={(e) => {
                        setStreamVolume(parseFloat(e.target.value));
                        setIsStreamMuted(false);
                      }}
                      className="stream-volume-slider"
                      title="Adjust Stream Volume"
                    />
                  </div>

                  <div className="live-tag-pill">
                    <span className="live-pulsing-dot" />
                    <span>LIVE</span>
                  </div>
                </div>

                <div className="viewer-controls-center">
                  <span className="viewer-stream-title">
                    {activeStream.streamTitle || `${activeStream.streamerUsername}'s Watch Party`}
                  </span>
                </div>

                <div className="viewer-controls-right">
                  <button
                    type="button"
                    className="control-icon-btn"
                    onClick={togglePiP}
                    title="Picture-in-Picture"
                  >
                    <FaClone />
                  </button>

                  <button
                    type="button"
                    className="control-icon-btn"
                    onClick={() => setIsTheaterMode(!isTheaterMode)}
                    title={isTheaterMode ? "Exit Theater Mode" : "Theater Mode"}
                  >
                    <FaTv />
                  </button>

                  <button
                    type="button"
                    className="control-icon-btn"
                    onClick={toggleFullscreen}
                    title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                  >
                    {isFullscreen ? <FaCompress /> : <FaExpand />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* CASE 4: In Room, but No One is Currently Streaming */
          <div className="watch-party-host-prompt-card">
            <div className="host-prompt-left">
              <div className="host-icon-squircle">
                <FaDesktop />
              </div>
              <div className="host-prompt-text">
                <h2>Start a Watch Party Stream</h2>
                <p>
                  Share a movie playing on your device (VLC, Chrome tab, Netflix, YouTube) directly with everyone in room <strong>{roomCode}</strong>.
                </p>
              </div>
            </div>

            <div className="host-stream-start-box">
              <input
                type="text"
                className="host-stream-title-input"
                placeholder="Stream Title (e.g., Movie Night: Inception)"
                value={streamTitle}
                onChange={(e) => setStreamTitle(e.target.value)}
                maxLength={50}
              />

              <button
                type="button"
                className="start-stream-action-btn"
                onClick={() => startStream({ streamTitle })}
              >
                <FaDesktop />
                <span>Share Screen / Start Stream</span>
              </button>

              {streamError && (
                <div className="stream-error-message">
                  ⚠️ {streamError}
                </div>
              )}
            </div>

            {/* Feature Cards */}
            <div className="watch-party-feature-grid">
              <div className="feature-item-card">
                <div className="feature-icon">⚡</div>
                <h3>Zero Buffering</h3>
                <p>WebRTC peer-to-peer real-time streaming with sub-200ms latency. No uploading or downloading files required.</p>
              </div>

              <div className="feature-item-card">
                <div className="feature-icon">🔊</div>
                <h3>Pristine Audio</h3>
                <p>Captures full stereo audio from your browser tab or system so movies sound cinematic and synchronized.</p>
              </div>

              <div className="feature-item-card">
                <div className="feature-icon">🎬</div>
                <h3>Any Player or App</h3>
                <p>Play movies in VLC, MPV, Windows Media Player, YouTube, or your browser. Anything on your screen can be shared.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
