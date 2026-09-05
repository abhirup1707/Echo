const {
    createRoom,
    getRoom,
    deleteRoom,
    startLudoGame,
    rollDice,
    moveToken,
    advanceTurn,
    getPublicLudoRoom,
    rooms
} = require("./LudoManager");

function registerLudoEvents(io, socket) {
    // JOIN LUDO
    socket.on("ludo-join", ({ roomCode, username }) => {
        let room = getRoom(roomCode);
        if (!room) {
            room = createRoom(roomCode);
        }

        const existing = room.players.find(p => p.id === socket.id);
        if (!existing) {
            if (room.players.length >= 4) {
                socket.emit("ludo-full");
                return;
            }
            if (room.status === "playing") {
                socket.emit("ludo-in-progress");
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
        } else {
            socket.emit("ludo-error", { message: result.message });
        }
    });

    // PLAY AGAIN / RESTART LUDO
    socket.on("ludo-play-again", ({ roomCode }) => {
        const room = getRoom(roomCode);
        if (!room) return;

        room.status = "waiting";
        room.winner = null;
        room.diceValue = null;
        room.diceRolled = false;
        room.lastAction = `${room.players.find(p => p.id === socket.id)?.username || "Player"} requested rematch! Waiting for host to start.`;
        room.players.forEach(p => {
            p.tokens = [];
        });

        io.to(`ludo-${roomCode}`).emit("ludo-room", getPublicLudoRoom(room));
    });

    socket.on("ludo-restart", ({ roomCode }) => {
        const room = getRoom(roomCode);
        if (!room) return;

        room.status = "waiting";
        room.winner = null;
        room.diceValue = null;
        room.diceRolled = false;
        room.players.forEach(p => {
            p.tokens = [];
        });

        io.to(`ludo-${roomCode}`).emit("ludo-room", getPublicLudoRoom(room));
    });

    // LEAVE LUDO
    socket.on("ludo-leave", ({ roomCode }) => {
        const room = getRoom(roomCode);
        if (!room) return;

        room.players = room.players.filter(p => p.id !== socket.id);
        socket.leave(`ludo-${roomCode}`);

        if (room.players.length === 0) {
            deleteRoom(roomCode);
            return;
        }

        if (room.status === "playing" && room.players.length < 2) {
            room.status = "waiting";
            room.lastAction = "Player left. Waiting for players...";
        }

        io.to(`ludo-${roomCode}`).emit("ludo-room", getPublicLudoRoom(room));
    });

    // DISCONNECT
    socket.on("disconnect", () => {
        Object.values(rooms).forEach(room => {
            const wasPlayer = room.players.some(p => p.id === socket.id);
            if (!wasPlayer) return;

            room.players = room.players.filter(p => p.id !== socket.id);
            if (room.players.length === 0) {
                deleteRoom(room.roomCode);
                return;
            }

            if (room.status === "playing" && room.players.length < 2) {
                room.status = "waiting";
                room.lastAction = "Player disconnected.";
            }

            io.to(`ludo-${room.roomCode}`).emit("ludo-room", getPublicLudoRoom(room));
        });
    });
}

module.exports = registerLudoEvents;
