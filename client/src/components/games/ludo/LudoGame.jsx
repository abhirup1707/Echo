import { useState, useEffect, useRef } from "react";
import socket from "../../../socket";
import { ludoSounds } from "../../../utils/gameSounds";
import "./LudoGame.css";

const START_INDEX = {
    red: 0,
    green: 13,
    yellow: 26,
    blue: 39
};

const SAFE_TRACK_INDICES = [0, 8, 13, 21, 26, 34, 39, 47];

const TRACK_COORDS = [
    // Red to Green arm (0..12)
    [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
    [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
    [0, 7], [0, 8],
    // Green to Yellow arm (13..25)
    [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
    [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
    [7, 14], [8, 14],
    // Yellow to Blue arm (26..38)
    [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
    [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
    [14, 7], [14, 6],
    // Blue to Red arm (39..51)
    [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
    [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
    [7, 0], [6, 0]
];

const HOME_COORDS = {
    red: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
    green: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
    yellow: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
    blue: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]]
};

const BASE_SLOTS = {
    red: [[1, 1], [1, 4], [4, 1], [4, 4]],
    green: [[1, 10], [1, 13], [4, 10], [4, 13]],
    yellow: [[10, 10], [10, 13], [13, 10], [13, 13]],
    blue: [[10, 1], [10, 4], [13, 1], [13, 4]]
};

const DICE_PIPS = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 3, 6, 2, 5, 8]
};

export default function LudoGame({ roomCode, ludoRoom, onLeave }) {
    const myId = socket.id;
    const isMyTurn = ludoRoom.currentTurn === myId;
    const canRoll = isMyTurn && !ludoRoom.diceRolled && ludoRoom.status === "playing";
    const legalMoves = ludoRoom.legalMoves || [];

    // Always keep a visible dice value (default 1 with large red pip, or last rolled value)
    const [displayDiceValue, setDisplayDiceValue] = useState(ludoRoom.diceValue || 1);
    const [isRolling, setIsRolling] = useState(false);
    const prevDiceValueRef = useRef(ludoRoom.diceValue);
    const rollIntervalRef = useRef(null);

    // Watch for server diceValue changes (for our roll or opponent's roll)
    useEffect(() => {
        if (ludoRoom.diceValue !== null && ludoRoom.diceValue !== prevDiceValueRef.current) {
            prevDiceValueRef.current = ludoRoom.diceValue;

            setIsRolling(true);
            if (rollIntervalRef.current) clearInterval(rollIntervalRef.current);

            // Tumble animation rapidly cycling through random faces 1..6
            rollIntervalRef.current = setInterval(() => {
                setDisplayDiceValue(Math.floor(Math.random() * 6) + 1);
            }, 55);

            // Settle on the server's rolled value after 600ms
            const timeout = setTimeout(() => {
                if (rollIntervalRef.current) clearInterval(rollIntervalRef.current);
                setDisplayDiceValue(ludoRoom.diceValue);
                setIsRolling(false);
            }, 600);

            return () => {
                if (rollIntervalRef.current) clearInterval(rollIntervalRef.current);
                clearTimeout(timeout);
            };
        } else if (ludoRoom.diceValue !== null) {
            setDisplayDiceValue(ludoRoom.diceValue);
        }
    }, [ludoRoom.diceValue]);

    // Sound effect on game events
    useEffect(() => {
        if (!ludoRoom.lastAction) return;
        const action = ludoRoom.lastAction.toLowerCase();
        if (action.includes("captured") || action.includes("knocked") || action.includes("sent back")) {
            ludoSounds.tokenCapture();
        } else if (action.includes("safe") || action.includes("star")) {
            ludoSounds.starSafe();
        } else if (action.includes("home") || action.includes("finished")) {
            ludoSounds.homeReach();
        }
    }, [ludoRoom.lastAction]);

    const playedVictoryRef = useRef(false);
    useEffect(() => {
        if (ludoRoom.status === "finished" && !playedVictoryRef.current) {
            playedVictoryRef.current = true;
            ludoSounds.victory();
        } else if (ludoRoom.status !== "finished") {
            playedVictoryRef.current = false;
        }
    }, [ludoRoom.status]);

    function handleRoll() {
        if (!canRoll || isRolling) return;

        ludoSounds.diceRoll();
        // Start optimistic rolling animation on click immediately
        setIsRolling(true);
        if (rollIntervalRef.current) clearInterval(rollIntervalRef.current);
        rollIntervalRef.current = setInterval(() => {
            setDisplayDiceValue(Math.floor(Math.random() * 6) + 1);
        }, 55);

        socket.emit("ludo-roll", { roomCode });
    }

    function handleTokenClick(token, player) {
        if (player.id !== myId || !isMyTurn) return;
        if (!ludoRoom.diceRolled) return;
        if (!legalMoves.includes(token.id)) return;

        ludoSounds.tokenStep();
        socket.emit("ludo-move", { roomCode, tokenId: token.id });
    }

    function handleRestart() {
        socket.emit("ludo-play-again", { roomCode });
    }

    // Helper to find tokens on a coordinate [r, c]
    function getTokensAt(r, c) {
        const tokensFound = [];
        ludoRoom.players.forEach(p => {
            (p.tokens || []).forEach(t => {
                let tokenR = -1;
                let tokenC = -1;

                if (t.step === -1) {
                    const slot = BASE_SLOTS[p.color]?.[t.id];
                    if (slot) {
                        tokenR = slot[0];
                        tokenC = slot[1];
                    }
                } else if (t.step >= 0 && t.step <= 50) {
                    const trackIdx = (START_INDEX[p.color] + t.step) % 52;
                    const coord = TRACK_COORDS[trackIdx];
                    if (coord) {
                        tokenR = coord[0];
                        tokenC = coord[1];
                    }
                } else if (t.step >= 51 && t.step <= 55) {
                    const coord = HOME_COORDS[p.color]?.[t.step - 51];
                    if (coord) {
                        tokenR = coord[0];
                        tokenC = coord[1];
                    }
                } else if (t.step === 56) {
                    tokenR = 7;
                    tokenC = 7;
                }

                if (tokenR === r && tokenC === c) {
                    tokensFound.push({ token: t, player: p });
                }
            });
        });
        return tokensFound;
    }

    // Check cell type for coloring
    function getCellClass(r, c) {
        // Red Home path
        if (r === 7 && c >= 1 && c <= 5) return "path-red";
        // Green Home path
        if (c === 7 && r >= 1 && r <= 5) return "path-green";
        // Yellow Home path
        if (r === 7 && c >= 9 && c <= 13) return "path-yellow";
        // Blue Home path
        if (c === 7 && r >= 9 && r <= 13) return "path-blue";

        // Start squares
        if (r === 6 && c === 1) return "start-red";
        if (r === 1 && c === 8) return "start-green";
        if (r === 8 && c === 13) return "start-yellow";
        if (r === 13 && c === 6) return "start-blue";

        return "";
    }

    function isSafeSquare(r, c) {
        // Find if this [r, c] matches any SAFE_TRACK_INDICES
        for (const safeIdx of SAFE_TRACK_INDICES) {
            const coord = TRACK_COORDS[safeIdx];
            if (coord && coord[0] === r && coord[1] === c) return true;
        }
        return false;
    }

    return (
        <div className="ludo-container">
            {/* Header */}
            <div className="ludo-header">
                <button className="ludo-back-btn" onClick={onLeave}>
                    ⬅ Exit Game
                </button>
                <div className="ludo-title-wrap">
                    <h2>Royal Ludo Arena</h2>
                    <span>Room: {roomCode} • Official Track Rules (2 - 4 Players)</span>
                </div>
            </div>

            {/* Action Ticker */}
            <div className="ludo-action-ticker">
                {ludoRoom.lastAction || "Welcome to Ludo!"}
            </div>

            {/* Main Layout */}
            <div className="ludo-main-layout">
                {/* 15x15 Ludo Board */}
                <div className="ludo-board-wrapper">
                    <div className="ludo-board">
                        {/* Red Yard Base (Top-Left 6x6) */}
                        <div className="ludo-base red">
                            <div className="ludo-base-inner">
                                {[0, 1, 2, 3].map(tid => {
                                    const redPlayer = ludoRoom.players.find(p => p.color === "red");
                                    const token = redPlayer?.tokens?.find(t => t.id === tid);
                                    const inYard = token?.step === -1;
                                    const clickable = inYard && isMyTurn && redPlayer.id === myId && legalMoves.includes(tid);

                                    return (
                                        <div key={tid} className="ludo-base-slot">
                                            {inYard && (
                                                <div
                                                    className={`ludo-token token-red ${clickable ? "clickable" : ""}`}
                                                    onClick={() => clickable && handleTokenClick(token, redPlayer)}
                                                    title={`Red Token ${tid + 1}`}
                                                >
                                                    {tid + 1}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Green Yard Base (Top-Right 6x6) */}
                        <div className="ludo-base green">
                            <div className="ludo-base-inner">
                                {[0, 1, 2, 3].map(tid => {
                                    const greenPlayer = ludoRoom.players.find(p => p.color === "green");
                                    const token = greenPlayer?.tokens?.find(t => t.id === tid);
                                    const inYard = token?.step === -1;
                                    const clickable = inYard && isMyTurn && greenPlayer.id === myId && legalMoves.includes(tid);

                                    return (
                                        <div key={tid} className="ludo-base-slot">
                                            {inYard && (
                                                <div
                                                    className={`ludo-token token-green ${clickable ? "clickable" : ""}`}
                                                    onClick={() => clickable && handleTokenClick(token, greenPlayer)}
                                                    title={`Green Token ${tid + 1}`}
                                                >
                                                    {tid + 1}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Yellow Yard Base (Bottom-Right 6x6) */}
                        <div className="ludo-base yellow">
                            <div className="ludo-base-inner">
                                {[0, 1, 2, 3].map(tid => {
                                    const yellowPlayer = ludoRoom.players.find(p => p.color === "yellow");
                                    const token = yellowPlayer?.tokens?.find(t => t.id === tid);
                                    const inYard = token?.step === -1;
                                    const clickable = inYard && isMyTurn && yellowPlayer.id === myId && legalMoves.includes(tid);

                                    return (
                                        <div key={tid} className="ludo-base-slot">
                                            {inYard && (
                                                <div
                                                    className={`ludo-token token-yellow ${clickable ? "clickable" : ""}`}
                                                    onClick={() => clickable && handleTokenClick(token, yellowPlayer)}
                                                    title={`Yellow Token ${tid + 1}`}
                                                >
                                                    {tid + 1}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Blue Yard Base (Bottom-Left 6x6) */}
                        <div className="ludo-base blue">
                            <div className="ludo-base-inner">
                                {[0, 1, 2, 3].map(tid => {
                                    const bluePlayer = ludoRoom.players.find(p => p.color === "blue");
                                    const token = bluePlayer?.tokens?.find(t => t.id === tid);
                                    const inYard = token?.step === -1;
                                    const clickable = inYard && isMyTurn && bluePlayer.id === myId && legalMoves.includes(tid);

                                    return (
                                        <div key={tid} className="ludo-base-slot">
                                            {inYard && (
                                                <div
                                                    className={`ludo-token token-blue ${clickable ? "clickable" : ""}`}
                                                    onClick={() => clickable && handleTokenClick(token, bluePlayer)}
                                                    title={`Blue Token ${tid + 1}`}
                                                >
                                                    {tid + 1}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Center Home (Rows 6..8, Cols 6..8) */}
                        <div className="ludo-center-home">
                            <div className="ludo-center-trophy">👑</div>
                        </div>

                        {/* 15x15 Cells */}
                        {Array.from({ length: 15 }).map((_, r) =>
                            Array.from({ length: 15 }).map((__, c) => {
                                // Ignore cells inside the 4 bases or center home since those are covered by overlay containers
                                const inRedBase = r < 6 && c < 6;
                                const inGreenBase = r < 6 && c > 8;
                                const inYellowBase = r > 8 && c > 8;
                                const inBlueBase = r > 8 && c < 6;
                                const inCenter = r >= 6 && r <= 8 && c >= 6 && c <= 8;

                                if (inRedBase || inGreenBase || inYellowBase || inBlueBase) {
                                    return <div key={`${r}-${c}`} className="ludo-cell-empty" />;
                                }

                                const cellClass = getCellClass(r, c);
                                const isSafe = isSafeSquare(r, c);
                                const tokens = getTokensAt(r, c);

                                return (
                                    <div
                                        key={`${r}-${c}`}
                                        className={`ludo-cell ${cellClass}`}
                                    >
                                        {isSafe && !tokens.length && <span className="ludo-star-icon">⭐</span>}

                                        {tokens.length > 0 && (
                                            <div className="ludo-cell-tokens-wrap">
                                                {tokens.map(({ token, player }) => {
                                                    const clickable = isMyTurn && player.id === myId && legalMoves.includes(token.id);
                                                    return (
                                                        <div
                                                            key={`${player.id}-${token.id}`}
                                                            className={`ludo-token token-${player.color} ${clickable ? "clickable" : ""}`}
                                                            onClick={() => clickable && handleTokenClick(token, player)}
                                                            title={`${player.username}'s Token ${token.id + 1}`}
                                                        >
                                                            {token.id + 1}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Right Side Panel: Dice & Players */}
                <div className="ludo-side-panel">
                    {/* Dice Rolling Station */}
                    <div className="ludo-dice-box">
                        <div
                            className={`ludo-dice-cube ${canRoll ? "can-roll" : ""} ${isRolling ? "rolling" : ""}`}
                            onClick={handleRoll}
                            title={canRoll ? "Click to Roll Dice!" : ""}
                        >
                            {Array.from({ length: 9 }).map((_, idx) => {
                                const activePips = DICE_PIPS[displayDiceValue] || [4];
                                const hasPip = activePips.includes(idx);
                                const isCenterLarge = displayDiceValue === 1 && idx === 4;
                                return (
                                    <div
                                        key={idx}
                                        className={hasPip ? `ludo-dice-pip ${isCenterLarge ? "pip-center-large" : ""}` : "ludo-dice-pip-empty"}
                                    />
                                );
                            })}
                        </div>

                        <button
                            className="ludo-roll-btn"
                            disabled={!canRoll || isRolling}
                            onClick={handleRoll}
                        >
                            {isRolling ? "🎲 ROLLING..." : canRoll ? "🎲 ROLL DICE" : isMyTurn ? "👉 Move a Glowing Token" : "Waiting for Opponent..."}
                        </button>
                    </div>

                    {/* Active Players */}
                    <div className="ludo-players-list">
                        <h4 style={{ margin: "0 0 8px 0", fontSize: 14, color: "#94a3b8" }}>Players</h4>
                        {ludoRoom.players.map(p => {
                            const isTheirTurn = ludoRoom.currentTurn === p.id;
                            const finishedCount = (p.tokens || []).filter(t => t.step === 56).length;

                            return (
                                <div
                                    key={p.id}
                                    className={`ludo-player-card ${isTheirTurn ? "active-turn" : ""}`}
                                >
                                    <div className="ludo-player-meta">
                                        <div className={`ludo-color-badge ${p.color}`} />
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: 14 }}>
                                                {p.username} {p.id === myId ? "(You)" : ""}
                                            </div>
                                            <div className="ludo-player-tokens-count">
                                                🏁 {finishedCount} / 4 Home
                                            </div>
                                        </div>
                                    </div>
                                    {isTheirTurn && (
                                        <span style={{ fontSize: 12, color: "#10b981", fontWeight: 700 }}>
                                            Rolling...
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <button className="ludo-back-btn" onClick={onLeave} style={{ marginTop: "auto" }}>
                        ⬅ Leave Ludo Arena
                    </button>
                </div>
            </div>

            {/* Winner Overlay */}
            {ludoRoom.status === "finished" && (
                <div className="ludo-winner-overlay">
                    <div className="ludo-winner-card">
                        <div style={{ fontSize: 50, marginBottom: 12 }}>🏆</div>
                        <h2 style={{ margin: "0 0 10px 0", fontSize: 28, fontWeight: 900 }}>
                            {ludoRoom.winner?.username} Won!
                        </h2>
                        <p style={{ color: "#94a3b8", margin: "0 0 24px 0" }}>
                            Successfully brought all 4 tokens into the royal home!
                        </p>
                        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                            <button className="ludo-roll-btn" onClick={handleRestart} style={{ width: "auto" }}>
                                🔄 Play Again
                            </button>
                            <button className="ludo-back-btn" onClick={onLeave}>
                                ⬅ Back to Games
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
