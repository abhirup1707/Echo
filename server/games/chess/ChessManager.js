const rooms = {};

// Initial 8x8 Board: row 0 is rank 8 (Black), row 7 is rank 1 (White)
function createInitialBoard() {
    const board = Array(64).fill(null);

    // Black major pieces (row 0)
    const blackPieces = ["r", "n", "b", "q", "k", "b", "n", "r"];
    blackPieces.forEach((p, i) => {
        board[i] = { type: p, color: "b" };
    });
    // Black pawns (row 1)
    for (let i = 8; i < 16; i++) {
        board[i] = { type: "p", color: "b" };
    }

    // White pawns (row 6)
    for (let i = 48; i < 56; i++) {
        board[i] = { type: "p", color: "w" };
    }
    // White major pieces (row 7)
    const whitePieces = ["r", "n", "b", "q", "k", "b", "n", "r"];
    whitePieces.forEach((p, i) => {
        board[56 + i] = { type: p, color: "w" };
    });

    return board;
}

function createRoom(roomCode) {
    rooms[roomCode] = {
        roomCode,
        board: createInitialBoard(),
        players: [], // [ { id, username, color: 'w'|'b' } ]
        spectators: [],
        turn: "w",
        castling: {
            w: { k: true, q: true },
            b: { k: true, q: true }
        },
        enPassant: null, // square index
        halfMoves: 0,
        status: "waiting", // waiting, playing, checkmate, stalemate, resigned
        winner: null,
        inCheck: null, // 'w' | 'b' | null
        captured: { w: [], b: [] },
        moveHistory: [],
        createdAt: new Date()
    };
    return rooms[roomCode];
}

function getRoom(roomCode) {
    return rooms[roomCode] || null;
}

function deleteRoom(roomCode) {
    delete rooms[roomCode];
}

function rowColToIndex(r, c) {
    return r * 8 + c;
}

function indexToRowCol(i) {
    return { r: Math.floor(i / 8), c: i % 8 };
}

function isInside(r, c) {
    return r >= 0 && r < 8 && c >= 0 && c < 8;
}

// Check if square is attacked by color
function isSquareAttacked(board, targetIdx, byColor) {
    const { r: tr, c: tc } = indexToRowCol(targetIdx);

    // 1. Pawn attacks
    const pawnRow = byColor === "w" ? tr + 1 : tr - 1;
    if (isInside(pawnRow, tc - 1)) {
        const p = board[rowColToIndex(pawnRow, tc - 1)];
        if (p && p.color === byColor && p.type === "p") return true;
    }
    if (isInside(pawnRow, tc + 1)) {
        const p = board[rowColToIndex(pawnRow, tc + 1)];
        if (p && p.color === byColor && p.type === "p") return true;
    }

    // 2. Knight attacks
    const knightOffsets = [
        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
        [1, -2], [1, 2], [2, -1], [2, 1]
    ];
    for (const [dr, dc] of knightOffsets) {
        const nr = tr + dr;
        const nc = tc + dc;
        if (isInside(nr, nc)) {
            const p = board[rowColToIndex(nr, nc)];
            if (p && p.color === byColor && p.type === "n") return true;
        }
    }

    // 3. Ray attacks: Rook/Queen (orthogonal), Bishop/Queen (diagonal)
    const directions = [
        // Orthogonal
        { dr: -1, dc: 0, types: ["r", "q"] },
        { dr: 1, dc: 0, types: ["r", "q"] },
        { dr: 0, dc: -1, types: ["r", "q"] },
        { dr: 0, dc: 1, types: ["r", "q"] },
        // Diagonal
        { dr: -1, dc: -1, types: ["b", "q"] },
        { dr: -1, dc: 1, types: ["b", "q"] },
        { dr: 1, dc: -1, types: ["b", "q"] },
        { dr: 1, dc: 1, types: ["b", "q"] }
    ];

    for (const { dr, dc, types } of directions) {
        let nr = tr + dr;
        let nc = tc + dc;
        while (isInside(nr, nc)) {
            const p = board[rowColToIndex(nr, nc)];
            if (p) {
                if (p.color === byColor && types.includes(p.type)) {
                    return true;
                }
                break; // blocked by piece
            }
            nr += dr;
            nc += dc;
        }
    }

    // 4. King attacks (1 step)
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = tr + dr;
            const nc = tc + dc;
            if (isInside(nr, nc)) {
                const p = board[rowColToIndex(nr, nc)];
                if (p && p.color === byColor && p.type === "k") return true;
            }
        }
    }

    return false;
}

