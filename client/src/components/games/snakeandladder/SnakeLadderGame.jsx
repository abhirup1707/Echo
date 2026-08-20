import { useContext, useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import socket from "../../../socket";
import { ProfileContext } from "../../../context/ProfileContext";
import "./SnakeLadderGame.css";

function getCellCenter(num) {
    const rowFromBottom = Math.floor((num - 1) / 10);
    const posInRow = (num - 1) % 10;
    const x = rowFromBottom % 2 === 0
        ? posInRow * 10 + 5
        : (9 - posInRow) * 10 + 5;
    const y = (9 - rowFromBottom) * 10 + 5;
    return { x, y };
}

export default function SnakeLadderGame({ roomCode, slRoom }) {

    const navigate = useNavigate();
    const myIndex = slRoom.players.findIndex(p => p.id === socket.id);
    const isMyTurn = slRoom.status === "playing" && slRoom.currentTurn === myIndex;
    const isFinished = slRoom.status === "finished";

    const [rolling, setRolling] = useState(false);
    const [rollValue, setRollValue] = useState(null);
    const [animPos, setAnimPos] = useState(null);
    const [effectFlash, setEffectFlash] = useState(null);
    const animRef = useRef(null);

    const lastDiceId = slRoom.dice ? slRoom.dice.id : 0;

    useEffect(() => {
        if (!slRoom.dice || !slRoom.lastMove) return;

        const move = slRoom.lastMove;
        setAnimPos(move.from);
        setEffectFlash(null);
        setRolling(true);
        setRollValue(null);

        let count = 0;
        const rollInterval = setInterval(() => {
            setRollValue(Math.floor(Math.random() * 6) + 1);
            count++;
            if (count >= 12) {
                clearInterval(rollInterval);
                setRollValue(slRoom.dice.value);
                setRolling(false);
                startMovement(move);
            }
        }, 80);

        animRef.current = rollInterval;

        return () => {
            if (animRef.current) clearInterval(animRef.current);
        };
    }, [lastDiceId]);

    function startMovement(move) {
        const steps = move.to - move.from;
        if (steps <= 0) {
            setAnimPos(null);
            return;
        }

        let step = 0;
        const interval = setInterval(() => {
            step++;
            setAnimPos(move.from + step);
            if (step >= steps) {
                clearInterval(interval);
                if (move.effect) {
                    setTimeout(() => {
                        setEffectFlash(move.effect);
                        setTimeout(() => {
                            setEffectFlash(null);
                            setAnimPos(null);
                        }, 1200);
                    }, 250);
                } else {
                    setTimeout(() => setAnimPos(null), 200);
                }
            }
        }, 200);
        animRef.current = interval;
    }

    function handleRoll() {
        if (rolling) return;
        socket.emit("sl-roll", { roomCode });
    }

    function handleLeave() {
        socket.emit("sl-leave", { roomCode });
        navigate("/games");
    }

    function getPlayerPosition(player) {
        if (animPos !== null && player.id === slRoom.lastMove?.playerId) return animPos;
        if (effectFlash && player.id === slRoom.lastMove?.playerId) return effectFlash.to;
        return player.position;
    }

    const playerPositions = {};
    slRoom.players.forEach(p => {
        const pos = getPlayerPosition(p);
        if (pos <= 0) return;
        if (!playerPositions[pos]) playerPositions[pos] = [];
        playerPositions[pos].push(p);
    });

    return (
        <div className="sl-page">
            <div className="sl-header">
                <h1>🐍 {slRoom.mapName || "Snake & Ladder"}</h1>
                <button onClick={handleLeave}>⬅ Back</button>
            </div>

            <div className="sl-layout">
                <div className="sl-board-container">
                    <img src="/map1.png" alt="Board" className="sl-board-img" />



                    {slRoom.players.map(p => {
                        const pos = getPlayerPosition(p);
                        if (pos <= 0) {
                            const startC = getCellCenter(1);
                            return (
                                <div
                                    key={p.id}
                                    className="sl-token"
                                    style={{
                                        left: `${startC.x - 2}%`,
                                        top: `${startC.y - 5}%`,
                                        background: p.color,
                                    }}
                                    title={p.username}
                                >
                                    {p.username.charAt(0).toUpperCase()}
                                </div>
                            );
                        }
                        const c = getCellCenter(pos);
                        const tokensHere = (playerPositions[pos] || []).filter(tp => tp.id !== p.id);
                        const offset = tokensHere.findIndex(tp => tp.id === p.id);
                        return (
                            <div
                                key={p.id}
                                className="sl-token"
                                style={{
                                    left: `${c.x - 2 + (offset >= 0 ? (offset + 1) * 1.5 : 0)}%`,
                                    top: `${c.y - 5}%`,
                                    background: p.color,
                                }}
                                title={`${p.username} (${pos})`}
                            >
                                {p.username.charAt(0).toUpperCase()}
                            </div>
                        );
                    })}
                </div>

                <div className="sl-sidebar">
                    <div className="sl-players-list">
                        <h3>Players</h3>
                        {slRoom.players.map((p, i) => (
                            <div
                                key={p.id}
                                className={`sl-player-row ${i === slRoom.currentTurn && !isFinished ? "active-turn" : ""}`}
                            >
                                <div className="sl-player-color" style={{ background: p.color }} />
                                <span className="sl-player-name">{p.username}</span>
                                {i === slRoom.currentTurn && !isFinished && <span className="sl-turn-badge">🎲</span>}
                            </div>
                        ))}
                    </div>

                    <div className="sl-dice-area">
                        {isFinished ? (
                            <div className="sl-finished">
                                <div className="sl-winner-text">🏆 {slRoom.winner?.username} Wins!</div>
                                <button
                                    className="sl-play-again-btn"
                                    onClick={() => socket.emit("sl-play-again", { roomCode })}
                                >
                                    🔄 Play Again
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className={`sl-dice ${rolling ? "rolling" : ""}`}>
                                    {rollValue !== null ? (
                                        <DiceFace value={rollValue} />
                                    ) : (
                                        <div className="sl-dice-empty">?</div>
                                    )}
                                </div>
                                <button
                                    className="sl-roll-btn"
                                    disabled={!isMyTurn || rolling}
                                    onClick={handleRoll}
                                >
                                    {rolling ? "Rolling..." : isMyTurn ? "🎲 Roll" : "Waiting..."}
                                </button>
                            </>
                        )}
                    </div>

                    {effectFlash && (
                        <div className={`sl-effect-flash ${effectFlash.type}`}>
                            {effectFlash.type === "ladder" ? "🪜 Ladder Up!" : "🐍 Snake Down!"}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function DiceFace({ value }) {
    const dots = {
        1: [{ r: 1, c: 1 }],
        2: [{ r: 0, c: 2 }, { r: 2, c: 0 }],
        3: [{ r: 0, c: 2 }, { r: 1, c: 1 }, { r: 2, c: 0 }],
        4: [{ r: 0, c: 0 }, { r: 0, c: 2 }, { r: 2, c: 0 }, { r: 2, c: 2 }],
        5: [{ r: 0, c: 0 }, { r: 0, c: 2 }, { r: 1, c: 1 }, { r: 2, c: 0 }, { r: 2, c: 2 }],
        6: [{ r: 0, c: 0 }, { r: 0, c: 2 }, { r: 1, c: 0 }, { r: 1, c: 2 }, { r: 2, c: 0 }, { r: 2, c: 2 }]
    };

    const grid = [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0]
    ];
    (dots[value] || []).forEach(d => { grid[d.r][d.c] = 1; });

    return (
        <div className="dice-face">
            {grid.map((row, ri) => (
                <div key={ri} className="dice-row">
                    {row.map((cell, ci) => (
                        <div key={ci} className={`dice-cell ${cell ? "dot" : ""}`} />
                    ))}
                </div>
            ))}
        </div>
    );
}
