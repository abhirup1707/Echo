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
        sessionStorage.setItem("echo_active_game", "/games/snakeandladder");
        socket.emit("sl-join", { roomCode, username: profile?.username || "Player" });
    }, [roomCode, profile?.username]);

    const handleLeave = () => {
        sessionStorage.removeItem("echo_active_game");
        socket.emit("sl-leave", { roomCode });
        navigate("/games");
    };

    if (!roomCode) {
        return (
            <div className="scribble-no-room">
                <h1>🐍 Snake & Ladder</h1>
                <p>Join an Echo Session first.</p>
                <button
                    style={{
                        marginTop: "20px",
                        padding: "10px 22px",
                        background: "rgba(255, 255, 255, 0.08)",
                        border: "1px solid rgba(255, 255, 255, 0.15)",
                        borderRadius: "12px",
                        color: "white",
                        fontWeight: "700",
                        cursor: "pointer"
                    }}
                    onClick={() => {
                        sessionStorage.removeItem("echo_active_game");
                        navigate("/games");
                    }}
                >
                    ⬅ Back to Games
                </button>
            </div>
        );
    }

    if (!slRoom) {
        return (
            <div className="scribble-no-room">
                <h1>🐍 Joining Snake & Ladder...</h1>
                <button
                    style={{
                        marginTop: "20px",
                        padding: "10px 22px",
                        background: "rgba(255, 255, 255, 0.08)",
                        border: "1px solid rgba(255, 255, 255, 0.15)",
                        borderRadius: "12px",
                        color: "white",
                        fontWeight: "700",
                        cursor: "pointer"
                    }}
                    onClick={handleLeave}
                >
                    ⬅ Back to Games
                </button>
            </div>
        );
    }

    if (slRoom.status === "waiting") {
        const players = slRoom.players || [];
        const isHost = players.length > 0 && players[0].id === socket.id;
        return (
            <div className="scribble-page">
                <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "25px"
                }}>
                    <h1>🐍 Snake & Ladder Lobby</h1>
                    <button onClick={handleLeave}>⬅ Back</button>
                </div>

                <div className="scribble-layout">
                    <div className="scribble-card">
                        <h2>Players ({players.length}/6)</h2>
                        <div className="player-list">
                            {players.map((p, i) => (
                                <div className="scribble-player" key={p.id}>
                                    <div className="avatar" style={{ background: p.color, color: "#fff" }}>
                                        {i + 1}
                                    </div>
                                    <span>{p.username}</span>
                                    {i === 0 && <strong>👑 Host</strong>}
                                </div>
                            ))}
                        </div>

                        {slRoom.spectators && slRoom.spectators.length > 0 && (
                            <div style={{ marginTop: 18, padding: "12px 14px", background: "rgba(168, 85, 247, 0.1)", border: "1px solid rgba(168, 85, 247, 0.25)", borderRadius: 12 }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: "#d8b4fe", marginBottom: 6 }}>
                                    👀 Waiting / Spectators ({slRoom.spectators.length}):
                                </div>
                                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                    {slRoom.spectators.map(s => (
                                        <span key={s.id} style={{ fontSize: 11, padding: "3px 8px", background: "rgba(255,255,255,0.06)", borderRadius: 8, color: "#f1f5f9" }}>
                                            {s.username} {s.id === socket.id ? "(You)" : ""}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="settings-card">
                        <h2>⚙ Game Info</h2>
                        <div className="waiting-settings">
                            <div>
                                Players
                                <strong>{players.length} / 6</strong>
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
                                disabled={players.length < 2}
                                style={{ marginTop: 16, background: players.length < 2 ? "#555" : "#16a34a" }}
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
