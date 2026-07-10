import { useEffect, useState, useContext } from "react";
import socket from "../socket";
import "./Room.css";
import { ProfileContext } from "../context/ProfileContext";
import { MusicContext } from "../context/MusicContext";
import { SessionContext } from "../context/SessionContext";
import ChatBox from "../components/chat/ChatBox";


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
    });



setSessionRoomCode(roomCode);

setSessionUsername(username);

sessionStorage.removeItem("echoRoomCode");
  }
function leaveRoom() {

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

alert("Invite link copied!");

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

    <div
        style={{
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            background: "#7c3aed",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            fontWeight: "bold",
            fontSize: "20px"
        }}
    >
        {profile.username.charAt(0).toUpperCase()}
    </div>

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

                        <div className="avatar">

                            {member.username.charAt(0).toUpperCase()}

                        </div>

                        <div>

                            <strong>

                                {member.username}

                            </strong>

                        </div>

                    </div>

                    <div className="online"/>

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