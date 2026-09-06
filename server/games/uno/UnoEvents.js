const {
    createRoom,
    getRoom,
    deleteRoom,
    startUnoGame,
    playCard,
    playerDrawCard,
    playerCallUno,
    getPublicUnoRoom,
    resetUnoGame,
    rooms
} = require("./UnoManager");
const { notifyGameActivity } = require("../GameStatusTracker");

function broadcastUnoRoom(io, room) {
    if (!room) return;
    room.players.forEach(p => {
        io.to(p.id).emit("uno-room", getPublicUnoRoom(room, p.id));
    });
    if (room.spectators) {
        room.spectators.forEach(s => {
            io.to(s.id).emit("uno-room", {
                ...getPublicUnoRoom(room, null),
                isSpectator: true,
                isWaiting: true
            });
        });
    }
}

function registerUnoEvents(io, socket) {
    // JOIN UNO
    socket.on("uno-join", ({ roomCode, username }) => {
        let room = getRoom(roomCode);
        if (!room) {
            room = createRoom(roomCode);
        }

        const existingPlayer = room.players.find(p => p.id === socket.id);
        if (!existingPlayer) {
            if (room.players.length >= 15 || room.status === "playing") {
                // Enter Spectate / Waiting Mode
                if (!room.spectators) room.spectators = [];
                if (!room.spectators.find(s => s.id === socket.id)) {
                    room.spectators.push({
                        id: socket.id,
                        username: username || "Spectator"
                    });
                }
                socket.join(`uno-${roomCode}`);
                broadcastUnoRoom(io, room);
                notifyGameActivity(io, roomCode);
                return;
            }
            room.players.push({
                id: socket.id,
                username,
                hand: [],
                hasCalledUno: false
            });
        }

        socket.join(`uno-${roomCode}`);
        broadcastUnoRoom(io, room);
        notifyGameActivity(io, roomCode);
    });

    // START GAME
    socket.on("uno-start", ({ roomCode }) => {
        const room = getRoom(roomCode);
        if (!room) return;
        // Only host (first player) can start
        if (!room.players[0] || room.players[0].id !== socket.id) return;

        const started = startUnoGame(room);
        if (started) {
            broadcastUnoRoom(io, room);
        }
    });

    // PLAY CARD
    socket.on("uno-play", ({ roomCode, cardId, chosenColor, targetPlayerId }) => {
        const room = getRoom(roomCode);
        if (!room) return;

        const result = playCard(room, socket.id, cardId, chosenColor, targetPlayerId);
        if (result.success) {
            broadcastUnoRoom(io, room);
            if (room.status === "finished") {
                if (room.autoResetTimer) clearTimeout(room.autoResetTimer);
                room.autoResetTimer = setTimeout(() => {
                    if (room.status === "finished") {
                        resetUnoGame(room);
                        broadcastUnoRoom(io, room);
                    }
                }, 7000);
            }
        } else {
            socket.emit("uno-error", { message: result.message });
        }
    });

    // DRAW CARD
    socket.on("uno-draw", ({ roomCode }) => {
        const room = getRoom(roomCode);
        if (!room) return;

        const result = playerDrawCard(room, socket.id);
        if (result.success) {
            broadcastUnoRoom(io, room);
        }
    });

    // CALL UNO
    socket.on("uno-call-uno", ({ roomCode }) => {
        const room = getRoom(roomCode);
        if (!room) return;

        const called = playerCallUno(room, socket.id);
        if (called) {
            broadcastUnoRoom(io, room);
        }
    });

    // RESTART / PLAY AGAIN UNO
    socket.on("uno-play-again", ({ roomCode }) => {
        const room = getRoom(roomCode);
        if (!room) return;
        resetUnoGame(room);
        broadcastUnoRoom(io, room);
    });

    socket.on("uno-restart", ({ roomCode }) => {
        const room = getRoom(roomCode);
        if (!room) return;
        resetUnoGame(room);
        broadcastUnoRoom(io, room);
    });

    // RESET UNO (Play Again / Return to Lobby)
    socket.on("uno-reset", ({ roomCode }) => {
        const room = getRoom(roomCode);
        if (!room) return;
        resetUnoGame(room);
        broadcastUnoRoom(io, room);
    });

    // LEAVE UNO
    socket.on("uno-leave", ({ roomCode }) => {
        const room = getRoom(roomCode);
        if (!room) return;

        room.players = room.players.filter(p => p.id !== socket.id);
        if (room.spectators) {
            room.spectators = room.spectators.filter(s => s.id !== socket.id);
        }
        socket.leave(`uno-${roomCode}`);

        if (room.players.length === 0 && (!room.spectators || room.spectators.length === 0)) {
            deleteRoom(roomCode);
            notifyGameActivity(io, roomCode);
            return;
        }

        if (room.status === "playing" && room.players.length < 2) {
            resetUnoGame(room);
        }

        broadcastUnoRoom(io, room);
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
                resetUnoGame(room);
            }

            broadcastUnoRoom(io, room);
            notifyGameActivity(io, room.roomCode);
        });
    });
}

module.exports = registerUnoEvents;
