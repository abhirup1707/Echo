import { useEffect, useState, useContext } from "react";
import socket from "../socket";
import "./Room.css";
import { ProfileContext } from "../context/ProfileContext";
import { MusicContext } from "../context/MusicContext";
import { SessionContext } from "../context/SessionContext";
import { VoiceContext } from "../context/VoiceContext";
import ChatBox from "../components/chat/ChatBox";
import UserAvatar from "../components/common/UserAvatar";
import { FaMicrophone, FaMicrophoneSlash, FaVolumeUp, FaVolumeMute } from "react-icons/fa";


function Room() {
  const { profile } = useContext(ProfileContext);
  const [username] = useState(profile.username);
const [roomCode, setRoomCode] = useState(

    sessionStorage.getItem("echoRoomCode") || ""

);
 
  
const {

    roomCode: sessionRoomCode,

    setRoomCode:setSessionRoomCode,

    username:sessionUsername,

    setUsername:setSessionUsername,

    members,

    setMembers,

    queue,

    setQueue,

    playNext

}=useContext(SessionContext);

const {
    setCurrentSong,
    currentSong,
    setIsPlaying
} = useContext(MusicContext);

const {
    isMicOn,
    isSpeakerOn,
    isInCall,
    isConnecting,
    voiceError,
    peerStatuses,
    toggleMic,
    toggleSpeaker,
    leaveVoiceCall
} = useContext(VoiceContext);

  useEffect(() => {
socket.on("session-created", (room) => {

    

    setSessionRoomCode(room.code);

    setSessionUsername(username);

    setMembers(room.members);

});
 

    socket.on("members-updated", (members) => {
      setMembers(members);
    });

    socket.on("room-not-found", () => {
      alert("Room not found");
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
onClick={() => {

navigator.clipboard.writeText(sessionRoomCode);

alert("Room code copied!");

}}
>
📋
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

className="invite-btn"

onClick={() => {

navigator.clipboard.writeText(

`${window.location.origin}/join/${sessionRoomCode}`

);



}}

>

📋 Copy Invite

</button>

<button

className="invite-btn"

onClick={async()=>{

const link=

`${window.location.origin}/join/${sessionRoomCode}`;

if(navigator.share){

await navigator.share({

title:"Join my Echo Session",

text:"Join my Echo room!",

url:link

});

}else{

navigator.clipboard.writeText(link);

alert("Invite copied!");

}

}}

>

📤 Share

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
                    className="member"
                    key={member.id}
                >

                    <div className="member-left">

                        <UserAvatar
                            avatar={member.avatar || (member.username === profile.username ? profile.avatar : "")}
                            username={member.username}
                            size={38}
                        />

                        <div>

                            <strong>

                                {member.username} {member.username === profile.username ? " (You)" : ""}

                            </strong>

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

    <div className="room-card now-playing-card">

        <h2>

            🎵 Now Playing

        </h2>

        {

            currentSong ?

            (

                <div className="playing-card">

                    <img

                        src={currentSong.cover}

                        className="playing-cover"

                    />

                    <div className="playing-info">

                        <h3>

                            {currentSong.title}

                        </h3>

                        <p>

                            {currentSong.artist}

                        </p>

                    </div>

                </div>

            )

            :

            <div className="nothing-playing">

                Nothing Playing

            </div>

        }

    </div>

</div>

<div className="chat-column">

    <ChatBox/>

</div>

<div className="queue-column">

    <div className="room-card queue-placeholder">

        <h2>

            🎵 Queue ({queue.length})

        </h2>

        <button

            className="room-play-next"

            onClick={playNext}

            disabled={queue.length===0}

        >

            ▶ Play Next

        </button>

        {

            queue.length===0 ?

            <p
                style={{
                    marginTop:"20px",
                    color:"#888"
                }}
            >

                Queue Empty

            </p>

            :

            queue.map((item,index)=>(

                <div

                    className="room-queue-song"

                    key={index}

                >

                    <img

                        src={item.song.cover}

                        alt=""

                    />

                    <div className="room-queue-info">

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



</>

)}

</div>

);
}

export default Room;