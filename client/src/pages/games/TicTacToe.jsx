import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SessionContext } from "../../context/SessionContext";
import { ProfileContext } from "../../context/ProfileContext";
import socket from "../../socket";
import TicTacToeGame from "../../components/games/tictactoe/TicTacToeGame";

export default function TicTacToe() {

    const navigate = useNavigate();
    const { roomCode } = useContext(SessionContext);
    const { profile } = useContext(ProfileContext);
    const [tttRoom, setTttRoom] = useState(null);

    useEffect(() => {

        function handleRoom(data) {
            setTttRoom(data);
        }

        function handleFull() {
            alert("Room is full! Only 2 players allowed.");
        }

        socket.on("ttt-room", handleRoom);
        socket.on("ttt-full", handleFull);

        return () => {
            socket.off("ttt-room", handleRoom);
            socket.off("ttt-full", handleFull);
        };

    }, []);

    useEffect(() => {
        if (!roomCode) return;
        socket.emit("ttt-join", { roomCode, username: profile.username });
    }, [roomCode]);

    if (!roomCode) {
        return (
            <div className="scribble-no-room" style={{ textAlign: "center" }}>
                <h1 style={{ fontSize: 36, fontWeight: 800, background: "linear-gradient(135deg, #fff 0%, #c4b5fd 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 12 }}>⭕ Tic Tac Toe</h1>
                <p style={{ color: "#888", fontSize: 15 }}>Join an Echo Session first.</p>
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
                    onClick={() => navigate("/games")}
                >
                    ⬅ Back to Games
                </button>
            </div>
        );
    }

    if (!tttRoom) {
        return (
            <div className="scribble-no-room" style={{ textAlign: "center" }}>
                <h1 style={{ fontSize: 36, fontWeight: 800, background: "linear-gradient(135deg, #fff 0%, #c4b5fd 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 12 }}>⭕ Joining Tic Tac Toe...</h1>
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
                        socket.emit("ttt-leave", { roomCode });
                        navigate("/games");
                    }}
                >
                    ⬅ Back to Games
                </button>
            </div>
        );
    }

    if (tttRoom.status === "waiting" && tttRoom.players.length < 2) {
        return (
            <div className="scribble-page">
                <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "25px"
                }}>
                    <h1>⭕ Tic Tac Toe Lobby</h1>
                    <button onClick={() => {
                        socket.emit("ttt-leave", { roomCode });
                        navigate("/games");
                    }}>⬅ Back</button>
                </div>

                <div className="scribble-card" style={{ maxWidth: 400 }}>
                    <h2>Players ({tttRoom.players.length}/2)</h2>
                    <div className="player-list">
                        {tttRoom.players.map(p => (
                            <div className="scribble-player" key={p.id}>
                                <div className="avatar">{p.symbol}</div>
                                <span>{p.username}</span>
                                {p.symbol === "X" && <strong>⭐ Goes First</strong>}
                            </div>
                        ))}
                    </div>
                    <p style={{ color: "#777", marginTop: 16 }}>
                        Waiting for opponent to join...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <TicTacToeGame
            roomCode={roomCode}
            tttRoom={tttRoom}
        />
    );

}
