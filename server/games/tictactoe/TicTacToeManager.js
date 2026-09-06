const rooms = {};

const WIN_LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
];

function createRoom(roomCode) {
    rooms[roomCode] = {
        roomCode,
        board: Array(9).fill(null),
        players: [],
        spectators: [],
        currentTurn: "X",
        status: "waiting",
        winner: null,
        winLine: null,
        scores: { X: 0, O: 0 },
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

function checkWinner(board) {
    for (const line of WIN_LINES) {
        const [a, b, c] = line;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return { winner: board[a], line };
        }
    }
    if (board.every(cell => cell !== null)) {
        return { winner: "draw", line: null };
    }
    return null;
}

function getPublicRoom(room) {
    return {
        roomCode: room.roomCode,
        board: room.board,
        players: room.players,
        spectators: (room.spectators || []).map(s => ({ id: s.id, username: s.username })),
        currentTurn: room.currentTurn,
        status: room.status,
        winner: room.winner,
        winLine: room.winLine,
        scores: room.scores
    };
}

function resetTTTRoom(room) {
    if (!room) return;
    if (room.spectators && room.spectators.length > 0) {
        while (room.players.length < 2 && room.spectators.length > 0) {
            const nextS = room.spectators.shift();
            if (!room.players.some(p => p.id === nextS.id)) {
                const symbol = room.players.length === 0 ? "X" : "O";
                room.players.push({
                    id: nextS.id,
                    username: nextS.username,
                    symbol
                });
            }
        }
    }
    room.board = Array(9).fill(null);
    room.currentTurn = "X";
    room.winner = null;
    room.winLine = null;
    room.status = room.players.length === 2 ? "playing" : "waiting";
}

module.exports = {
    rooms,
    createRoom,
    getRoom,
    deleteRoom,
    checkWinner,
    getPublicRoom,
    resetTTTRoom
};
