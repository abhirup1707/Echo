const {
    createRoom,
    getRoom,
    deleteRoom,
    startLudoGame,
    rollDice,
    moveToken,
    advanceTurn,
    getPublicLudoRoom,
    resetLudoGame,
    rooms
} = require("./LudoManager");
const { notifyGameActivity } = require("../GameStatusTracker");

function registerLudoEvents(io, socket) {
    // JOIN LUDO
    socket.on("ludo-join", ({ roomCode, username }) => {
        let room = getRoom(roomCode);
        if (!room) {
            room = createRoom(roomCode);
        }

        const existing = room.players.find(p => p.id === socket.id);
        if (!existing) {
            if (room.players.length >= 4 || room.status === "playing") {
                // Enter Spectate / Waiting Mode
                if (!room.spectators) room.spectators = [];
                if (!room.spectators.find(s => s.id === socket.id)) {
                    room.spectators.push({
                        id: socket.id,
                        username: username || "Spectator"
                    });
                }
                socket.join(`ludo-${roomCode}`);
                io.to(`ludo-${roomCode}`).emit("ludo-room", getPublicLudoRoom(room));
                notifyGameActivity(io, roomCode);
                return;
            }
            room.players.push({
                id: socket.id,
                username,
                tokens: []
            });
        }

        socket.join(`ludo-${roomCode}`);
        io.to(`ludo-${roomCode}`).emit("ludo-room", getPublicLudoRoom(room));
        notifyGameActivity(io, roomCode);
    });

    // START LUDO
    socket.on("ludo-start", ({ roomCode }) => {
        const room = getRoom(roomCode);
        if (!room) return;
        if (!room.players[0] || room.players[0].id !== socket.id) return;

        const started = startLudoGame(room);
        if (started) {
            io.to(`ludo-${roomCode}`).emit("ludo-room", getPublicLudoRoom(room));
        }
    });

    // ROLL DICE
    socket.on("ludo-roll", ({ roomCode }) => {
        const room = getRoom(roomCode);
        if (!room) return;

        const result = rollDice(room, socket.id);
        if (result.success) {
            // First emit room with the rolled diceValue so all players see the result
            io.to(`ludo-${roomCode}`).emit("ludo-room", getPublicLudoRoom(room));

            // If autoAdvance is true (no legal moves or 3 consecutive sixes), delay advanceTurn so everyone sees the roll
            if (result.autoAdvance) {
                setTimeout(() => {
                    const currentRoom = getRoom(roomCode);
                    if (currentRoom && currentRoom.status === "playing" && currentRoom.diceRolled) {
                        advanceTurn(currentRoom);
                        io.to(`ludo-${roomCode}`).emit("ludo-room", getPublicLudoRoom(currentRoom));
                    }
                }, 1800);
            }
        } else {
            socket.emit("ludo-error", { message: result.message });
        }
    });

    // MOVE TOKEN
    socket.on("ludo-move", ({ roomCode, tokenId }) => {
        const room = getRoom(roomCode);
        if (!room) return;

        const result = moveToken(room, socket.id, tokenId);
        if (result.success) {
            io.to(`ludo-${roomCode}`).emit("ludo-room", getPublicLudoRoom(room));
            if (result.finished || room.status === "finished") {
                if (room.autoResetTimer) clearTimeout(room.autoResetTimer);
                room.autoResetTimer = setTimeout(() => {
                    if (room.status === "finished") {
                        resetLudoGame(room);
                        io.to(`ludo-${roomCode}`).emit("ludo-room", getPublicLudoRoom(room));
                    }
                }, 7000);
            }
        } else {
            socket.emit("ludo-error", { message: result.message });
        }
    });

    // PLAY AGAIN / RESTART LUDO
    socket.on("ludo-play-again", ({ roomCode }) => {
        const room = getRoom(roomCode);
        if (!room) return;
        resetLudoGame(room);
        io.to(`ludo-${roomCode}`).emit("ludo-room", getPublicLudoRoom(room));
    });

    socket.on("ludo-restart", ({ roomCode }) => {
        const room = getRoom(roomCode);
        if (!room) return;
        resetLudoGame(room);
        io.to(`ludo-${roomCode}`).emit("ludo-room", getPublicLudoRoom(room));
    });

    // RESET LUDO (Play Again / Back to Lobby)
    socket.on("ludo-reset", ({ roomCode }) => {
        const room = getRoom(roomCode);
        if (!room) return;
        resetLudoGame(room);
        io.to(`ludo-${roomCode}`).emit("ludo-room", getPublicLudoRoom(room));
    });

    // LEAVE LUDO
    socket.on("ludo-leave", ({ roomCode }) => {
        const room = getRoom(roomCode);
        if (!room) return;

        room.players = room.players.filter(p => p.id !== socket.id);
        if (room.spectators) {
            room.spectators = room.spectators.filter(s => s.id !== socket.id);
        }
        socket.leave(`ludo-${roomCode}`);

        if (room.players.length === 0 && (!room.spectators || room.spectators.length === 0)) {
            deleteRoom(roomCode);
            notifyGameActivity(io, roomCode);
            return;
        }

        if (room.status === "playing" && room.players.length < 2) {
            resetLudoGame(room);
        }

        io.to(`ludo-${roomCode}`).emit("ludo-room", getPublicLudoRoom(room));
        notifyGameActivity(io, roomCode);
    });

    // DISCONNECT
    socket.on("disconnect", () => {
        Object.values(rooms).forEach(room => {
            const wasPlayer = room.players.some(p => p.id === socket.id);
            const wasSpectator = room.spectators && room.spectators.some(s => s.id === socket.id);
            if (!wasPlayer && !wasSpectator) return;

            room.players = room.players.filter(p => p.id !== socket.id);
            if (room.spectators) {
                room.spectators = room.spectators.filter(s => s.id !== socket.id);
            }

            if (room.players.length === 0 && (!room.spectators || room.spectators.length === 0)) {
                deleteRoom(room.roomCode);
                notifyGameActivity(io, room.roomCode);
                return;
            }

            if (room.status === "playing" && room.players.length < 2) {
                resetLudoGame(room);
            }

            io.to(`ludo-${room.roomCode}`).emit("ludo-room", getPublicLudoRoom(room));
            notifyGameActivity(io, room.roomCode);
        });
    });
}

module.exports = registerLudoEvents;
