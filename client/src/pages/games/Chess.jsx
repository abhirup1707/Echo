import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SessionContext } from "../../context/SessionContext";
import { ProfileContext } from "../../context/ProfileContext";
import socket from "../../socket";
import ChessGame from "../../components/games/chess/ChessGame";

export default function Chess() {
    const navigate = useNavigate();
    const { roomCode } = useContext(SessionContext);
    const { profile } = useContext(ProfileContext);
    const [chessRoom, setChessRoom] = useState(null);

    useEffect(() => {
        function handleRoom(data) {
            setChessRoom(data);
        }

        function handleError(err) {
            if (err?.message) alert(err.message);
        }

        socket.on("chess-room", handleRoom);
        socket.on("chess-error", handleError);

        return () => {
            socket.off("chess-room", handleRoom);
            socket.off("chess-error", handleError);
        };
    }, []);

    useEffect(() => {
        if (!roomCode) return;
        socket.emit("chess-join", { roomCode, username: profile?.username || "Player" });
    }, [roomCode, profile?.username]);

    const handleLeave = () => {
        if (roomCode) {
            socket.emit("chess-leave", { roomCode });
        }
        navigate("/games");
    };

    if (!roomCode) {
        return (
            <div className="scribble-no-room" style={{ textAlign: "center", padding: "60px 20px" }}>
                <h1 style={{ fontSize: 36, fontWeight: 800, background: "linear-gradient(135deg, #f8fafc 0%, #94a3b8 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 12 }}>
                    ♟️ Grandmaster Chess
                </h1>
                <p style={{ color: "#94a3b8", fontSize: 16 }}>Join an Echo Session first to play Chess!</p>
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

    if (!chessRoom) {
        return (
            <div className="scribble-no-room" style={{ textAlign: "center", padding: "60px 20px" }}>
                <h1 style={{ fontSize: 34, fontWeight: 800, color: "#f8fafc", marginBottom: 12 }}>
                    ♟️ Entering Chess Room...
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

    if (chessRoom.status === "waiting" && chessRoom.players.length < 2) {
        return (
            <div className="scribble-page" style={{ maxWidth: 640, margin: "0 auto", padding: "30px 20px" }}>
                <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "30px"
                }}>
                    <div>
                        <h1 style={{ fontSize: 32, fontWeight: 900, background: "linear-gradient(135deg, #f8fafc 0%, #cbd5e1 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", margin: 0 }}>
                            ♟️ Chess Match
                        </h1>
                        <span style={{ color: "#94a3b8", fontSize: 14 }}>Room: {roomCode} • Official FIDE Rules (2 Players)</span>
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
                    <h2 style={{ fontSize: 20, margin: "0 0 20px 0", color: "#f8fafc" }}>
                        Players ({chessRoom.players.length} / 2)
                    </h2>

                    <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 28 }}>
                        {chessRoom.players.map(p => (
                            <div
                                key={p.id}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    padding: "14px 18px",
                                    background: "rgba(255, 255, 255, 0.04)",
                                    border: "1px solid rgba(255, 255, 255, 0.08)",
                                    borderRadius: 14
                                }}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                                    <div style={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: "50%",
                                        background: p.color === "w" ? "#f8fafc" : "#1e293b",
                                        border: "2px solid rgba(255, 255, 255, 0.3)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: 20,
                                        color: p.color === "w" ? "#1e293b" : "#f8fafc"
                                    }}>
                                        {p.color === "w" ? "♔" : "♚"}
                                    </div>
                                    <div>
                                        <div style={{ color: "#f8fafc", fontWeight: 700, fontSize: 15 }}>
                                            {p.username} {p.id === socket.id ? "(You)" : ""}
                                        </div>
                                        <div style={{ fontSize: 12, color: "#94a3b8" }}>
                                            Plays {p.color === "w" ? "White (Moves 1st)" : "Black"}
                                        </div>
                                    </div>
                                </div>
                                <span style={{ fontSize: 13, color: "#10b981", fontWeight: 600 }}>Ready</span>
                            </div>
                        ))}

                        {chessRoom.players.length === 1 && (
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 14,
                                    padding: "16px 18px",
                                    background: "rgba(255, 255, 255, 0.02)",
                                    border: "1px dashed rgba(255, 255, 255, 0.15)",
                                    borderRadius: 14,
                                    color: "#94a3b8"
                                }}
                            >
                                <div style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: "50%",
                                    border: "2px dashed rgba(255, 255, 255, 0.2)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: 16
                                }}>
                                    ⌛
                                </div>
                                <span>Waiting for an opponent in this session to enter Chess...</span>
                            </div>
                        )}
                    </div>

                    <div style={{ textAlign: "center", color: "#64748b", fontSize: 13 }}>
                        The chess match starts automatically as soon as the second player joins!
                    </div>
                </div>
            </div>
        );
    }

    return (
        <ChessGame
            roomCode={roomCode}
            chessRoom={chessRoom}
            onLeave={handleLeave}
        />
    );
}
