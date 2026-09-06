import { useContext, useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import socket from "../../../socket";
import { ProfileContext } from "../../../context/ProfileContext";
import SpectatorBanner from "../SpectatorBanner";
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
    const players = slRoom.players || [];
    const isSpectator = !players.some(p => p.id === socket.id) || slRoom.spectators?.some(s => s.id === socket.id);
    const myIndex = players.findIndex(p => p.id === socket.id);
    const isMyTurn = !isSpectator && slRoom.status === "playing" && slRoom.currentTurn === myIndex;
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
        if (rolling || isSpectator || !isMyTurn) return;
        socket.emit("sl-roll", { roomCode });
    }

    function handleLeave() {
        sessionStorage.removeItem("echo_active_game");
        socket.emit("sl-leave", { roomCode });
        navigate("/games");
    }

    function getPlayerPosition(player) {
        if (animPos !== null && player.id === slRoom.lastMove?.playerId) return animPos;
        if (effectFlash && player.id === slRoom.lastMove?.playerId) return effectFlash.to;
        return player.position;
    }

    const playerPositions = {};
    players.forEach(p => {
        const pos = getPlayerPosition(p);
        if (pos <= 0) return;
        if (!playerPositions[pos]) playerPositions[pos] = [];
        playerPositions[pos].push(p);
    });

    return (
        <div className="sl-page">
            {isSpectator && (
                <SpectatorBanner
                    gameTitle="Snake & Ladder"
                    isFinished={isFinished}
                    onExit={handleLeave}
                />
            )}

            <div className="sl-header">
                <h1>🐍 {slRoom.mapName || "Snake & Ladder"}</h1>
                <button onClick={handleLeave}>⬅ Back</button>
            </div>

            <div className="sl-layout">
                <div className="sl-board-container">
                    <img src="/map1.png" alt="Board" className="sl-board-img" />



                    {players.map((p, idx) => {
                        const pos = getPlayerPosition(p);
                        const glowStyle = {
                            background: p.color,
                            "--token-glow": p.color,
                        };
                        if (pos <= 0) {
                            const startC = getCellCenter(1);
                            return (
                                <div
                                    key={p.id}
                                    className="sl-token"
                                    style={{ ...glowStyle, left: `${startC.x - 2}%`, top: `${startC.y - 5}%` }}
                                    title={`${p.username} (Start)`}
                                >
                                    {p.username.charAt(0).toUpperCase()}
                                    <span className="sl-token-floating-name">{p.username}</span>
                                </div>
                            );
                        }
                        const c = getCellCenter(pos);
                        const tokensHere = (playerPositions[pos] || []).filter(tp => tp.id !== p.id);
                        const offset = tokensHere.findIndex(tp => tp.id === p.id);
                        const isThisTurn = idx === slRoom.currentTurn;
                        return (
                            <div
                                key={p.id}
                                className={`sl-token${isThisTurn ? " sl-token-active" : ""}`}
                                style={{
                                    ...glowStyle,
                                    left: `${c.x - 2 + (offset >= 0 ? (offset + 1) * 1.5 : 0)}%`,
                                    top: `${c.y - 5}%`,
                                }}
                                title={`${p.username} (Square ${pos})`}
                            >
                                {p.username.charAt(0).toUpperCase()}
                                <span className="sl-token-floating-name">{p.username}</span>
                            </div>
                        );
                    })}
                </div>

                <div className="sl-sidebar">
                    <div className="sl-players-list">
                        <h3>Players ({slRoom.players.length}/6)</h3>
                        {slRoom.players.map((p, i) => {
                            const pos = getPlayerPosition(p);
                            const isTheirTurn = i === slRoom.currentTurn && !isFinished;
                            return (
                                <div
                                    key={p.id}
                                    className={`sl-player-row ${isTheirTurn ? "active-turn" : ""}`}
                                >
                                    <div className="sl-player-color" style={{ background: p.color }} />
                                    <span className="sl-player-name">{p.username}</span>
                                    <span style={{ marginLeft: "auto", fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>
                                        Sq {pos > 0 ? pos : "Start"}
                                    </span>
                                    {isTheirTurn && <span className="sl-turn-badge">🎲</span>}
                                </div>
                            );
                        })}

                        {slRoom.spectators && slRoom.spectators.length > 0 && (
                            <div style={{ marginTop: 12, padding: "8px 10px", background: "rgba(168,85,247,0.1)", borderRadius: 10, border: "1px solid rgba(168,85,247,0.2)" }}>
                                <div style={{ fontSize: 11, color: "#d8b4fe", fontWeight: 700, marginBottom: 4 }}>
                                    👀 Spectators ({slRoom.spectators.length})
                                </div>
                                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                    {slRoom.spectators.map(s => (
                                        <span key={s.id} style={{ fontSize: 11, padding: "2px 8px", background: "rgba(255,255,255,0.06)", borderRadius: 8, color: "#f1f5f9" }}>
                                            {s.username} {s.id === socket.id ? "(You)" : ""}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
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
                                {!isSpectator ? (
                                    <button
                                        className="sl-roll-btn"
                                        disabled={!isMyTurn || rolling}
                                        onClick={handleRoll}
                                    >
                                        {rolling ? "Rolling..." : isMyTurn ? "🎲 Roll" : "Waiting..."}
                                    </button>
                                ) : (
                                    <div style={{ color: "#c084fc", fontSize: 13, marginTop: 8, textAlign: "center", fontWeight: 700 }}>
                                        🎲 {slRoom.players[slRoom.currentTurn]?.username || "Player"}'s Turn to Roll
                                    </div>
                                )}
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
