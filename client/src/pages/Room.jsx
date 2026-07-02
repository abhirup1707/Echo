import { useEffect, useState, useContext } from "react";
import socket from "../socket";
import { SessionContext } from "../context/SessionContext";
function Room() {
  const [username, setUsername] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [members, setMembers] = useState([]);
  const [currentRoom, setCurrentRoom] = useState("");
const {
    setRoomCode: setSessionRoomCode,
    setUsername: setSessionUsername
} = useContext(SessionContext);
  useEffect(() => {
socket.on("session-created", (room) => {

    setCurrentRoom(room.code);

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
    if (!username) {
      alert("Enter your name");
      return;
    }

    socket.emit("create-session", {
      username,
      sessionName: "Echo Session",
    });
  }
setSessionUsername(username);
  function joinRoom() {
    if (!username || !roomCode) {
      alert("Enter your name and room code");
      return;
    }

    socket.emit("join-session", {
      roomCode,
      username,
    });

setCurrentRoom(roomCode);

setSessionRoomCode(roomCode);

setSessionUsername(username);
  }

  return (
    <div style={{ padding: "40px" }}>
      <h1>🎧 Echo Session</h1>

      <br />

      <input
        placeholder="Your Name"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        style={{
          padding: "10px",
          width: "300px",
          fontSize: "16px",
        }}
      />

      <br />
      <br />

      <input
        placeholder="Room Code"
        value={roomCode}
        onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
        style={{
          padding: "10px",
          width: "300px",
          fontSize: "16px",
        }}
      />

      <br />
      <br />

      <button
        onClick={createRoom}
        style={{
          padding: "12px 25px",
          background: "#7c3aed",
          color: "white",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
        }}
      >
        Create Session
      </button>

      <button
        onClick={joinRoom}
        style={{
          padding: "12px 25px",
          marginLeft: "10px",
          background: "#2563eb",
          color: "white",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
        }}
      >
        Join Session
      </button>

      {currentRoom && (
        <>
          <br />
          <br />

          <h2>Session Code</h2>

          <h1
            style={{
              color: "#8b5cf6",
              letterSpacing: "4px",
            }}
          >
            {currentRoom}
          </h1>

          <br />

          <h2>Members ({members.length})</h2>

          <div
            style={{
              marginTop: "15px",
            }}
          >
            {members.map((member) => (
              <div
                key={member.id}
                style={{
                  padding: "12px",
                  marginBottom: "10px",
                  background: "#1f2937",
                  borderRadius: "10px",
                }}
              >
                🎵 {member.username}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default Room;