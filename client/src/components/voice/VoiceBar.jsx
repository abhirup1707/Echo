import { useContext } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { VoiceContext } from "../../context/VoiceContext";
import { SessionContext } from "../../context/SessionContext";
import { FaMicrophone, FaMicrophoneSlash, FaVolumeUp, FaVolumeMute } from "react-icons/fa";
import "./VoiceBar.css";

export default function VoiceBar() {
  const { roomCode } = useContext(SessionContext);
  const {
    isMicOn,
    isSpeakerOn,
    isInCall,
    isConnecting,
    voiceError,
    toggleMic,
    toggleSpeaker
  } = useContext(VoiceContext);

  const location = useLocation();
  const navigate = useNavigate();

  // If not in a room, don't display
  if (!roomCode) return null;

  // On the /room page, the full room controls are displayed in Room.jsx
  if (location.pathname === "/room") return null;

  return (
    <aside aria-label="Room Voice Call Controls" className="voice-bar-floating">
      <div
        className="voice-bar-info"
        onClick={() => navigate("/room")}
        title="Go to Echo Room"
      >
        <span className={`voice-bar-dot ${isInCall ? "active" : isConnecting ? "connecting" : ""}`} />
        <span className="voice-bar-label">
          {isInCall ? `Voice Room: ${roomCode}` : isConnecting ? "Connecting Voice..." : "Voice Idle"}
        </span>
      </div>

      <div className="voice-bar-actions">
        <button
          type="button"
          className={`voice-bar-btn ${isMicOn ? "mic-on" : "mic-off"}`}
          onClick={toggleMic}
          title={isMicOn ? "Mute Microphone" : "Unmute Microphone"}
        >
          {isMicOn ? <FaMicrophone /> : <FaMicrophoneSlash />}
          <span className="voice-btn-text">{isMicOn ? "Mic On" : "Mic Off"}</span>
        </button>

        <button
          type="button"
          className={`voice-bar-btn ${isSpeakerOn ? "speaker-on" : "speaker-off"}`}
          onClick={toggleSpeaker}
          title={isSpeakerOn ? "Turn Speaker Off (Deafen)" : "Turn Speaker On"}
        >
          {isSpeakerOn ? <FaVolumeUp /> : <FaVolumeMute />}
          <span className="voice-btn-text">{isSpeakerOn ? "Speaker On" : "Speaker Off"}</span>
        </button>
      </div>

      {voiceError && (
        <span className="voice-bar-error" title={voiceError}>
          ⚠️ {voiceError}
        </span>
      )}
    </aside>
  );
}