function findKingIndex(board, color) {
    for (let i = 0; i < 64; i++) {
        const p = board[i];
        if (p && p.color === color && p.type === "k") {
            return i;
        }
    }
    return -1;
}

function getPseudoLegalMoves(room, fromIdx) {
    const { board, turn, castling, enPassant } = room;
    const piece = board[fromIdx];
    if (!piece || piece.color !== turn) return [];

    const moves = [];
    const { r, c } = indexToRowCol(fromIdx);
    const color = piece.color;
    const enemyColor = color === "w" ? "b" : "w";

    if (piece.type === "p") {
        const forward = color === "w" ? -1 : 1;
        const startRow = color === "w" ? 6 : 1;

        // 1 step forward
        const nr = r + forward;
        if (isInside(nr, c) && !board[rowColToIndex(nr, c)]) {
            moves.push(rowColToIndex(nr, c));
            // 2 steps forward
            const nnr = r + forward * 2;
            if (r === startRow && !board[rowColToIndex(nnr, c)]) {
                moves.push(rowColToIndex(nnr, c));
            }
        }

        // Diagonal captures
        for (const dc of [-1, 1]) {
            const nc = c + dc;
            if (isInside(nr, nc)) {
                const target = rowColToIndex(nr, nc);
                const targetPiece = board[target];
                if (targetPiece && targetPiece.color === enemyColor) {
                    moves.push(target);
                } else if (target === enPassant) {
                    moves.push(target); // En passant
                }
            }
        }
    } else if (piece.type === "n") {
        const offsets = [
            [-2, -1], [-2, 1], [-1, -2], [-1, 2],
            [1, -2], [1, 2], [2, -1], [2, 1]
        ];
        for (const [dr, dc] of offsets) {
            const nr = r + dr;
            const nc = c + dc;
            if (isInside(nr, nc)) {
                const target = rowColToIndex(nr, nc);
                const p = board[target];
                if (!p || p.color === enemyColor) moves.push(target);
            }
        }
    } else if (piece.type === "b" || piece.type === "r" || piece.type === "q") {
        const dirs = [];
        if (piece.type === "r" || piece.type === "q") {
            dirs.push([-1, 0], [1, 0], [0, -1], [0, 1]);
        }
        if (piece.type === "b" || piece.type === "q") {
            dirs.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
        }
        for (const [dr, dc] of dirs) {
            let nr = r + dr;
            let nc = c + dc;
            while (isInside(nr, nc)) {
                const target = rowColToIndex(nr, nc);
                const p = board[target];
                if (!p) {
                    moves.push(target);
                } else {
                    if (p.color === enemyColor) moves.push(target);
                    break;
                }
                nr += dr;
                nc += dc;
            }
        }
    } else if (piece.type === "k") {
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const nr = r + dr;
                const nc = c + dc;
                if (isInside(nr, nc)) {
                    const target = rowColToIndex(nr, nc);
                    const p = board[target];
                    if (!p || p.color === enemyColor) moves.push(target);
                }
            }
        }

        // Castling
        const kingStart = color === "w" ? 60 : 4;
        const kingRow = color === "w" ? 7 : 0;
        if (fromIdx === kingStart && !isSquareAttacked(board, kingStart, enemyColor)) {
            // Kingside
            if (castling[color].k) {
                const f1 = rowColToIndex(kingRow, 5);
                const g1 = rowColToIndex(kingRow, 6);
                const h1 = rowColToIndex(kingRow, 7);
                if (!board[f1] && !board[g1] && board[h1]?.type === "r") {
                    if (!isSquareAttacked(board, f1, enemyColor) && !isSquareAttacked(board, g1, enemyColor)) {
                        moves.push(g1);
                    }
                }
            }
            // Queenside
            if (castling[color].q) {
                const d1 = rowColToIndex(kingRow, 3);
                const c1 = rowColToIndex(kingRow, 2);
                const b1 = rowColToIndex(kingRow, 1);
                const a1 = rowColToIndex(kingRow, 0);
                if (!board[d1] && !board[c1] && !board[b1] && board[a1]?.type === "r") {
                    if (!isSquareAttacked(board, d1, enemyColor) && !isSquareAttacked(board, c1, enemyColor)) {
                        moves.push(c1);
                    }
                }
            }
        }
    }

    return moves;
}

