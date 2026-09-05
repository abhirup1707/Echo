import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SessionContext } from "../../context/SessionContext";
import { ProfileContext } from "../../context/ProfileContext";
import socket from "../../socket";
import LudoGame from "../../components/games/ludo/LudoGame";

const LUDO_COLORS = ["red", "green", "yellow", "blue"];

export default function Ludo() {
    const navigate = useNavigate();
    const { roomCode } = useContext(SessionContext);
    const { profile } = useContext(ProfileContext);
    const [ludoRoom, setLudoRoom] = useState(null);

    useEffect(() => {
        function handleRoom(data) {
            setLudoRoom(data);
        }

        function handleFull() {
            alert("Ludo room is full! Maximum 4 players allowed.");
        }

        function handleInProgress() {
            alert("A Ludo match is already in progress in this room.");
        }

        function handleError(err) {
            if (err?.message) alert(err.message);
        }

        socket.on("ludo-room", handleRoom);
        socket.on("ludo-full", handleFull);
        socket.on("ludo-in-progress", handleInProgress);
        socket.on("ludo-error", handleError);

        return () => {
            socket.off("ludo-room", handleRoom);
            socket.off("ludo-full", handleFull);
            socket.off("ludo-in-progress", handleInProgress);
            socket.off("ludo-error", handleError);
        };
    }, []);

    useEffect(() => {
        if (!roomCode) return;
        sessionStorage.setItem("echo_active_game", "/games/ludo");
        socket.emit("ludo-join", { roomCode, username: profile?.username || "Player" });
    }, [roomCode, profile?.username]);

    const handleLeave = () => {
        sessionStorage.removeItem("echo_active_game");
        if (roomCode) {
            socket.emit("ludo-leave", { roomCode });
        }
        navigate("/games");
    };

    const handleStart = () => {
        if (roomCode) {
            socket.emit("ludo-start", { roomCode });
        }
    };

    if (!roomCode) {
        return (
            <div className="scribble-no-room" style={{ textAlign: "center", padding: "60px 20px" }}>
                <h1 style={{ fontSize: 36, fontWeight: 800, background: "linear-gradient(135deg, #ef4444 0%, #10b981 33%, #f59e0b 66%, #3b82f6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 12 }}>
                    🎲 Ludo
                </h1>
                <p style={{ color: "#94a3b8", fontSize: 16 }}>Join an Echo Session first to play Ludo!</p>
                <button
                    style={{
                        marginTop: "24px",
                        padding: "12px 28px",
                        background: "rgba(255, 255, 255, 0.08)",
                        border: "1px solid rgba(255, 255, 255, 0.15)",
                        borderRadius: "14px",
                        color: "white",
                        fontWeight: "700",
                        cursor: "pointer"
                    }}
                    onClick={() => navigate("/games")}
                >
                    ⬅ Back to Games
                </button>
            </div>
        );
    }

    if (!ludoRoom) {
        return (
            <div className="scribble-no-room" style={{ textAlign: "center", padding: "60px 20px" }}>
                <h1 style={{ fontSize: 34, fontWeight: 800, color: "#f8fafc", marginBottom: 12 }}>
                    🎲 Entering Ludo Arena...
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

    const isHost = ludoRoom.players[0]?.id === socket.id;

    if (ludoRoom.status === "waiting") {
        return (
            <div className="scribble-page" style={{ maxWidth: 700, margin: "0 auto", padding: "30px 20px" }}>
                <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "30px"
                }}>
                    <div>
                        <h1 style={{ fontSize: 32, fontWeight: 900, background: "linear-gradient(135deg, #ef4444 0%, #10b981 33%, #f59e0b 66%, #3b82f6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", margin: 0 }}>
                            🎲 Ludo Lobby
                        </h1>
                        <span style={{ color: "#94a3b8", fontSize: 14 }}>Room: {roomCode} • Official Track Rules (2 - 4 Players)</span>
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
                            Players ({ludoRoom.players.length} / 4)
                        </h2>
                        {ludoRoom.players.length < 2 && (
                            <span style={{ fontSize: 13, color: "#f59e0b", background: "rgba(245, 158, 11, 0.1)", padding: "4px 12px", borderRadius: 20, border: "1px solid rgba(245, 158, 11, 0.2)" }}>
                                Needs at least 2 players
                            </span>
                        )}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 28 }}>
                        {[0, 1, 2, 3].map(slotIdx => {
                            const p = ludoRoom.players[slotIdx];
                            const colorName = LUDO_COLORS[slotIdx];
                            const colorHex = { red: "#ef4444", green: "#10b981", yellow: "#f59e0b", blue: "#3b82f6" }[colorName];

                            if (p) {
                                const isMe = p.id === socket.id;
                                return (
                                    <div
                                        key={p.id}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 12,
                                            padding: "14px 16px",
                                            background: isMe ? "rgba(99, 102, 241, 0.15)" : "rgba(255, 255, 255, 0.04)",
                                            border: isMe ? "1px solid rgba(129, 140, 248, 0.4)" : "1px solid rgba(255, 255, 255, 0.08)",
                                            borderRadius: 14
                                        }}
                                    >
                                        <div style={{
                                            width: 32,
                                            height: 32,
                                            borderRadius: "50%",
                                            background: colorHex,
                                            boxShadow: `0 0 10px ${colorHex}`,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontWeight: 800,
                                            color: "white",
                                            fontSize: 13
                                        }}>
                                            {slotIdx + 1}
                                        </div>
                                        <div>
                                            <div style={{ color: "#f8fafc", fontWeight: 700, fontSize: 14 }}>
                                                {p.username} {isMe ? "(You)" : ""}
                                            </div>
                                            <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "capitalize" }}>
                                                {colorName} Corner
                                            </div>
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <div
                                    key={slotIdx}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 12,
                                        padding: "14px 16px",
                                        background: "rgba(255, 255, 255, 0.02)",
                                        border: "1px dashed rgba(255, 255, 255, 0.1)",
                                        borderRadius: 14,
                                        color: "#64748b"
                                    }}
                                >
                                    <div style={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: "50%",
                                        border: "1px dashed rgba(255, 255, 255, 0.2)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: 14
                                    }}>
                                        +
                                    </div>
                                    <span style={{ fontSize: 13 }}>Open {colorName} Slot</span>
                                </div>
                            );
                        })}
                    </div>

                    {isHost ? (
                        <div style={{ textAlign: "center" }}>
                            <button
                                disabled={ludoRoom.players.length < 2}
                                onClick={handleStart}
                                style={{
                                    padding: "14px 38px",
                                    fontSize: 16,
                                    fontWeight: 800,
                                    borderRadius: 14,
                                    border: "none",
                                    color: "white",
                                    background: ludoRoom.players.length >= 2
                                        ? "linear-gradient(135deg, #10b981 0%, #3b82f6 100%)"
                                        : "rgba(255, 255, 255, 0.1)",
                                    cursor: ludoRoom.players.length >= 2 ? "pointer" : "not-allowed",
                                    boxShadow: ludoRoom.players.length >= 2 ? "0 8px 24px rgba(16, 185, 129, 0.35)" : "none",
                                    transition: "all 0.2s ease"
                                }}
                            >
                                🚀 Start Ludo Game ({ludoRoom.players.length} Players)
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
        <LudoGame
            roomCode={roomCode}
            ludoRoom={ludoRoom}
            onLeave={handleLeave}
        />
    );
}
