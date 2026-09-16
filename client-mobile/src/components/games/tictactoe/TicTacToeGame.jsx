import { useContext, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import socket from "../../../socket";
import { SessionContext } from "../../../context/SessionContext";
import { ProfileContext } from "../../../context/ProfileContext";
import { tttSounds } from "../../../utils/gameSounds";
import SpectatorBanner from "../SpectatorBanner";
import "./TicTacToeGame.css";

const WIN_LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
];

export default function TicTacToeGame({ roomCode, tttRoom }) {

    const navigate = useNavigate();
    const { profile } = useContext(ProfileContext);
    const players = tttRoom.players || [];
    const myPlayer = players.find(p => p.id === socket.id);
    const isSpectator = !myPlayer || tttRoom.spectators?.some(s => s.id === socket.id);
    const mySymbol = myPlayer ? myPlayer.symbol : null;
    const isMyTurn = !isSpectator && tttRoom.status === "playing" && tttRoom.currentTurn === mySymbol;
    const isFinished = tttRoom.status === "finished";
    const playedFinishedSoundRef = useRef(false);

    useEffect(() => {
        if (isFinished && !playedFinishedSoundRef.current) {
            playedFinishedSoundRef.current = true;
            if (tttRoom.winner === mySymbol) {
                tttSounds.win();
            } else if (tttRoom.winner === "draw") {
                tttSounds.draw();
            }
        } else if (!isFinished) {
            playedFinishedSoundRef.current = false;
        }
    }, [isFinished, tttRoom.winner, mySymbol]);

    function handleMove(index) {
        if (isSpectator || !isMyTurn) return;
        if (tttRoom.board[index] !== null) return;
        tttSounds.place();
        socket.emit("ttt-move", { roomCode, index });
    }

    function handleRestart() {
        socket.emit("ttt-restart", { roomCode });
    }

    function handleLeave() {
        sessionStorage.removeItem("echo_active_game");
        socket.emit("ttt-leave", { roomCode });
        navigate("/games");
    }

    function getStatusText() {
        if (isFinished) {
            if (tttRoom.winner === "draw") return "It's a Draw!";
            if (isSpectator) {
                const winP = players.find(p => p.symbol === tttRoom.winner);
                return `${winP?.username || tttRoom.winner} Wins!`;
            }
            if (tttRoom.winner === mySymbol) return "You Win!";
            return "You Lose!";
        }
        if (players.length < 2) return "Waiting for opponent...";
        if (isSpectator) {
            const currentP = players.find(p => p.symbol === tttRoom.currentTurn);
            return `${currentP?.username || tttRoom.currentTurn}'s Turn`;
        }
        if (isMyTurn) return "Your Turn";
        return "Opponent's Turn";
    }

    function getCellClass(index) {
        const value = tttRoom.board[index];
        let cls = "ttt-cell";
        if (value) cls += ` filled ${value.toLowerCase()}`;
        if (isFinished && tttRoom.winLine && tttRoom.winLine.includes(index)) {
            cls += " win";
        }
        if (!isSpectator && isMyTurn && !value && !isFinished) cls += " clickable";
        return cls;
    }

    const playerX = players.find(p => p.symbol === "X");
    const playerO = players.find(p => p.symbol === "O");

    return (
        <div className="ttt-page">
            {isSpectator && (
                <SpectatorBanner
                    gameTitle="Tic Tac Toe"
                    isFinished={isFinished}
                    onExit={handleLeave}
                />
            )}

            <div className="ttt-header">
                <h1>⭕ Tic Tac Toe</h1>
                <button onClick={handleLeave}>⬅ Back</button>
            </div>

            <div className="ttt-game-area">
                <div className="ttt-players-bar">
                    <div className={`ttt-player-info ${tttRoom.currentTurn === "X" && !isFinished ? "active" : ""}`}>
                        <span className="ttt-symbol x">X</span>
                        <span>{playerX ? (playerX.id === socket.id ? "You" : playerX.username) : "Waiting..."}</span>
                        <span className="ttt-score">{tttRoom.scores.X}</span>
                    </div>
                    <div className="ttt-vs">VS</div>
                    <div className={`ttt-player-info ${tttRoom.currentTurn === "O" && !isFinished ? "active" : ""}`}>
                        <span className="ttt-symbol o">O</span>
                        <span>{playerO ? (playerO.id === socket.id ? "You" : playerO.username) : "Waiting..."}</span>
                        <span className="ttt-score">{tttRoom.scores.O}</span>
                    </div>
                </div>

                <div className={`ttt-status ${isFinished ? "finished" : ""} ${isMyTurn ? "my-turn" : ""}`}>
                    {getStatusText()}
                </div>

                <div className="ttt-board">
                    {tttRoom.board.map((cell, i) => (
                        <div
                            key={i}
                            className={getCellClass(i)}
                            onClick={() => handleMove(i)}
                        >
                            {cell}
                        </div>
                    ))}
                </div>

                {isFinished && (
                    <button className="ttt-restart-btn" onClick={handleRestart}>
                        🔄 Play Again
                    </button>
                )}

                {tttRoom.spectators && tttRoom.spectators.length > 0 && (
                    <div style={{ marginTop: 20, textAlign: "center", fontSize: 12, color: "#a855f7" }}>
                        👀 Spectating: {tttRoom.spectators.map(s => `${s.username}${s.id === socket.id ? " (You)" : ""}`).join(", ")}
                    </div>
                )}
            </div>
        </div>
    );
}
