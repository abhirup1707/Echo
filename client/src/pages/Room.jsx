import { useEffect, useState, useContext } from "react";
import socket from "../socket";
import "./Room.css";
import { ProfileContext } from "../context/ProfileContext";
import { MusicContext } from "../context/MusicContext";
import { SessionContext } from "../context/SessionContext";
import { VoiceContext } from "../context/VoiceContext";
import ChatBox from "../components/chat/ChatBox";
import UserAvatar from "../components/common/UserAvatar";
import ShareModal from "../components/common/ShareModal";
import { 
  FaMicrophone, 
  FaMicrophoneSlash, 
  FaVolumeUp, 
  FaVolumeMute, 
  FaQrcode, 
  FaShareAlt, 
  FaCheck, 
  FaCopy 
} from "react-icons/fa";


function Room() {
  const { profile } = useContext(ProfileContext);
  const [username] = useState(profile.username);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [isJoiningPending, setIsJoiningPending] = useState(() => {
    return Boolean(sessionStorage.getItem("echo_auto_join_room"));
  });

  const [roomCode, setRoomCode] = useState(
    sessionStorage.getItem("echo_auto_join_room") ||
    sessionStorage.getItem("echoRoomCode") || ""
  );
 
  
const {
    roomCode: sessionRoomCode,
    setRoomCode: setSessionRoomCode,
    username: sessionUsername,
    setUsername: setSessionUsername,
    members,
    setMembers,
    queue,
    setQueue,
    playNext,
    markChatRead
} = useContext(SessionContext);

const {
    setCurrentSong,
    currentSong,
    isPlaying,
    setIsPlaying
} = useContext(MusicContext);

const {
    isMicOn,
    isSpeakerOn,
    isInCall,
    isConnecting,
    voiceError,
    peerStatuses,
    speakingUsers = {},
    toggleMic,
    toggleSpeaker,
    leaveVoiceCall
} = useContext(VoiceContext);

useEffect(() => {
    if (markChatRead) {
        markChatRead();
    }
}, [markChatRead]);

  // Seamless auto-join for users arriving via an invite link
  useEffect(() => {
    const autoCode = (
      sessionStorage.getItem("echo_auto_join_room") ||
      sessionStorage.getItem("echoRoomCode") ||
      ""
    ).trim().toUpperCase();

    if (autoCode && profile?.username && sessionRoomCode !== autoCode) {
      console.log("⚡ Auto-joining room from invite link:", autoCode);
      sessionStorage.removeItem("echo_auto_join_room");
      sessionStorage.removeItem("echoRoomCode");
      setIsJoiningPending(false);

      socket.emit("join-session", {
        roomCode: autoCode,
        username: profile.username,
        avatar: profile.avatar || ""
      });

      setSessionRoomCode(autoCode);
      setSessionUsername(profile.username);
      setRoomCode(autoCode);
    } else if (sessionRoomCode) {
      setIsJoiningPending(false);
    }
  }, [profile?.username, sessionRoomCode, setSessionRoomCode, setSessionUsername]);

  useEffect(() => {
socket.on("session-created", (room) => {
    setSessionRoomCode(room.code);
    setSessionUsername(username);
    setMembers(room.members);
    setIsJoiningPending(false);
});

    socket.on("members-updated", (members) => {
      setMembers(members);
    });

    socket.on("room-not-found", () => {
      alert("Room not found or session has ended.");
      setIsJoiningPending(false);
      setSessionRoomCode("");
      sessionStorage.removeItem("echo_auto_join_room");
      sessionStorage.removeItem("echoRoomCode");
    });

    return () => {
      socket.off("session-created");
      socket.off("members-updated");
      socket.off("room-not-found");
    };
  }, []);

  function createRoom() {
    if(!profile.username){
      alert("Enter your name");
      return;
    }

socket.emit("create-session", {
    username: profile.username,
    avatar: profile.avatar || "",
    sessionName: "Echo Session"
});
  }

  function joinRoom() {
    if (!username || !roomCode) {
      alert("Enter your name and room code");
      return;
    }

    socket.emit("join-session", {
      roomCode,
      username: profile.username,
      avatar: profile.avatar || "",
    });



setSessionRoomCode(roomCode);

setSessionUsername(username);

sessionStorage.removeItem("echoRoomCode");
  }
function leaveRoom() {

    // Leave voice call
    leaveVoiceCall();

    // Tell server we are leaving
    socket.emit("leave-session", {
        roomCode: sessionRoomCode
    });

    // Stop music
    setCurrentSong(null);
    setIsPlaying(false);

    // Clear local session state
    setSessionRoomCode("");
    setSessionUsername("");
    setMembers([]);
    setQueue([]);
    setIsJoiningPending(false);
    sessionStorage.removeItem("echo_auto_join_room");
    sessionStorage.removeItem("echoRoomCode");

}
return (

<div className="room-page">

<div className="room-top">

<div className="room-title">

<h1>🎧 Echo Session</h1>

<p className="room-code">

Room Code

<strong>

{sessionRoomCode || "------"}

</strong>

<button
className="copy-room-btn"
onClick={() => setShowShareModal(true)}
title="Share Room & QR Code"
>
<FaShareAlt /> Share
</button>



</p>

{

sessionRoomCode && (

<div
className="invite-box"
>

<p>

🔗 Invite Link

</p>

<input

readOnly

value={`${window.location.origin}/join/${sessionRoomCode}`}

/>

<div className="invite-buttons">

<button
type="button"
className="invite-btn qr-btn"
onClick={() => setShowShareModal(true)}
title="Show QR Code & Social Share Options"
>
<FaQrcode /> QR & Share
</button>

<button
type="button"
className={`invite-btn copy-btn ${copiedInvite ? "copied" : ""}`}
onClick={() => {
navigator.clipboard.writeText(`${window.location.origin}/join/${sessionRoomCode}`);
setCopiedInvite(true);
setTimeout(() => setCopiedInvite(false), 2200);
}}
>
{copiedInvite ? <FaCheck /> : <FaCopy />}
<span>{copiedInvite ? "Copied!" : "Copy Link"}</span>
</button>

</div>

</div>

)

}

</div>

{sessionRoomCode && (
    <div className="room-voice-controls-wrapper">
        <div className="room-voice-status">
            <span className={`voice-status-indicator-dot ${isInCall ? "active" : isConnecting ? "connecting" : ""}`} />
            <span>{isInCall ? "Voice Connected" : isConnecting ? "Connecting Voice..." : "Voice Idle"}</span>
        </div>

        <div className="room-voice-actions">
            <button
                type="button"
                className={`room-voice-toggle-btn ${isMicOn ? "mic-on" : "mic-off"}`}
                onClick={toggleMic}
                title={isMicOn ? "Turn Microphone Off (Mute)" : "Turn Microphone On (Unmute)"}
            >
                {isMicOn ? <FaMicrophone /> : <FaMicrophoneSlash />}
                <span>{isMicOn ? "Mic On" : "Mic Off"}</span>
            </button>

            <button
                type="button"
                className={`room-voice-toggle-btn ${isSpeakerOn ? "speaker-on" : "speaker-off"}`}
                onClick={toggleSpeaker}
                title={isSpeakerOn ? "Turn Speaker Off (Deafen)" : "Turn Speaker On"}
            >
                {isSpeakerOn ? <FaVolumeUp /> : <FaVolumeMute />}
                <span>{isSpeakerOn ? "Speaker On" : "Speaker Off"}</span>
            </button>
        </div>

        {voiceError && <span className="room-voice-error-text">⚠️ {voiceError}</span>}
    </div>
)}

<div>

    <button

        className="leave-room-btn"

        onClick={leaveRoom}

    >

        🚪 Leave Session

    </button>

</div>

<div className="room-status">

<div className="status-dot"/>

Connected

</div>

</div>

{!sessionRoomCode ? (
    isJoiningPending ? (
        <div className="room-card" style={{ textAlign: "center", padding: "48px 24px" }}>
            <div
                style={{
                    width: "44px",
                    height: "44px",
                    margin: "0 auto 16px auto",
                    border: "3px solid rgba(124, 58, 237, 0.25)",
                    borderTopColor: "#7c3aed",
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite"
                }}
            />
            <h2>Entering Room #{roomCode}...</h2>
            <p style={{ color: "#9ca3af", marginTop: "8px" }}>Connecting you to the session</p>
        </div>
    ) : (
<div className="room-card">

<h2>Join Session</h2>

<br/>

<div
    style={{
        display: "flex",
        alignItems: "center",
        gap: "15px",
        background: "#1d1d27",
        padding: "15px",
        borderRadius: "12px",
        marginBottom: "20px"
    }}
>

    <UserAvatar
        avatar={profile.avatar}
        username={profile.username}
        size={48}
    />

    <div>

        <div
            style={{
                fontWeight: "bold",
                fontSize: "18px"
            }}
        >
            {profile.username}
        </div>

        <div
            style={{
                color: "#9ca3af",
                fontSize: "13px"
            }}
        >
            Ready to listen 🎵
        </div>

    </div>

</div>

<input

placeholder="Room Code"

value={roomCode}

onChange={(e)=>setRoomCode(e.target.value.toUpperCase())}

style={{

width:"100%",

padding:"12px",

marginBottom:"20px",

borderRadius:"10px",

background:"#26262f",

border:"none",

color:"white"

}}

/>

<button

onClick={createRoom}

style={{

padding:"12px 20px",

marginRight:"10px",

background:"#7c3aed",

color:"white",

border:"none",

borderRadius:"10px",

cursor:"pointer"

}}

>

Create Room

</button>

<button

onClick={joinRoom}

style={{

padding:"12px 20px",

background:"#2563eb",

color:"white",

border:"none",

borderRadius:"10px",

cursor:"pointer"

}}

>

Join Room

</button>

</div>
)

) : (

<>

<div className="room-grid">

<div className="left-column">

    <div className="room-card members-card">

        <h2>

            👥 Members ({members.length})

        </h2>

        {

            members.map(member=>(

                <div
                    className={`member ${speakingUsers[member.id] ? "is-speaking" : ""}`}
                    key={member.id}
                >

                    <div className="member-left">

                        <div className="member-avatar-box">
                            <UserAvatar
                                avatar={member.avatar || (member.username === profile.username ? profile.avatar : "")}
                                username={member.username}
                                size={38}
                            />
                            {speakingUsers[member.id] && <span className="avatar-speaking-glow" />}
                        </div>

                        <div className="member-info-col">
                            <div className="member-name-row">
                                <strong>
                                    {member.username} {member.username === profile.username ? " (You)" : ""}
                                </strong>
                                {speakingUsers[member.id] && (
                                    <div className="voice-talking-bars" title={`${member.username} is speaking`}>
                                        <span className="voice-bar bar-1" />
                                        <span className="voice-bar bar-2" />
                                        <span className="voice-bar bar-3" />
                                        <span className="voice-bar bar-4" />
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>

                    <div className="member-right">
                        <div className="member-voice-status">
                            {member.username === profile.username ? (
                                isMicOn ? (
                                    <span className="member-mic on" title="Your mic is ON"><FaMicrophone /></span>
                                ) : (
                                    <span className="member-mic off" title="Your mic is OFF"><FaMicrophoneSlash /></span>
                                )
                            ) : peerStatuses[member.id]?.isMuted ? (
                                <span className="member-mic off" title={`${member.username}'s mic is OFF`}><FaMicrophoneSlash /></span>
                            ) : (
                                <span className="member-mic on" title={`${member.username}'s mic is ON`}><FaMicrophone /></span>
                            )}

                            {member.username === profile.username ? (
                                !isSpeakerOn && (
                                    <span className="member-speaker off" title="Your speaker is OFF (Deafened)"><FaVolumeMute /></span>
                                )
                            ) : peerStatuses[member.id]?.isDeafened ? (
                                <span className="member-speaker off" title={`${member.username} has speaker OFF`}><FaVolumeMute /></span>
                            ) : null}
                        </div>
                        <div className="online"/>
                    </div>

                </div>

            ))

        }

    </div>

</div>

<div className="right-column">

    {/* Side-by-Side Compact Music Section: Now Playing + Scrollable Queue */}
    <div className="room-music-section">
        {/* Compact Now Playing Card */}
        <div className="room-card now-playing-card compact">
            <div className="now-playing-header">
                <h2>🎵 Now Playing</h2>
            </div>

            {currentSong ? (
                <div className={`playing-card compact ${isPlaying ? "is-playing" : "is-paused"}`}>
                    <div className={`ambient-album-glow-wrap room-size-compact ${isPlaying ? "playing" : "paused"}`}>
                        <div
                            className="ambient-album-glow"
                            style={{ backgroundImage: `url(${currentSong.cover})` }}
                        />
                        <img
                            src={currentSong.cover}
                            className="playing-cover compact"
                            alt={currentSong.title}
                        />
                    </div>

                    <div className="playing-info compact">
                        <div className="room-playing-status-pill compact">
                            <span className={`playing-dot ${isPlaying ? "live" : "paused"}`} />
                            <span className="playing-status-text">{isPlaying ? "Live" : "Paused"}</span>
                            <div className={`music-wave-visualizer mini ${isPlaying ? "playing" : "paused"}`}>
                                <span className="wave-bar bar-1" />
                                <span className="wave-bar bar-2" />
                                <span className="wave-bar bar-3" />
                                <span className="wave-bar bar-4" />
                            </div>
                        </div>

                        <h3 title={currentSong.title}>
                            {currentSong.title}
                        </h3>

                        <p title={currentSong.artist}>
                            {currentSong.artist}
                        </p>
                    </div>
                </div>
            ) : (
                <div className="nothing-playing compact">
                    <span>No music playing</span>
                </div>
            )}
        </div>

        {/* Scrollable Queue Card */}
        <div className="room-card room-queue-card">
            <div className="room-queue-header">
                <h2>🎵 Queue ({queue.length})</h2>
                <button
                    className="room-play-next"
                    onClick={playNext}
                    disabled={queue.length === 0}
                    title={queue.length > 0 ? "Skip to next song" : "Queue is empty"}
                >
                    ▶ Play Next
                </button>
            </div>

            <div className="room-queue-scrollable">
                {queue.length === 0 ? (
                    <div className="room-queue-empty">
                        <p>Queue Empty</p>
                        <small>Add songs from Home or Search</small>
                    </div>
                ) : (
                    queue.map((item, index) => (
                        <div className="room-queue-song" key={index}>
                            <span className="room-queue-num">{index + 1}</span>
                            <img
                                src={item.song.cover}
                                alt={item.song.title}
                                className="room-queue-thumb"
                            />
                            <div className="room-queue-info">
                                <strong title={item.song.title}>
                                    {item.song.title}
                                </strong>
                                <p title={item.song.artist}>
                                    {item.song.artist}
                                </p>
                            </div>
                            <span className="room-queue-adder" title={`Added by ${item.addedBy?.username || "Friend"}`}>
                                👤 {item.addedBy?.username || "Friend"}
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>
    </div>

    {/* Chat Section */}
    <div className="chat-section">
        <ChatBox/>
    </div>

</div>



</div>



</>

)}

{showShareModal && sessionRoomCode && (
  <ShareModal
    roomCode={sessionRoomCode}
    onClose={() => setShowShareModal(false)}
  />
)}

</div>

);
}

export default Room;