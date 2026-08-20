import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SessionContext } from "../../context/SessionContext";
import { ProfileContext } from "../../context/ProfileContext";
import socket from "../../socket";
import SnakeLadderGame from "../../components/games/snakeandladder/SnakeLadderGame";

export default function SnakeLadder() {

    const navigate = useNavigate();
    const { roomCode } = useContext(SessionContext);
    const { profile } = useContext(ProfileContext);
    const [slRoom, setSlRoom] = useState(null);

    useEffect(() => {

        function handleRoom(data) {
            setSlRoom(data);
        }

        function handleFull() {
            alert("Room is full! Max 6 players.");
        }

        socket.on("sl-room", handleRoom);
        socket.on("sl-full", handleFull);

        return () => {
            socket.off("sl-room", handleRoom);
            socket.off("sl-full", handleFull);
        };

    }, []);

    useEffect(() => {
        if (!roomCode) return;
        socket.emit("sl-join", { roomCode, username: profile.username });
    }, [roomCode]);

    if (!roomCode) {
        return (
            <div className="scribble-no-room">
                <h1>🐍 Snake & Ladder</h1>
                <p>Join an Echo Session first.</p>
            </div>
        );
    }

    if (!slRoom) {
        return (
            <div className="scribble-no-room">
                <h1>🐍 Joining Snake & Ladder...</h1>
            </div>
        );
    }

    if (slRoom.status === "waiting") {
        const isHost = slRoom.players.length > 0 && slRoom.players[0].id === socket.id;
        return (
            <div className="scribble-page">
                <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "25px"
                }}>
                    <h1>🐍 Snake & Ladder Lobby</h1>
                    <button onClick={() => {
                        socket.emit("sl-leave", { roomCode });
                        navigate("/games");
                    }}>⬅ Back</button>
                </div>

                <div className="scribble-layout">
                    <div className="scribble-card">
                        <h2>Players ({slRoom.players.length}/6)</h2>
                        <div className="player-list">
                            {slRoom.players.map((p, i) => (
                                <div className="scribble-player" key={p.id}>
                                    <div className="avatar" style={{ background: p.color, color: "#fff" }}>
                                        {i + 1}
                                    </div>
                                    <span>{p.username}</span>
                                    {i === 0 && <strong>👑 Host</strong>}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="settings-card">
                        <h2>⚙ Game Info</h2>
                        <div className="waiting-settings">
                            <div>
                                Players
                                <strong>{slRoom.players.length} / 6</strong>
                            </div>
                            <div>
                                Map
                                <strong>Classic</strong>
                            </div>
                            <div>
                                Goal
                                <strong>Reach 100</strong>
                            </div>
                        </div>
                        {isHost ? (
                            <button
                                className="start-btn"
                                disabled={slRoom.players.length < 2}
                                style={{ marginTop: 16, background: slRoom.players.length < 2 ? "#555" : "#16a34a" }}
                                onClick={() => socket.emit("sl-start", { roomCode })}
                            >
                                ▶ Start Game
                            </button>
                        ) : (
                            <p style={{ color: "#777", marginTop: 16 }}>
                                Waiting for host to start...
                            </p>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <SnakeLadderGame roomCode={roomCode} slRoom={slRoom} />
    );
}
