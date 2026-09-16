import {
    useContext,
    useEffect,
    useState
} from "react";
import {
    useNavigate
} from "react-router-dom";
import {
    SessionContext
} from "../../context/SessionContext";
import {
    useScribble
} from "../../context/ScribbleContext";
import socket from "../../socket";
import ScribbleGame from "../../components/games/scribble/ScribbleGame";
import "../../components/games/scribble/Lobby.css";

export default function Scribble() {
    const navigate = useNavigate();
    const { roomCode } = useContext(SessionContext);
    const {
        scribbleRoom,
        joinScribble,
        leaveScribble
    } = useScribble();

    const [maxRounds, setMaxRounds] = useState(5);
    const [drawTime, setDrawTime] = useState(150);
    const [wordChoices, setWordChoices] = useState(5);

    useEffect(() => {
        if (!roomCode) return;
        sessionStorage.setItem("echo_active_game", "/games/scribble");
        joinScribble();
    }, [roomCode, joinScribble]);

    /*
        Keep local settings synchronized with server settings.
    */
    useEffect(() => {
        if (!scribbleRoom) return;

        setMaxRounds(scribbleRoom.maxRounds);
        setDrawTime(scribbleRoom.drawTime);
        setWordChoices(scribbleRoom.wordChoices);
    }, [
        scribbleRoom?.maxRounds,
        scribbleRoom?.drawTime,
        scribbleRoom?.wordChoices
    ]);

    function handleBack() {
        sessionStorage.removeItem("echo_active_game");
        leaveScribble();
        navigate("/games");
    }

    if (!roomCode) {
        return (
            <div className="scribble-no-room">
                <h1>🎨 Scribble</h1>
                <p>Join an Echo Session first.</p>
                <button
                    className="start-btn"
                    style={{ marginTop: "24px", maxWidth: "220px" }}
                    onClick={() => navigate("/games")}
                >
                    ⬅ Back to Games
                </button>
            </div>
        );
    }

    if (!scribbleRoom) {
        return (
            <div className="scribble-no-room">
                <h1>🎨 Joining Scribble...</h1>
                <button
                    className="start-btn"
                    style={{ marginTop: "24px", maxWidth: "220px" }}
                    onClick={handleBack}
                >
                    ⬅ Back to Games
                </button>
            </div>
        );
    }

    /*
        Render the actual game component when phase changes from lobby.
    */
    if (scribbleRoom.phase !== "lobby") {
        return (
            <ScribbleGame
                roomCode={roomCode}
                scribbleRoom={scribbleRoom}
                onLeave={handleBack}
            />
        );
    }

    const players = scribbleRoom.players || [];
    const isHost = scribbleRoom.host === socket.id;

    return (
        <div className="scribble-page">
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "25px"
                }}
            >
                <h1>🎨 Scribble Lobby</h1>

                <button
                    style={{
                        padding: "10px 22px",
                        background: "rgba(255, 255, 255, 0.08)",
                        border: "1px solid rgba(255, 255, 255, 0.15)",
                        borderRadius: "12px",
                        color: "white",
                        fontWeight: "700",
                        cursor: "pointer",
                        transition: "all 0.25s ease"
                    }}
                    onClick={handleBack}
                >
                    ⬅ Back to Games
                </button>
            </div>

            <div className="scribble-layout">
                {/* PLAYERS */}
                <div className="scribble-card">
                    <h2>Players ({players.length})</h2>
                    <div className="player-list">
                        {players.map(player => (
                            <div className="scribble-player" key={player.id}>
                                <div className="avatar">
                                    {player.username.charAt(0).toUpperCase()}
                                </div>
                                <span>{player.username}</span>
                                {player.id === scribbleRoom.host && (
                                    <strong>👑 Host</strong>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* SETTINGS */}
                <div className="settings-card">
                    <h2>⚙ Game Settings</h2>

                    {isHost ? (
                        <>
                            <label>Rounds</label>
                            <select
                                value={maxRounds}
                                onChange={(event) =>
                                    setMaxRounds(Number(event.target.value))
                                }
                            >
                                <option value={3}>3</option>
                                <option value={5}>5</option>
                                <option value={7}>7</option>
                                <option value={10}>10</option>
                            </select>

                            <label>Draw Time</label>
                            <select
                                value={drawTime}
                                onChange={(event) =>
                                    setDrawTime(Number(event.target.value))
                                }
                            >
                                <option value={60}>60 sec</option>
                                <option value={90}>90 sec</option>
                                <option value={120}>120 sec</option>
                                <option value={150}>150 sec</option>
                                <option value={180}>180 sec</option>
                            </select>

                            <label>Word Choices</label>
                            <select
                                value={wordChoices}
                                onChange={(event) =>
                                    setWordChoices(Number(event.target.value))
                                }
                            >
                                <option value={3}>3 Words</option>
                                <option value={5}>5 Words</option>
                            </select>

                            <button
                                className="start-btn"
                                onClick={() => {
                                    socket.emit("scribble-update-settings", {
                                        roomCode,
                                        settings: {
                                            maxRounds,
                                            drawTime,
                                            wordChoices
                                        }
                                    });
                                }}
                            >
                                💾 Save Settings
                            </button>

                            <button
                                className="start-btn"
                                style={{
                                    marginTop: "12px",
                                    background: "#16a34a"
                                }}
                                onClick={() => {
                                    socket.emit("scribble-start", { roomCode });
                                }}
                            >
                                ▶ Start Game
                            </button>
                        </>
                    ) : (
                        <>
                            <h3>👑 Waiting for Host</h3>
                            <p>The host is configuring the game.</p>
                            <div className="waiting-settings">
                                <div>
                                    Rounds
                                    <strong>{scribbleRoom.maxRounds}</strong>
                                </div>
                                <div>
                                    Draw Time
                                    <strong>{scribbleRoom.drawTime}s</strong>
                                </div>
                                <div>
                                    Words
                                    <strong>{scribbleRoom.wordChoices}</strong>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