// Simulate move and check if king remains safe
function simulateMove(room, fromIdx, toIdx) {
    const board = room.board.map(p => (p ? { ...p } : null));
    const piece = board[fromIdx];
    const { r: fr, c: fc } = indexToRowCol(fromIdx);
    const { r: tr, c: tc } = indexToRowCol(toIdx);
    const color = piece.color;

    // En passant capture
    if (piece.type === "p" && toIdx === room.enPassant) {
        const capturedPawnIdx = rowColToIndex(fr, tc);
        board[capturedPawnIdx] = null;
    }

    // Castling move
    if (piece.type === "k" && Math.abs(fc - tc) === 2) {
        if (tc === 6) { // Kingside
            const rookFrom = rowColToIndex(fr, 7);
            const rookTo = rowColToIndex(fr, 5);
            board[rookTo] = board[rookFrom];
            board[rookFrom] = null;
        } else if (tc === 2) { // Queenside
            const rookFrom = rowColToIndex(fr, 0);
            const rookTo = rowColToIndex(fr, 3);
            board[rookTo] = board[rookFrom];
            board[rookFrom] = null;
        }
    }

    board[toIdx] = piece;
    board[fromIdx] = null;

    const kingIdx = findKingIndex(board, color);
    const enemyColor = color === "w" ? "b" : "w";
    return !isSquareAttacked(board, kingIdx, enemyColor);
}

function getLegalMoves(room, fromIdx) {
    const pseudoMoves = getPseudoLegalMoves(room, fromIdx);
    return pseudoMoves.filter(toIdx => simulateMove(room, fromIdx, toIdx));
}

function getAllLegalMoves(room, color) {
    const all = [];
    for (let i = 0; i < 64; i++) {
        if (room.board[i] && room.board[i].color === color) {
            const moves = getLegalMoves(room, i);
            if (moves.length > 0) {
                all.push({ from: i, moves });
            }
        }
    }
    return all;
}

