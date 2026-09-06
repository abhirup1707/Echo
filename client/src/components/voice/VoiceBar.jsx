import { useContext, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { VoiceContext } from "../../context/VoiceContext";
import { SessionContext } from "../../context/SessionContext";
import { ProfileContext } from "../../context/ProfileContext";
import socket from "../../socket";
import {
  FaMicrophone,
  FaMicrophoneSlash,
  FaVolumeUp,
  FaVolumeMute,
  FaPhoneAlt,
  FaPhoneSlash,
  FaChevronUp,
  FaChevronDown,
  FaGamepad,
  FaUsers
} from "react-icons/fa";
import UserAvatar from "../common/UserAvatar";
import "./VoiceBar.css";

export default function VoiceBar() {
  const { roomCode, members = [] } = useContext(SessionContext);
  const { profile } = useContext(ProfileContext);
  const {
    isMicOn,
    isSpeakerOn,
    isInCall,
    isConnecting,
    voiceError,
    peerStatuses = {},
    speakingUsers = {},
    toggleMic,
    toggleSpeaker,
    joinVoiceCall,
    leaveVoiceCall
  } = useContext(VoiceContext);

  const location = useLocation();
  const navigate = useNavigate();

  // Default to collapsed on small screens to avoid obstructing boards/cards
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return window.innerWidth <= 768;
  });

  const isGamePage = location.pathname.startsWith("/games");

  // If not in a room, don't display
  if (!roomCode) return null;

  // On the /room page, the full room controls are displayed in Room.jsx
  if (location.pathname === "/room") return null;

  const isUserSpeaking = (member) => {
    if (!member) return false;
    return Boolean(
      speakingUsers[member.id] ||
      (member.id === socket.id && speakingUsers[socket.id]) ||
      (member.username === profile?.username && speakingUsers[socket.id])
    );
  };

  const isUserMuted = (member) => {
    if (!member) return false;
    if (member.username === profile?.username || member.id === socket.id) {
      return !isMicOn;
    }
    return Boolean(peerStatuses[member.id]?.isMuted);
  };

  const isUserDeafened = (member) => {
    if (!member) return false;
    if (member.username === profile?.username || member.id === socket.id) {
      return !isSpeakerOn;
    }
    return Boolean(peerStatuses[member.id]?.isDeafened);
  };

  const activeSpeakers = members.filter(isUserSpeaking);

  // 1. Collapsed Floating Mini Pill Mode
  if (isCollapsed) {
    return (
      <aside aria-label="Game Voice Pill" className={`voice-pill-floating ${isGamePage ? "in-game" : ""}`}>
        <button
          type="button"
          className="voice-pill-main-btn"
          onClick={() => setIsCollapsed(false)}
          title="Expand Voice Overlay"
        >
          <span className={`voice-bar-dot ${isInCall ? "active" : isConnecting ? "connecting" : ""}`} />
          {isGamePage && <FaGamepad className="voice-pill-game-icon" />}

          {activeSpeakers.length > 0 ? (
            <div className="voice-pill-speaker-preview">
              <div className="voice-bubble mini speaking">
                <UserAvatar
                  avatar={activeSpeakers[0].avatar}
                  username={activeSpeakers[0].username}
                  size={24}
                  className="voice-bubble-user-avatar"
                />
                <div className="voice-talking-bars mini">
                  <span className="voice-bar bar-1" />
                  <span className="voice-bar bar-2" />
                  <span className="voice-bar bar-3" />
                </div>
              </div>
              <span className="voice-pill-speaker-name">
                {activeSpeakers[0].username.slice(0, 8)}
              </span>
            </div>
          ) : (
            <span className="voice-pill-count">
              <FaUsers /> {members.length}
            </span>
          )}

          <FaChevronDown className="voice-pill-chevron" />
        </button>

        {isInCall && (
          <button
            type="button"
            className={`voice-quick-mic-btn ${isMicOn ? "mic-on" : "mic-off"}`}
            onClick={toggleMic}
            title={isMicOn ? "Mute Microphone" : "Unmute Microphone"}
          >
            {isMicOn ? <FaMicrophone /> : <FaMicrophoneSlash />}
          </button>
        )}
      </aside>
    );
  }

  // 2. Expanded Floating Voice Overlay Mode
  return (
    <aside aria-label="Room Voice Call Overlay" className={`voice-overlay-floating ${isGamePage ? "in-game" : ""}`}>
      {/* Header Bar */}
      <div className="voice-overlay-header">
        <div
          className="voice-overlay-title"
          onClick={() => navigate("/room")}
          title="Click to view Room"
        >
          <span className={`voice-bar-dot ${isInCall ? "active" : isConnecting ? "connecting" : ""}`} />
          <span className="voice-overlay-label">
            {isGamePage ? "Game Voice" : "Echo Voice"}
          </span>
          <span className="voice-overlay-roomcode">#{roomCode}</span>
        </div>

        <div className="voice-overlay-header-actions">
          <button
            type="button"
            className="voice-overlay-collapse-btn"
            onClick={() => setIsCollapsed(true)}
            title="Minimize Voice Overlay"
          >
            <FaChevronUp />
          </button>
        </div>
      </div>

      {/* Member Avatar Bubble Strip */}
      <div className="voice-bubble-strip">
        {members.length === 0 ? (
          <span className="voice-strip-empty">No members yet</span>
        ) : (
          members.map((member) => {
            const speaking = isUserSpeaking(member);
            const muted = isUserMuted(member);
            const deafened = isUserDeafened(member);
            const isMe = member.username === profile?.username;

            return (
              <div
                key={member.id || member.username}
                className={`voice-bubble-item ${speaking ? "is-speaking" : ""}`}
                title={`${member.username}${isMe ? " (You)" : ""}${speaking ? " - Speaking..." : muted ? " - Muted" : ""}`}
              >
                <div className="voice-bubble-avatar-wrapper">
                  <UserAvatar
                    avatar={isMe && profile?.avatar ? profile.avatar : member.avatar}
                    username={member.username}
                    size={40}
                    className="voice-bubble-user-avatar"
                  />
                  {speaking && <span className="voice-bubble-glow" />}

                  {/* Animated Equalizer Talking Bars */}
                  {speaking && (
                    <div className="voice-bubble-talking-bars" title="Speaking">
                      <span className="voice-bar bar-1" />
                      <span className="voice-bar bar-2" />
                      <span className="voice-bar bar-3" />
                    </div>
                  )}

                  {/* Badges */}
                  {muted && (
                    <span className="voice-bubble-badge muted" title="Mic Off">
                      <FaMicrophoneSlash />
                    </span>
                  )}
                  {deafened && !muted && (
                    <span className="voice-bubble-badge deafened" title="Speaker Off">
                      <FaVolumeMute />
                    </span>
                  )}
                </div>
                <span className="voice-bubble-name">
                  {isMe ? "You" : member.username}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Floating Controls Bar */}
      <div className="voice-overlay-controls">
        {isInCall ? (
          <>
            <button
              type="button"
              className={`voice-control-btn ${isMicOn ? "mic-on" : "mic-off"}`}
              onClick={toggleMic}
              title={isMicOn ? "Mute Microphone" : "Unmute Microphone"}
            >
              {isMicOn ? <FaMicrophone /> : <FaMicrophoneSlash />}
              <span>{isMicOn ? "Mute" : "Unmute"}</span>
            </button>

            <button
              type="button"
              className={`voice-control-btn ${isSpeakerOn ? "speaker-on" : "speaker-off"}`}
              onClick={toggleSpeaker}
              title={isSpeakerOn ? "Turn Speaker Off (Deafen)" : "Turn Speaker On"}
            >
              {isSpeakerOn ? <FaVolumeUp /> : <FaVolumeMute />}
              <span>{isSpeakerOn ? "Deafen" : "Listen"}</span>
            </button>

            <button
              type="button"
              className="voice-control-btn leave-call-btn"
              onClick={leaveVoiceCall}
              title="Disconnect from Voice Call"
            >
              <FaPhoneSlash />
            </button>
          </>
        ) : (
          <button
            type="button"
            className="voice-control-btn join-call-btn"
            onClick={joinVoiceCall}
            title="Join Voice Chat"
          >
            <FaPhoneAlt />
            <span>Join Voice</span>
          </button>
        )}
      </div>

      {voiceError && (
        <div className="voice-overlay-error" title={voiceError}>
          ⚠️ {voiceError}
        </div>
      )}
    </aside>
  );
}
