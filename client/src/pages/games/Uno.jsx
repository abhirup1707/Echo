import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SessionContext } from "../../context/SessionContext";
import { ProfileContext } from "../../context/ProfileContext";
import socket from "../../socket";
import UnoGame from "../../components/games/uno/UnoGame";

export default function Uno() {
    const navigate = useNavigate();
    const { roomCode } = useContext(SessionContext);
    const { profile } = useContext(ProfileContext);
    const [unoRoom, setUnoRoom] = useState(null);

    useEffect(() => {
        function handleRoom(data) {
            setUnoRoom(data);
        }

        function handleFull() {
            alert("UNO room is full! Maximum 15 players allowed.");
        }

        function handleError(err) {
            if (err?.message) alert(err.message);
        }

        socket.on("uno-room", handleRoom);
        socket.on("uno-full", handleFull);
        socket.on("uno-error", handleError);

        return () => {
            socket.off("uno-room", handleRoom);
            socket.off("uno-full", handleFull);
            socket.off("uno-error", handleError);
        };
    }, []);

    useEffect(() => {
        if (!roomCode) return;
        sessionStorage.setItem("echo_active_game", "/games/uno");
        socket.emit("uno-join", { roomCode, username: profile?.username || "Player" });
    }, [roomCode, profile?.username]);

    const handleLeave = () => {
        sessionStorage.removeItem("echo_active_game");
        if (roomCode) {
            socket.emit("uno-leave", { roomCode });
        }
        navigate("/games");
    };

    const handleStart = () => {
        if (roomCode) {
            socket.emit("uno-start", { roomCode });
        }
    };

    if (!roomCode) {
        return (
            <div className="scribble-no-room" style={{ textAlign: "center", padding: "60px 20px" }}>
                <h1 style={{ fontSize: 36, fontWeight: 800, background: "linear-gradient(135deg, #ef4444 0%, #eab308 50%, #3b82f6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 12 }}>
                    🎴 UNO
                </h1>
                <p style={{ color: "#94a3b8", fontSize: 16 }}>Join an Echo Session first to play UNO with your room!</p>
                <button
                    style={{
                        marginTop: "24px",
                        padding: "12px 28px",
                        background: "rgba(255, 255, 255, 0.08)",
                        border: "1px solid rgba(255, 255, 255, 0.15)",
                        borderRadius: "14px",
                        color: "white",
                        fontWeight: "700",
                        cursor: "pointer",
                        backdropFilter: "blur(12px)"
                    }}
                    onClick={() => navigate("/games")}
                >
                    ⬅ Back to Games
                </button>
            </div>
        );
    }

    if (!unoRoom) {
        return (
            <div className="scribble-no-room" style={{ textAlign: "center", padding: "60px 20px" }}>
                <h1 style={{ fontSize: 34, fontWeight: 800, color: "#f8fafc", marginBottom: 12 }}>
                    🎴 Joining UNO Room...
                </h1>
                <button
                    style={{
                        marginTop: "20px",
                        padding: "10px 24px",
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

    const isHost = unoRoom.players[0]?.id === socket.id;

    if (unoRoom.status === "waiting") {
        return (
            <div className="scribble-page" style={{ maxWidth: 840, margin: "0 auto", padding: "30px 20px" }}>
                <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "30px"
                }}>
                    <div>
                        <h1 style={{ fontSize: 32, fontWeight: 900, background: "linear-gradient(135deg, #ef4444 0%, #eab308 50%, #3b82f6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", margin: 0 }}>
                            🎴 UNO Lobby
                        </h1>
                        <span style={{ color: "#94a3b8", fontSize: 14 }}>Room: {roomCode} • Official UNO Rules (2 - 15 Players)</span>
                    </div>
                    <button
                        onClick={handleLeave}
                        style={{
                            padding: "10px 20px",
                            background: "rgba(255, 255, 255, 0.06)",
                            border: "1px solid rgba(255, 255, 255, 0.12)",
                            borderRadius: "12px",
                            color: "white",
                            fontWeight: "700",
                            cursor: "pointer"
                        }}
                    >
                        ⬅ Exit
                    </button>
                </div>

                <div className="scribble-card" style={{ background: "rgba(15, 23, 42, 0.65)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: 20, padding: "28px", backdropFilter: "blur(20px)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                        <h2 style={{ fontSize: 20, margin: 0, color: "#f8fafc" }}>
                            Players ({unoRoom.players.length} / 15)
                        </h2>
                        {unoRoom.players.length < 2 && (
                            <span style={{ fontSize: 13, color: "#f59e0b", background: "rgba(245, 158, 11, 0.1)", padding: "4px 12px", borderRadius: 20, border: "1px solid rgba(245, 158, 11, 0.2)" }}>
                                Needs at least 2 players
                            </span>
                        )}
                    </div>

                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                        gap: 12,
                        marginBottom: 28
                    }}>
                        {unoRoom.players.map((p, index) => {
                            const isMe = p.id === socket.id;
                            const isCurrentHost = index === 0;
                            return (
                                <div
                                    key={p.id}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 12,
                                        padding: "12px 14px",
                                        background: isMe ? "rgba(99, 102, 241, 0.15)" : "rgba(255, 255, 255, 0.04)",
                                        border: isMe ? "1px solid rgba(129, 140, 248, 0.4)" : "1px solid rgba(255, 255, 255, 0.08)",
                                        borderRadius: 14
                                    }}
                                >
                                    <div style={{
                                        width: 38,
                                        height: 38,
                                        borderRadius: "50%",
                                        background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontWeight: 800,
                                        fontSize: 16,
                                        color: "white"
                                    }}>
                                        {p.username.charAt(0).toUpperCase()}
                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
                                        <span style={{ color: "#f8fafc", fontWeight: 700, fontSize: 14, whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                                            {p.username} {isMe ? "(You)" : ""}
                                        </span>
                                        <span style={{ fontSize: 11, color: isCurrentHost ? "#fbbf24" : "#94a3b8" }}>
                                            {isCurrentHost ? "👑 Host" : "Player"}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {isHost ? (
                        <div style={{ textAlign: "center" }}>
                            <button
                                disabled={unoRoom.players.length < 2}
                                onClick={handleStart}
                                style={{
                                    padding: "14px 38px",
                                    fontSize: 16,
                                    fontWeight: 800,
                                    borderRadius: 14,
                                    border: "none",
                                    color: "white",
                                    background: unoRoom.players.length >= 2
                                        ? "linear-gradient(135deg, #ef4444 0%, #eab308 50%, #3b82f6 100%)"
                                        : "rgba(255, 255, 255, 0.1)",
                                    cursor: unoRoom.players.length >= 2 ? "pointer" : "not-allowed",
                                    boxShadow: unoRoom.players.length >= 2 ? "0 8px 24px rgba(239, 68, 68, 0.3)" : "none",
                                    transition: "all 0.2s ease"
                                }}
                            >
                                🚀 Start UNO Game ({unoRoom.players.length} Players)
                            </button>
                        </div>
                    ) : (
                        <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 14, padding: "12px" }}>
                            ⏳ Waiting for host to start the game...
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <UnoGame
            roomCode={roomCode}
            unoRoom={unoRoom}
            onLeave={handleLeave}
        />
    );
}
