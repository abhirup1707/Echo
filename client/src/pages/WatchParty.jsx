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
  FaRedo,
  FaVideo
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
    setStreamError,
    isConnectingStream,
    viewers,
    localStream,
    remoteStream,
    streamVolume,
    setStreamVolume,
    isStreamMuted,
    setIsStreamMuted,
    startStream,
    startCameraStream,
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

  // Track fullscreen changes across all desktop and mobile browsers
  useEffect(() => {
    function handleFullscreenChange() {
      const isNative = Boolean(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );
      if (!isNative && isFullscreen) {
        setIsFullscreen(false);
      }
    }

    const fsEvents = [
      "fullscreenchange",
      "webkitfullscreenchange",
      "mozfullscreenchange",
      "MSFullscreenChange"
    ];
    fsEvents.forEach(evt => document.addEventListener(evt, handleFullscreenChange));

    const video = remoteVideoRef.current || localVideoRef.current;
    const onIosBegin = () => setIsFullscreen(true);
    const onIosEnd = () => setIsFullscreen(false);

    if (video) {
      video.addEventListener("webkitbeginfullscreen", onIosBegin);
      video.addEventListener("webkitendfullscreen", onIosEnd);
    }

    return () => {
      fsEvents.forEach(evt => document.removeEventListener(evt, handleFullscreenChange));
      if (video) {
        video.removeEventListener("webkitbeginfullscreen", onIosBegin);
        video.removeEventListener("webkitendfullscreen", onIosEnd);
      }
    };
  }, [isFullscreen]);

  // Auto-hide controls when watching
  function handleMouseMove() {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isFullscreen || isTheaterMode) {
        setShowControls(false);
      }
    }, 3500);
  }

  // Toggle fullscreen with cross-platform (iOS, Android, Desktop) & CSS fullscreen fallback
  function toggleFullscreen() {
    const container = stageContainerRef.current;
    const video = remoteVideoRef.current || localVideoRef.current;

    const isNativeFs = Boolean(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
    );

    if (isFullscreen || isNativeFs) {
      // Exit fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }

      if (video && video.webkitExitFullscreen) {
        try {
          video.webkitExitFullscreen();
        } catch (e) {}
      }
      setIsFullscreen(false);
    } else {
      // Enter fullscreen
      setIsFullscreen(true);
      let nativeSucceeded = false;

      if (container) {
        if (container.requestFullscreen) {
          container.requestFullscreen().then(() => { nativeSucceeded = true; }).catch(() => {});
        } else if (container.webkitRequestFullscreen) {
          container.webkitRequestFullscreen();
          nativeSucceeded = true;
        } else if (container.mozRequestFullScreen) {
          container.mozRequestFullScreen();
          nativeSucceeded = true;
        } else if (container.msRequestFullscreen) {
          container.msRequestFullscreen();
          nativeSucceeded = true;
        }
      }

      // iOS Safari fallback on video element
      if (!nativeSucceeded && video && video.webkitEnterFullscreen) {
        try {
          video.webkitEnterFullscreen();
        } catch (e) {}
      }
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
          <div
            className={`streamer-dashboard-stage ${isFullscreen ? "stage-fullscreen" : ""}`}
            ref={stageContainerRef}
          >
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

              {/* Dedicated Fullscreen Button for mobile & desktop */}
              <button
                type="button"
                className="quick-fullscreen-badge"
                onClick={toggleFullscreen}
                title={isFullscreen ? "Exit Fullscreen" : "Full Screen"}
              >
                {isFullscreen ? <FaCompress /> : <FaExpand />}
                <span>{isFullscreen ? "Exit Full" : "Full Screen"}</span>
              </button>
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
                <button
                  type="button"
                  className={`theater-mode-btn ${isFullscreen ? "active-fs-btn" : ""}`}
                  onClick={toggleFullscreen}
                >
                  {isFullscreen ? <FaCompress /> : <FaExpand />}
                  <span>{isFullscreen ? "Exit Fullscreen" : "Fullscreen"}</span>
                </button>
              </div>
            </div>
          </div>
        ) : activeStream ? (
          /* CASE 3: A Friend is Streaming (Viewer Stage) */
          <div
            className={`viewer-theater-stage ${isFullscreen ? "stage-fullscreen" : ""}`}
            ref={stageContainerRef}
            onMouseMove={handleMouseMove}
          >
            <div className="ambient-stream-glow" />

            <div className="viewer-video-container">
              {/* Dedicated Quick Fullscreen Button in top-right for mobile & desktop */}
              <button
                type="button"
                className={`quick-fullscreen-badge ${showControls ? "visible" : "hidden"}`}
                onClick={toggleFullscreen}
                title={isFullscreen ? "Exit Fullscreen" : "Full Screen"}
              >
                {isFullscreen ? <FaCompress /> : <FaExpand />}
                <span>{isFullscreen ? "Exit Full" : "Full Screen"}</span>
              </button>

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
                  {/* Fullscreen Button - first and prominent so never clipped on mobile */}
                  <button
                    type="button"
                    className={`control-icon-btn fullscreen-control-btn ${isFullscreen ? "active-fs" : ""}`}
                    onClick={toggleFullscreen}
                    title={isFullscreen ? "Exit Fullscreen" : "Full Screen"}
                  >
                    {isFullscreen ? <FaCompress /> : <FaExpand />}
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
                    onClick={togglePiP}
                    title="Picture-in-Picture (Popup)"
                  >
                    <FaClone />
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
                  Share a movie playing on your device (VLC, Chrome tab, Netflix, YouTube) or stream your live camera directly with everyone in room <strong>{roomCode}</strong>.
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

              <div className="host-stream-buttons-group">
                <button
                  type="button"
                  className="start-stream-action-btn"
                  onClick={() => startStream({ streamTitle })}
                  title="Share your desktop screen, browser tab, or app"
                >
                  <FaDesktop />
                  <span>Share Screen</span>
                </button>

                <button
                  type="button"
                  className="start-camera-action-btn"
                  onClick={() => startCameraStream({ streamTitle })}
                  title="Stream live camera and audio from your phone or PC"
                >
                  <FaVideo />
                  <span>Share Camera</span>
                </button>
              </div>

              {streamError && (
                <div className="stream-error-message">
                  <div className="stream-error-text">⚠️ {streamError}</div>
                  <button
                    type="button"
                    className="stream-camera-fallback-btn"
                    onClick={() => {
                      setStreamError(null);
                      startCameraStream({ streamTitle });
                    }}
                  >
                    <FaVideo /> Stream with Camera Instead
                  </button>
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
