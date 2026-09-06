import { useState, useEffect, useRef } from "react";
import socket from "../../../socket";
import { unoSounds } from "../../../utils/gameSounds";
import SpectatorBanner from "../SpectatorBanner";
import "./UnoGame.css";

const COLOR_MAP = {
    red: "#ef4444",
    blue: "#3b82f6",
    green: "#22c55e",
    yellow: "#eab308",
    wild: "#111111"
};

export default function UnoGame({ roomCode, unoRoom, onLeave }) {
    const [selectedWildCard, setSelectedWildCard] = useState(null);

    // Animation phases: "shuffling" -> "dealing" -> "ready"
    const [animationPhase, setAnimationPhase] = useState("ready");
    const [dealtCount, setDealtCount] = useState(0);
    const [isReshuffling, setIsReshuffling] = useState(false);

    const lastGameIdRef = useRef(unoRoom.gameId || 0);
    const lastReshuffleCountRef = useRef(unoRoom.reshuffleCount || 0);
    const playedVictoryRef = useRef(false);

    useEffect(() => {
        if (unoRoom.status === "finished" && !playedVictoryRef.current) {
            playedVictoryRef.current = true;
            unoSounds.victory();
        } else if (unoRoom.status !== "finished") {
            playedVictoryRef.current = false;
        }
    }, [unoRoom.status]);

    const myId = socket.id;
    const players = unoRoom.players || [];
    const isSpectator = unoRoom.isSpectator || !players.some(p => p.id === myId);
    const me = players.find(p => p.id === myId);
    const myHand = me?.hand || [];
    const isMyTurn = !isSpectator && unoRoom.currentTurn === myId && animationPhase === "ready";
    const isHost = players[0] && players[0].id === myId;
    const topCard = unoRoom.topCard;
    const activeColor = unoRoom.activeColor || topCard?.color || "red";

    const opponents = players.filter(p => p.id !== myId);

    // Initial game start shuffle & 1-by-1 dealing animation
    useEffect(() => {
        if (unoRoom.status === "playing" && unoRoom.gameId !== lastGameIdRef.current) {
            lastGameIdRef.current = unoRoom.gameId;

            // Trigger Shuffle
            setAnimationPhase("shuffling");

            const shuffleTimer = setTimeout(() => {
                // Trigger 1-by-1 Dealing
                setAnimationPhase("dealing");
                const totalCardsToDeal = players.length * 7;
                let currentDeal = 0;

                const dealInterval = setInterval(() => {
                    currentDeal++;
                    setDealtCount(currentDeal);

                    if (currentDeal >= totalCardsToDeal) {
                        clearInterval(dealInterval);
                        setTimeout(() => {
                            setAnimationPhase("ready");
                        }, 400);
                    }
                }, Math.max(40, Math.min(120, Math.floor(2000 / totalCardsToDeal))));

            }, 1400);

            return () => clearTimeout(shuffleTimer);
        }
    }, [unoRoom.gameId, unoRoom.status, players.length]);

    // Reshuffle animation when draw deck is exhausted and discard pile is reshuffled
    useEffect(() => {
        if (unoRoom.reshuffleCount > lastReshuffleCountRef.current) {
            lastReshuffleCountRef.current = unoRoom.reshuffleCount;
            setIsReshuffling(true);
            const timer = setTimeout(() => setIsReshuffling(false), 1400);
            return () => clearTimeout(timer);
        }
    }, [unoRoom.reshuffleCount]);

    function isCardPlayable(card) {
        if (!isMyTurn) return false;
        if (!topCard) return true;
        if (card.color === "wild") return true;
        if (card.color === activeColor) return true;
        if (card.value === topCard.value) return true;
        return false;
    }

    function handleCardClick(card) {
        if (!isMyTurn) return;
        if (!isCardPlayable(card)) return;

        if (card.color === "wild") {
            // Require picking color (applies to Wild, Wild4, and Swap Hands)
            setSelectedWildCard(card);
            return;
        }

        if (["skip", "reverse", "draw2"].includes(card.type)) {
            unoSounds.actionCard();
        } else {
            unoSounds.cardPlay();
        }

        socket.emit("uno-play", {
            roomCode,
            cardId: card.id,
            chosenColor: null
        });
    }

    function handleColorSelect(chosenColor) {
        if (!selectedWildCard) return;

        if (selectedWildCard.type === "swap") {
            unoSounds.swapHands();
        } else {
            unoSounds.wildCard();
        }

        socket.emit("uno-play", {
            roomCode,
            cardId: selectedWildCard.id,
            chosenColor
        });
        setSelectedWildCard(null);
    }

    function handleDraw() {
        if (!isMyTurn) return;
        unoSounds.cardDraw();
        socket.emit("uno-draw", { roomCode });
    }

    function handleCallUno() {
        unoSounds.unoCall();
        socket.emit("uno-call-uno", { roomCode });
    }

    function handleRestart() {
        socket.emit("uno-play-again", { roomCode });
    }

    const totalToDeal = players.length * 7;
    const dealingActivePlayerIndex = animationPhase === "dealing" ? (dealtCount % (players.length || 1)) : -1;
    const dealingActivePlayer = players[dealingActivePlayerIndex];

    return (
        <div className="uno-game-container">
            {isSpectator && (
                <SpectatorBanner
                    gameTitle="UNO"
                    isFinished={unoRoom.status === "finished"}
                    onExit={onLeave}
                />
            )}

            {/* ── TOP BAR ── */}
            <div className="uno-header">
                <div className="uno-header-left">
                    <button className="uno-back-btn" onClick={onLeave} title="Exit to Games">
                        ⬅ Leave Game
                    </button>
                    <div className="uno-turn-badge">
                        <span className="uno-turn-dot" />
                        <strong>
                            {animationPhase !== "ready"
                                ? "Setting Up Game..."
                                : isMyTurn
                                ? "Your Turn!"
                                : `${unoRoom.currentTurnUsername || "Waiting"}'s Turn`}
                        </strong>
                    </div>
                </div>

                <div className="uno-header-center">
                    <div className="uno-active-color-pill" style={{ borderColor: COLOR_MAP[activeColor] || "#fff" }}>
                        <span>Color:</span>
                        <div
                            className="uno-color-dot"
                            style={{ background: COLOR_MAP[activeColor] || "#fff" }}
                        />
                        <strong style={{ color: COLOR_MAP[activeColor] || "#fff" }}>
                            {activeColor ? activeColor.toUpperCase() : "ANY"}
                        </strong>
                    </div>

                    <div className="uno-direction-pill">
                        {unoRoom.direction === 1 ? "↻ Clockwise" : "↺ Counter-Clockwise"}
                    </div>
                </div>

                {!isSpectator && (
                    <div className="uno-header-right">
                        <button className="uno-call-btn" onClick={handleCallUno} title="Call UNO when on 1 card!">
                            🔥 Call UNO!
                        </button>
                    </div>
                )}
            </div>

            {/* ── ACTION NOTIFICATION ── */}
            <div className="uno-action-ticker">
                {isReshuffling
                    ? "🔄 Reshuffling discard pile into draw deck..."
                    : animationPhase === "shuffling"
                    ? "🃏 Shuffling the UNO deck..."
                    : animationPhase === "dealing"
                    ? `🎴 Dealing 7 cards to each member 1 by 1... (${dealtCount} / ${totalToDeal})`
                    : (unoRoom.lastAction || "Game started!")}
            </div>

            {/* ── OPPONENTS CIRCLE ── */}
            <div className="uno-opponents-row">
                {opponents.map((p, idx) => {
                    const isTheirTurn = unoRoom.currentTurn === p.id && animationPhase === "ready";
                    const isReceivingCard = animationPhase === "dealing" && dealingActivePlayer?.id === p.id;

                    return (
                        <div
                            key={p.id}
                            className={`uno-opponent-card ${isTheirTurn ? "active-turn" : ""} ${isReceivingCard ? "active-turn" : ""}`}
                        >
                            <div className="uno-opponent-avatar">
                                {p.username.charAt(0).toUpperCase()}
                            </div>
                            <div className="uno-opponent-details">
                                <strong>{p.username}</strong>
                                <span className="uno-card-count-badge">
                                    🎴 {p.cardCount} card{p.cardCount !== 1 ? "s" : ""}
                                </span>
                                {p.cardCount === 1 && <span className="uno-alert-badge">UNO!</span>}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ── CENTER TABLE (DISCARD & DRAW PILE) ── */}
            <div className="uno-table">
                {/* Draw Pile */}
                <div
                    className={`uno-draw-pile ${!isSpectator && isMyTurn ? "clickable" : ""} ${isReshuffling ? "shuffling-deck" : ""}`}
                    onClick={() => !isSpectator && isMyTurn && handleDraw()}
                    title={!isSpectator && isMyTurn ? "Click to draw card" : isSpectator ? "Spectating" : "Wait for your turn"}
                >
                    <div className="uno-card-back">
                        <span>UNO</span>
                    </div>
                    <span className="uno-deck-label">
                        {isReshuffling ? "Shuffling..." : `Draw (${unoRoom.deckCount})`}
                    </span>
                </div>

                {/* Discard Pile (Top Card) */}
                <div className="uno-discard-pile">
                    {topCard && animationPhase === "ready" ? (
                        <div
                            className={`uno-card-item top-card card-${topCard.color} card-${topCard.type}`}
                            style={{ "--card-color": COLOR_MAP[topCard.color] || "#111" }}
                        >
                            <div className="uno-card-inner">
                                <span className="uno-card-corner top-left">{formatCardCorner(topCard)}</span>

                                <div className="uno-card-center-oval">
                                    {renderCardCenter(topCard)}
                                </div>

                                <span className="uno-card-corner bottom-right">{formatCardCorner(topCard)}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="uno-card-back" style={{ opacity: 0.6 }}>
                            <span>UNO</span>
                        </div>
                    )}
                </div>
            </div>

            {/* ── MY HAND (BOTTOM) ── */}
            {isSpectator ? (
                <div style={{
                    margin: "24px auto 0",
                    padding: "20px 24px",
                    maxWidth: 640,
                    width: "100%",
                    background: "rgba(15, 23, 42, 0.85)",
                    borderRadius: 18,
                    border: "1px solid rgba(168, 85, 247, 0.35)",
                    backdropFilter: "blur(16px)",
                    boxShadow: "0 12px 32px rgba(0, 0, 0, 0.5)"
                }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 16 }}>👀</span>
                            <strong style={{ fontSize: 14, color: "#e9d5ff" }}>Live Match Roster ({players.length} Players)</strong>
                        </div>
                        <span style={{ fontSize: 12, color: "#34d399", background: "rgba(52, 211, 153, 0.1)", padding: "3px 10px", borderRadius: 12, border: "1px solid rgba(52, 211, 153, 0.2)", fontWeight: 700 }}>
                            Turn: {unoRoom.currentTurnUsername || "Waiting"}
                        </span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 8, marginBottom: 14 }}>
                        {players.map(p => {
                            const isTheirTurn = unoRoom.currentTurn === p.id;
                            return (
                                <div
                                    key={p.id}
                                    style={{
                                        padding: "8px 10px",
                                        borderRadius: 10,
                                        background: isTheirTurn ? "rgba(168, 85, 247, 0.25)" : "rgba(255, 255, 255, 0.04)",
                                        border: isTheirTurn ? "1px solid rgba(168, 85, 247, 0.6)" : "1px solid rgba(255, 255, 255, 0.08)",
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: 2
                                    }}
                                >
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <span style={{ fontSize: 12, fontWeight: 700, color: "#f8fafc", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                            {p.username}
                                        </span>
                                        {p.isHost && <span style={{ fontSize: 10 }}>👑</span>}
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: "#94a3b8" }}>
                                        <span>🎴 {p.cardCount} cards</span>
                                        {p.cardCount === 1 && <span style={{ color: "#ef4444", fontWeight: 800 }}>UNO!</span>}
                                        {isTheirTurn && <span style={{ color: "#38bdf8", fontWeight: 700 }}>Active</span>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div style={{ textAlign: "center", fontSize: 12, color: "#94a3b8" }}>
                        ⏳ You will automatically enter the Start Game page as soon as this match finishes!
                    </div>
                </div>
            ) : (
                <div className="uno-my-hand-section">
                    <div className="uno-hand-header">
                        <span>
                            Your Hand ({myHand.length} cards)
                            {animationPhase === "dealing" && dealingActivePlayer?.id === myId && " • Receiving cards..."}
                        </span>
                        {isMyTurn && <span className="uno-hint-text">Choose a card or click the draw pile</span>}
                    </div>

                    <div className="uno-cards-fan">
                        {myHand.map(card => {
                            const playable = isCardPlayable(card);
                            return (
                                <div
                                    key={card.id}
                                    className={`uno-card-item card-${card.color} card-${card.type} ${playable ? "playable" : "dimmed"}`}
                                    style={{ "--card-color": COLOR_MAP[card.color] || "#111" }}
                                    onClick={() => handleCardClick(card)}
                                >
                                    <div className="uno-card-inner">
                                        <span className="uno-card-corner top-left">{formatCardCorner(card)}</span>

                                        <div className="uno-card-center-oval">
                                            {renderCardCenter(card)}
                                        </div>

                                        <span className="uno-card-corner bottom-right">{formatCardCorner(card)}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── INITIAL SHUFFLE ANIMATION OVERLAY ── */}
            {animationPhase === "shuffling" && (
                <div className="uno-shuffle-modal">
                    <div className="uno-shuffle-deck-box">
                        <div className="uno-shuffle-card-slice">UNO</div>
                        <div className="uno-shuffle-card-slice">UNO</div>
                        <div className="uno-shuffle-card-slice">UNO</div>
                    </div>
                    <div className="uno-shuffle-title">
                        🃏 Shuffling the UNO Deck...
                    </div>
                </div>
            )}

            {/* ── COLOR PICKER MODAL (WILD, WILD DRAW 4 & ROTATE SWAP HANDS) ── */}
            {selectedWildCard && (
                <div className="uno-modal-backdrop">
                    <div className="uno-color-picker-modal">
                        <h3>
                            {selectedWildCard.type === "swap"
                                ? "🔀 Wild Swap Hands"
                                : selectedWildCard.type === "wild4"
                                ? "★ Choose Color for Wild Draw 4 (+4)"
                                : "★ Choose Color for Wild Card"}
                        </h3>

                        {selectedWildCard.type === "swap" && (
                            <p style={{ color: "#c4b5fd", fontSize: "14px", margin: "-6px 0 16px 0", lineHeight: 1.5 }}>
                                All players will pass their hands <strong>{unoRoom.direction === 1 ? "Clockwise ↻" : "Counter-Clockwise ↺"}</strong>!
                                <br />
                                <span style={{ fontSize: "12px", opacity: 0.85 }}>You will receive the previous player's hand.</span>
                            </p>
                        )}

                        <p style={{ color: "#94a3b8", fontSize: "13px", margin: "0 0 14px 0" }}>
                            Choose the next active color:
                        </p>

                        <div className="uno-color-grid">
                            {["red", "blue", "green", "yellow"].map(c => (
                                <button
                                    key={c}
                                    className="uno-pick-color-btn"
                                    style={{ background: COLOR_MAP[c] }}
                                    onClick={() => handleColorSelect(c)}
                                >
                                    {c.toUpperCase()}
                                </button>
                            ))}
                        </div>

                        <button
                            className="uno-cancel-swap-btn"
                            style={{ marginTop: 18, width: "100%" }}
                            onClick={() => setSelectedWildCard(null)}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* ── WINNER OVERLAY ── */}
            {unoRoom.status === "finished" && (
                <div className="uno-winner-overlay">
                    <div className="uno-winner-card">
                        <div className="uno-trophy-icon">🏆</div>
                        <h2>{unoRoom.winner?.username} Won!</h2>
                        <p>First to discard all cards!</p>
                        <div className="uno-winner-actions">
                            <button className="uno-restart-btn" onClick={handleRestart}>
                                🔄 Play Again
                            </button>
                            <button className="uno-exit-btn" onClick={onLeave}>
                                ⬅ Back to Games
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Render the iconic Center of each card
function renderCardCenter(card) {
    if (!card) return null;

    // Wild Draw 4: Bold "+4" in the middle of the white oval
    if (card.type === "wild4") {
        return <span className="uno-wild4-text">+4</span>;
    }

    // Wild Color Change: Real 4-color segmented oval inside the white oval
    if (card.type === "wild") {
        return <div className="uno-wild-wheel" title="Wild Color Change" />;
    }

    // Swap Card: ⇄ swap icon with SWAP label
    if (card.type === "swap") {
        return (
            <div className="uno-swap-symbol-wrap" title="Swap Hands">
                <span className="uno-swap-icon">⇄</span>
                <span className="uno-swap-text">SWAP</span>
            </div>
        );
    }

    // Action cards
    if (card.type === "skip") return <span>⊘</span>;
    if (card.type === "reverse") return <span>⇄</span>;
    if (card.type === "draw2") return <span>+2</span>;

    // Number cards
    return <span>{card.value}</span>;
}

// Format Corner text/symbol
function formatCardCorner(card) {
    if (!card) return "";
    if (card.type === "skip") return "⊘";
    if (card.type === "reverse") return "⇄";
    if (card.type === "draw2") return "+2";
    if (card.type === "wild") return "★";
    if (card.type === "wild4") return "+4";
    if (card.type === "swap") return "⇄";
    return card.value;
}