function makeChessMove(room, playerId, fromIdx, toIdx, promotion = "q") {
    if (room.status !== "playing") return { success: false, message: "Game not active" };

    const player = room.players.find(p => p.id === playerId);
    if (!player || player.color !== room.turn) {
        return { success: false, message: "Not your turn" };
    }

    const legalMoves = getLegalMoves(room, fromIdx);
    if (!legalMoves.includes(toIdx)) {
        return { success: false, message: "Illegal move" };
    }

    const piece = room.board[fromIdx];
    const captured = room.board[toIdx];
    const { r: fr, c: fc } = indexToRowCol(fromIdx);
    const { r: tr, c: tc } = indexToRowCol(toIdx);
    const color = piece.color;
    const enemyColor = color === "w" ? "b" : "w";

    // Track captured pieces
    if (captured) {
        room.captured[enemyColor].push(captured.type);
    }

    // En passant capture
    let wasEnPassant = false;
    if (piece.type === "p" && toIdx === room.enPassant) {
        const capturedPawnIdx = rowColToIndex(fr, tc);
        const enPassantCaptured = room.board[capturedPawnIdx];
        if (enPassantCaptured) {
            room.captured[enemyColor].push(enPassantCaptured.type);
            room.board[capturedPawnIdx] = null;
            wasEnPassant = true;
        }
    }

    // Castling rook movement
    if (piece.type === "k" && Math.abs(fc - tc) === 2) {
        if (tc === 6) { // Kingside
            const rookFrom = rowColToIndex(fr, 7);
            const rookTo = rowColToIndex(fr, 5);
            room.board[rookTo] = room.board[rookFrom];
            room.board[rookFrom] = null;
        } else if (tc === 2) { // Queenside
            const rookFrom = rowColToIndex(fr, 0);
            const rookTo = rowColToIndex(fr, 3);
            room.board[rookTo] = room.board[rookFrom];
            room.board[rookFrom] = null;
        }
    }

    // Castling rights update
    if (piece.type === "k") {
        room.castling[color].k = false;
        room.castling[color].q = false;
    }
    if (piece.type === "r") {
        if (fromIdx === 56) room.castling.w.q = false;
        if (fromIdx === 63) room.castling.w.k = false;
        if (fromIdx === 0) room.castling.b.q = false;
        if (fromIdx === 7) room.castling.b.k = false;
    }

    // Set En Passant target if pawn moved 2 squares
    if (piece.type === "p" && Math.abs(fr - tr) === 2) {
        room.enPassant = rowColToIndex((fr + tr) / 2, fc);
    } else {
        room.enPassant = null;
    }

    // Move piece
    room.board[toIdx] = piece;
    room.board[fromIdx] = null;

    // Promotion
    let wasPromotion = false;
    if (piece.type === "p" && (tr === 0 || tr === 7)) {
        room.board[toIdx] = { type: promotion || "q", color };
        wasPromotion = true;
    }

    // Turn switch
    room.turn = enemyColor;

    // Check detection
    const enemyKingIdx = findKingIndex(room.board, enemyColor);
    const inCheck = isSquareAttacked(room.board, enemyKingIdx, color);
    room.inCheck = inCheck ? enemyColor : null;

    // Game over detection
    const enemyLegalMoves = getAllLegalMoves(room, enemyColor);
    if (enemyLegalMoves.length === 0) {
        if (inCheck) {
            room.status = "checkmate";
            room.winner = color;
        } else {
            room.status = "stalemate";
            room.winner = "draw";
        }
    }

    room.moveHistory.push({
        from: fromIdx,
        to: toIdx,
        piece: piece.type,
        color,
        captured: captured ? captured.type : wasEnPassant ? "p" : null,
        promotion: wasPromotion ? promotion : null
    });

    return { success: true };
}

function resetChessGame(room) {
    if (!room) return;
    if (room.autoResetTimer) {
        clearTimeout(room.autoResetTimer);
        room.autoResetTimer = null;
    }
    // If waiting spectators exist, rotate them in if players.length < 2
    if (room.spectators && room.spectators.length > 0) {
        while (room.players.length < 2 && room.spectators.length > 0) {
            const nextS = room.spectators.shift();
            if (!room.players.some(p => p.id === nextS.id)) {
                const color = room.players.length === 0 ? "w" : "b";
                room.players.push({
                    id: nextS.id,
                    username: nextS.username,
                    color
                });
            }
        }
    }
    // Swap colors for existing players if 2
    if (room.players.length === 2) {
        room.players[0].color = room.players[0].color === "w" ? "b" : "w";
        room.players[1].color = room.players[1].color === "w" ? "b" : "w";
    }
    room.board = createInitialBoard();
    room.turn = "w";
    room.castling = {
        w: { k: true, q: true },
        b: { k: true, q: true }
    };
    room.enPassant = null;
    room.halfMoves = 0;
    room.status = room.players.length === 2 ? "playing" : "waiting";
    room.winner = null;
    room.inCheck = null;
    room.captured = { w: [], b: [] };
    room.moveHistory = [];
}

function getPublicChessRoom(room) {
    return {
        roomCode: room.roomCode,
        board: room.board,
        players: room.players,
        spectators: (room.spectators || []).map(s => ({ id: s.id, username: s.username })),
        turn: room.turn,
        status: room.status,
        winner: room.winner,
        inCheck: room.inCheck,
        captured: room.captured,
        lastMove: room.moveHistory[room.moveHistory.length - 1] || null
    };
}

module.exports = {
    rooms,
    createRoom,
    getRoom,
    deleteRoom,
    getLegalMoves,
    makeChessMove,
    getPublicChessRoom,
    resetChessGame
};
