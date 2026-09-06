const rooms = {};

const COLORS = ["red", "green", "yellow", "blue"];

// Start cell on outer 52-track for each color
const START_INDEX = {
    red: 0,
    green: 13,
    yellow: 26,
    blue: 39
};

// Safe squares on 52-track: starts (0, 13, 26, 39) and star squares (8, 21, 34, 47)
const SAFE_SQUARES = [0, 8, 13, 21, 26, 34, 39, 47];

function createInitialTokens() {
    return [
        { id: 0, step: -1 }, // -1: yard, 0..50: outer track, 51..55: home column, 56: finished
        { id: 1, step: -1 },
        { id: 2, step: -1 },
        { id: 3, step: -1 }
    ];
}

function createRoom(roomCode) {
    rooms[roomCode] = {
        roomCode,
        players: [], // { id, username, color, tokens: [] }
        spectators: [], // { id, username }
        turnIndex: 0,
        diceValue: null,
        diceRolled: false,
        sixCount: 0,
        status: "waiting", // waiting, playing, finished
        winner: null,
        lastAction: "Waiting for players...",
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

function getTrackIndex(color, step) {
    if (step < 0 || step > 50) return null; // In yard or in home column
    return (START_INDEX[color] + step) % 52;
}

function startLudoGame(room) {
    if (room.players.length < 2) return false;

    room.players.forEach((p, idx) => {
        p.color = COLORS[idx];
        p.tokens = createInitialTokens();
    });

    room.turnIndex = 0;
    room.diceValue = null;
    room.diceRolled = false;
    room.sixCount = 0;
    room.status = "playing";
    room.winner = null;
    room.lastAction = `Game started! ${room.players[0].username}'s turn to roll.`;

    return true;
}

function getLegalTokenMoves(player, dice) {
    if (!dice) return [];
    const legal = [];

    player.tokens.forEach(token => {
        if (token.step === 56) return; // Already finished

        if (token.step === -1) {
            // Can only leave yard with a 6
            if (dice === 6) {
                legal.push(token.id);
            }
        } else {
            // Cannot overshoot 56
            if (token.step + dice <= 56) {
                legal.push(token.id);
            }
        }
    });

    return legal;
}

function advanceTurn(room) {
    room.diceValue = null;
    room.diceRolled = false;
    room.sixCount = 0;
    room.turnIndex = (room.turnIndex + 1) % room.players.length;
    const nextPlayer = room.players[room.turnIndex];
    room.lastAction = `${nextPlayer.username}'s turn to roll`;
}

function rollDice(room, playerId) {
    if (room.status !== "playing") return { success: false, message: "Game not active" };

    const currentPlayer = room.players[room.turnIndex];
    if (!currentPlayer || currentPlayer.id !== playerId) {
        return { success: false, message: "Not your turn" };
    }

    if (room.diceRolled) {
        return { success: false, message: "Dice already rolled, select a token" };
    }

    const roll = Math.floor(Math.random() * 6) + 1;
    room.diceValue = roll;
    room.diceRolled = true;

    if (roll === 6) {
        room.sixCount++;
        if (room.sixCount === 3) {
            // Three 6s in a row cancels turn
            room.lastAction = `${currentPlayer.username} rolled three 6s! Turn passing...`;
            return { success: true, roll, autoAdvance: true };
        }
    } else {
        room.sixCount = 0;
    }

    const legalMoves = getLegalTokenMoves(currentPlayer, roll);

    if (legalMoves.length === 0) {
        room.lastAction = `${currentPlayer.username} rolled a ${roll}. No legal moves! Turn passing...`;
        return { success: true, roll, autoAdvance: true, legalMoves: [] };
    }

    room.lastAction = `${currentPlayer.username} rolled a ${roll}! Pick a token to move.`;
    return { success: true, roll, legalMoves };
}

function moveToken(room, playerId, tokenId) {
    if (room.status !== "playing") return { success: false, message: "Game not active" };

    const currentPlayer = room.players[room.turnIndex];
    if (!currentPlayer || currentPlayer.id !== playerId) {
        return { success: false, message: "Not your turn" };
    }

    if (!room.diceRolled || !room.diceValue) {
        return { success: false, message: "Roll dice first" };
    }

    const legalMoves = getLegalTokenMoves(currentPlayer, room.diceValue);
    if (!legalMoves.includes(tokenId)) {
        return { success: false, message: "Illegal token move" };
    }

    const token = currentPlayer.tokens.find(t => t.id === tokenId);
    const roll = room.diceValue;
    let extraRoll = roll === 6;

    if (token.step === -1) {
        // Leave yard to start position
        token.step = 0;
        room.lastAction = `${currentPlayer.username} released token onto the track!`;
    } else {
        token.step += roll;
        room.lastAction = `${currentPlayer.username} moved token ${roll} steps.`;
    }

    // Check for capture if on outer track
    const landTrackIdx = getTrackIndex(currentPlayer.color, token.step);
    if (landTrackIdx !== null && !SAFE_SQUARES.includes(landTrackIdx)) {
        // Look for opponent tokens on this square
        room.players.forEach(otherPlayer => {
            if (otherPlayer.id === currentPlayer.id) return;
            otherPlayer.tokens.forEach(otherToken => {
                const otherTrackIdx = getTrackIndex(otherPlayer.color, otherToken.step);
                if (otherTrackIdx === landTrackIdx) {
                    // Capture!
                    otherToken.step = -1; // Send back to yard
                    extraRoll = true; // Bonus roll on capture
                    room.lastAction = `💥 ${currentPlayer.username} captured ${otherPlayer.username}'s token! Bonus roll!`;
                }
            });
        });
    }

    // Check if player finished all 4 tokens
    const finishedAll = currentPlayer.tokens.every(t => t.step === 56);
    if (finishedAll) {
        room.status = "finished";
        room.winner = currentPlayer;
        room.lastAction = `🏆 ${currentPlayer.username} won the Ludo match!`;
        return { success: true, finished: true };
    }

    if (extraRoll) {
        room.diceRolled = false;
        room.diceValue = null;
        room.lastAction += ` ${currentPlayer.username} gets another roll!`;
    } else {
        advanceTurn(room);
    }

    return { success: true };
}

function getPublicLudoRoom(room) {
    const currentPlayer = room.players[room.turnIndex] || null;
    const legalMoves = (room.diceRolled && currentPlayer) ? getLegalTokenMoves(currentPlayer, room.diceValue) : [];

    return {
        roomCode: room.roomCode,
        status: room.status,
        turnIndex: room.turnIndex,
        currentTurn: currentPlayer ? currentPlayer.id : null,
        currentTurnUsername: currentPlayer ? currentPlayer.username : null,
        currentTurnColor: currentPlayer ? currentPlayer.color : null,
        diceValue: room.diceValue,
        diceRolled: room.diceRolled,
        legalMoves,
        lastAction: room.lastAction,
        winner: room.winner ? { id: room.winner.id, username: room.winner.username } : null,
        players: room.players.map(p => ({
            id: p.id,
            username: p.username,
            color: p.color,
            tokens: p.tokens || []
        })),
        spectators: (room.spectators || []).map(s => ({
            id: s.id,
            username: s.username
        }))
    };
}

function resetLudoGame(room) {
    if (!room) return;
    if (room.spectators && room.spectators.length > 0) {
        while (room.players.length < 4 && room.spectators.length > 0) {
            const nextP = room.spectators.shift();
            if (!room.players.some(p => p.id === nextP.id)) {
                room.players.push({
                    id: nextP.id,
                    username: nextP.username,
                    tokens: []
                });
            }
        }
    }
    room.status = "waiting";
    room.winner = null;
    room.diceValue = null;
    room.diceRolled = false;
    room.sixCount = 0;
    room.turnIndex = 0;
    room.lastAction = "Waiting for players...";
    room.players.forEach(p => {
        p.tokens = [];
    });
}

module.exports = {
    rooms,
    createRoom,
    getRoom,
    deleteRoom,
    startLudoGame,
    rollDice,
    moveToken,
    advanceTurn,
    getPublicLudoRoom,
    resetLudoGame
};
