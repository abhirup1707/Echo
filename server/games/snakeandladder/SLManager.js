const MAPS = require("./maps");

const PLAYER_COLORS = [
    "#ef4444",
    "#3b82f6",
    "#22c55e",
    "#eab308",
    "#a855f7",
    "#f97316"
];

const rooms = {};

function createRoom(roomCode) {
    rooms[roomCode] = {
        roomCode,
        players: [],
        status: "waiting",
        currentTurn: 0,
        mapIndex: 0,
        gameCount: 0,
        dice: null,
        lastMove: null,
        winner: null,
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

function rollDice() {
    return Math.floor(Math.random() * 6) + 1;
}

function getEffect(room, position) {
    const map = MAPS[room.mapIndex];
    const snake = map.snakes.find(s => s.from === position);
    if (snake) return { type: "snake", from: snake.from, to: snake.to };
    const ladder = map.ladders.find(l => l.from === position);
    if (ladder) return { type: "ladder", from: ladder.from, to: ladder.to };
    return null;
}

function getPublicRoom(room) {
    return {
        roomCode: room.roomCode,
        players: room.players,
        status: room.status,
        currentTurn: room.currentTurn,
        mapIndex: room.mapIndex,
        gameCount: room.gameCount,
        mapName: MAPS[room.mapIndex].name,
        snakes: MAPS[room.mapIndex].snakes,
        ladders: MAPS[room.mapIndex].ladders,
        dice: room.dice,
        lastMove: room.lastMove,
        winner: room.winner
    };
}

module.exports = {
    PLAYER_COLORS,
    MAPS,
    rooms,
    createRoom,
    getRoom,
    deleteRoom,
    rollDice,
    getEffect,
    getPublicRoom
};
