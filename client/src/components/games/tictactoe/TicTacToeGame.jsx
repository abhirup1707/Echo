import { useContext, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import socket from "../../../socket";
import { SessionContext } from "../../../context/SessionContext";
import { ProfileContext } from "../../../context/ProfileContext";
import { tttSounds } from "../../../utils/gameSounds";
import "./TicTacToeGame.css";

const WIN_LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
];

export default function TicTacToeGame({ roomCode, tttRoom }) {

    const navigate = useNavigate();
    const { profile } = useContext(ProfileContext);
    const myPlayer = tttRoom.players.find(p => p.id === socket.id);
    const mySymbol = myPlayer ? myPlayer.symbol : null;
    const isMyTurn = tttRoom.status === "playing" && tttRoom.currentTurn === mySymbol;
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
        if (!isMyTurn) return;
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
            if (tttRoom.winner === mySymbol) return "You Win!";
            return "You Lose!";
        }
        if (tttRoom.players.length < 2) return "Waiting for opponent...";
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
        if (isMyTurn && !value && !isFinished) cls += " clickable";
        return cls;
    }

    const opponent = tttRoom.players.find(p => p.id !== socket.id);

    return (
        <div className="ttt-page">
            <div className="ttt-header">
                <h1>⭕ Tic Tac Toe</h1>
                <button onClick={handleLeave}>⬅ Back</button>
            </div>

            <div className="ttt-game-area">
                <div className="ttt-players-bar">
                    <div className={`ttt-player-info ${tttRoom.currentTurn === "X" && !isFinished ? "active" : ""}`}>
                        <span className="ttt-symbol x">X</span>
                        <span>{myPlayer ? "You" : "Waiting..."}</span>
                        <span className="ttt-score">{tttRoom.scores.X}</span>
                    </div>
                    <div className="ttt-vs">VS</div>
                    <div className={`ttt-player-info ${tttRoom.currentTurn === "O" && !isFinished ? "active" : ""}`}>
                        <span className="ttt-symbol o">O</span>
                        <span>{opponent ? opponent.username : "Waiting..."}</span>
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
            </div>
        </div>
    );
}
