import { useState, useEffect } from "react";
import socket from "../../../socket";
import "./ChessGame.css";

const SOLID_PIECES = {
    k: "♚",
    q: "♛",
    r: "♜",
    b: "♝",
    n: "♞",
    p: "♟"
};

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

export default function ChessGame({ roomCode, chessRoom, onLeave }) {
    const myId = socket.id;
    const me = chessRoom.players.find(p => p.id === myId);
    const opponent = chessRoom.players.find(p => p.id !== myId);

    const myColor = me?.color || "w";
    const [flipped, setFlipped] = useState(myColor === "b");
    const [selectedSquare, setSelectedSquare] = useState(null);
    const [legalMoves, setLegalMoves] = useState([]);
    const [pendingPromotion, setPendingPromotion] = useState(null);

    const isMyTurn = chessRoom.turn === myColor;
    const isPlaying = chessRoom.status === "playing";
    const lastMove = chessRoom.lastMove;

    useEffect(() => {
        function handleLegalMoves(data) {
            if (data.from === selectedSquare) {
                setLegalMoves(data.moves || []);
            }
        }

        socket.on("chess-legal-moves", handleLegalMoves);
        return () => {
            socket.off("chess-legal-moves", handleLegalMoves);
        };
    }, [selectedSquare]);

    useEffect(() => {
        // Reset selections when turn or board changes
        setSelectedSquare(null);
        setLegalMoves([]);
        setPendingPromotion(null);
    }, [chessRoom.turn, chessRoom.board]);

    function handleSquareClick(idx) {
        if (!isPlaying) return;

        const piece = chessRoom.board[idx];

        // 1. If currently have a piece selected and clicked a legal move square
        if (selectedSquare !== null && legalMoves.includes(idx)) {
            const movingPiece = chessRoom.board[selectedSquare];
            const targetRow = Math.floor(idx / 8);

            // Check pawn promotion
            if (movingPiece && movingPiece.type === "p" && (targetRow === 0 || targetRow === 7)) {
                setPendingPromotion({ from: selectedSquare, to: idx });
                return;
            }

            // Normal move
            socket.emit("chess-move", {
                roomCode,
                from: selectedSquare,
                to: idx,
                promotion: "q"
            });
            setSelectedSquare(null);
            setLegalMoves([]);
            return;
        }

        // 2. Clicked a piece belonging to current user on user's turn
        if (piece && piece.color === myColor && isMyTurn) {
            if (selectedSquare === idx) {
                // Deselect
                setSelectedSquare(null);
                setLegalMoves([]);
            } else {
                setSelectedSquare(idx);
                setLegalMoves([]);
                socket.emit("chess-get-moves", { roomCode, from: idx });
            }
            return;
        }

        // 3. Clicked somewhere else
        setSelectedSquare(null);
        setLegalMoves([]);
    }

    function handlePromotionSelect(chosenPiece) {
        if (!pendingPromotion) return;
        socket.emit("chess-move", {
            roomCode,
            from: pendingPromotion.from,
            to: pendingPromotion.to,
            promotion: chosenPiece
        });
        setPendingPromotion(null);
        setSelectedSquare(null);
        setLegalMoves([]);
    }

    function handleResign() {
        if (window.confirm("Are you sure you want to resign the match?")) {
            socket.emit("chess-resign", { roomCode });
        }
    }

    function handleRematch() {
        socket.emit("chess-restart", { roomCode });
    }

    // Build the 64 squares list based on board orientation
    const rows = flipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
    const cols = flipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];

    const whitePlayer = chessRoom.players.find(p => p.color === "w");
    const blackPlayer = chessRoom.players.find(p => p.color === "b");

    const topPlayer = flipped ? whitePlayer : blackPlayer;
    const bottomPlayer = flipped ? blackPlayer : whitePlayer;

    const isGameOver = ["checkmate", "stalemate", "resigned"].includes(chessRoom.status);

    return (
        <div className="chess-container">
            {/* Header */}
            <div className="chess-header">
                <div className="chess-header-left">
                    <button className="chess-back-btn" onClick={onLeave}>
                        ⬅ Exit Game
                    </button>
                    <div className="chess-title-wrap">
                        <h2>Grandmaster Chess</h2>
                        <span>Room: {roomCode} • Official FIDE Rules</span>
                    </div>
                </div>

                <div className="chess-header-right">
                    <button
                        className="chess-flip-btn"
                        onClick={() => setFlipped(!flipped)}
                        title="Flip board orientation"
                    >
                        🔄 Flip Board
                    </button>
                    {isPlaying && (
                        <button
                            className="chess-resign-btn"
                            onClick={handleResign}
                            title="Resign this match"
                        >
                            🏳 Resign
                        </button>
                    )}
                </div>
            </div>

            {/* Main Layout */}
            <div className="chess-main-layout">
                {/* Chess Board Wrapper */}
                <div className="chess-board-wrapper">
                    {/* Top Player Strip */}
                    <div className={`chess-player-strip ${chessRoom.turn === topPlayer?.color && isPlaying ? "active-turn" : ""}`}>
                        <div className="chess-player-info">
                            <div className={`chess-color-indicator ${topPlayer?.color === "w" ? "white" : "black"}`} />
                            <span className="chess-player-name">
                                {topPlayer?.username || "Opponent"} {topPlayer?.id === myId ? "(You)" : ""}
                            </span>
                        </div>
                        <div className="chess-captured-tray">
                            {/* Captured pieces by top player */}
                            {topPlayer && (chessRoom.captured[topPlayer.color] || []).map((p, idx) => (
                                <span key={idx} className={topPlayer.color === "w" ? "black-piece" : "white-piece"}>
                                    {SOLID_PIECES[p]}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Check indicator if any */}
                    {chessRoom.inCheck && isPlaying && (
                        <div className="chess-check-alert">
                            ⚠️ {chessRoom.inCheck === "w" ? "White" : "Black"} is in CHECK!
                        </div>
                    )}

                    {/* Outer Board Frame */}
                    <div className="chess-board-outer">
                        <div className="chess-board-grid">
                            {rows.map((r, rDisplayIdx) =>
                                cols.map((c, cDisplayIdx) => {
                                    const squareIdx = r * 8 + c;
                                    const piece = chessRoom.board[squareIdx];
                                    const isLight = (r + c) % 2 === 0;
                                    const isSelected = selectedSquare === squareIdx;
                                    const isLegalTarget = legalMoves.includes(squareIdx);
                                    const isLastMoveSquare = lastMove && (lastMove.from === squareIdx || lastMove.to === squareIdx);
                                    const isKingInCheck = chessRoom.inCheck && piece && piece.type === "k" && piece.color === chessRoom.inCheck;

                                    return (
                                        <div
                                            key={squareIdx}
                                            className={`chess-square ${isLight ? "light" : "dark"} ${isSelected ? "selected" : ""} ${isLastMoveSquare ? "last-move" : ""} ${isKingInCheck ? "in-check-king" : ""}`}
                                            onClick={() => handleSquareClick(squareIdx)}
                                        >
                                            {/* File label at bottom */}
                                            {rDisplayIdx === 7 && (
                                                <span className="chess-coord-file">{FILES[c]}</span>
                                            )}

                                            {/* Rank label on left */}
                                            {cDisplayIdx === 0 && (
                                                <span className="chess-coord-rank">{8 - r}</span>
                                            )}

                                            {/* Legal move marker */}
                                            {isLegalTarget && !piece && (
                                                <div className="chess-move-dot" />
                                            )}
                                            {isLegalTarget && piece && (
                                                <div className="chess-capture-ring" />
                                            )}

                                            {/* Piece */}
                                            {piece && (
                                                <div className={`chess-piece-icon ${piece.color === "w" ? "white-piece" : "black-piece"}`}>
                                                    {SOLID_PIECES[piece.type]}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Bottom Player Strip */}
                    <div className={`chess-player-strip ${chessRoom.turn === bottomPlayer?.color && isPlaying ? "active-turn" : ""}`}>
                        <div className="chess-player-info">
                            <div className={`chess-color-indicator ${bottomPlayer?.color === "w" ? "white" : "black"}`} />
                            <span className="chess-player-name">
                                {bottomPlayer?.username || "Player"} {bottomPlayer?.id === myId ? "(You)" : ""}
                            </span>
                        </div>
                        <div className="chess-captured-tray">
                            {/* Captured pieces by bottom player */}
                            {bottomPlayer && (chessRoom.captured[bottomPlayer.color] || []).map((p, idx) => (
                                <span key={idx} className={bottomPlayer.color === "w" ? "black-piece" : "white-piece"}>
                                    {SOLID_PIECES[p]}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right / Side Panel */}
                <div className="chess-side-panel">
                    <h3>Game Status</h3>

                    <div className="chess-status-badge">
                        <span className="chess-status-label">Turn</span>
                        <span className="chess-status-value" style={{ color: chessRoom.turn === myColor ? "#22c55e" : "#f1f5f9" }}>
                            {chessRoom.turn === myColor
                                ? "Your Turn (" + (myColor === "w" ? "White" : "Black") + ")"
                                : (opponent?.username || "Opponent") + "'s Turn"}
                        </span>
                    </div>

                    <div className="chess-status-badge">
                        <span className="chess-status-label">Your Playing Color</span>
                        <span className="chess-status-value">
                            {myColor === "w" ? "⚪ White (Moves First)" : "⚫ Black"}
                        </span>
                    </div>

                    {lastMove && (
                        <div className="chess-status-badge">
                            <span className="chess-status-label">Last Move</span>
                            <span className="chess-status-value">
                                {FILES[lastMove.from % 8]}{8 - Math.floor(lastMove.from / 8)} ➔ {FILES[lastMove.to % 8]}{8 - Math.floor(lastMove.to / 8)}
                                {lastMove.captured ? ` (Captured ${lastMove.captured.toUpperCase()})` : ""}
                                {lastMove.promotion ? ` =${lastMove.promotion.toUpperCase()}` : ""}
                            </span>
                        </div>
                    )}

                    <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
                        <button className="chess-back-btn" onClick={onLeave} style={{ width: "100%" }}>
                            ⬅ Leave Chess Match
                        </button>
                    </div>
                </div>
            </div>

            {/* Pawn Promotion Modal */}
            {pendingPromotion && (
                <div className="chess-modal-backdrop">
                    <div className="chess-promotion-modal">
                        <h3>Promote Pawn To</h3>
                        <div className="chess-promotion-choices">
                            {[
                                { type: "q", label: "Queen" },
                                { type: "r", label: "Rook" },
                                { type: "b", label: "Bishop" },
                                { type: "n", label: "Knight" }
                            ].map(item => (
                                <button
                                    key={item.type}
                                    className="chess-promo-btn"
                                    onClick={() => handlePromotionSelect(item.type)}
                                    title={item.label}
                                >
                                    {SOLID_PIECES[item.type]}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Game Over Modal */}
            {isGameOver && (
                <div className="chess-modal-backdrop">
                    <div className="chess-gameover-card">
                        <div className="chess-trophy-icon">
                            {chessRoom.winner === myColor ? "🏆" : chessRoom.winner === "draw" ? "🤝" : "👑"}
                        </div>
                        <h2>
                            {chessRoom.status === "checkmate" && "Checkmate!"}
                            {chessRoom.status === "resigned" && "Game Over by Resignation"}
                            {chessRoom.status === "stalemate" && "Draw by Stalemate"}
                        </h2>
                        <p>
                            {chessRoom.winner === "draw"
                                ? "The match ended in a draw."
                                : `${chessRoom.winner === "w" ? "White" : "Black"} (${chessRoom.players.find(p => p.color === chessRoom.winner)?.username || "Player"}) won the match!`}
                        </p>
                        <div className="chess-gameover-actions">
                            <button className="chess-restart-btn" onClick={handleRematch}>
                                🔄 Rematch (Swap Colors)
                            </button>
                            <button className="chess-back-btn" onClick={onLeave}>
                                ⬅ Back to Games
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
