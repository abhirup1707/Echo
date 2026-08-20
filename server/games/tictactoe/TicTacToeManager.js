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
        currentTurn: room.currentTurn,
        status: room.status,
        winner: room.winner,
        winLine: room.winLine,
        scores: room.scores
    };
}

module.exports = {
    rooms,
    createRoom,
    getRoom,
    deleteRoom,
    checkWinner,
    getPublicRoom
};
