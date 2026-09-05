const {
    createRoom,
    getRoom,
    deleteRoom,
    startUnoGame,
    playCard,
    playerDrawCard,
    playerCallUno,
    getPublicUnoRoom,
    rooms
} = require("./UnoManager");

function broadcastUnoRoom(io, room) {
    if (!room) return;
    room.players.forEach(p => {
        io.to(p.id).emit("uno-room", getPublicUnoRoom(room, p.id));
    });
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
            if (room.players.length >= 15) {
                socket.emit("uno-full");
                return;
            }
            if (room.status === "playing") {
                socket.emit("uno-in-progress");
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

    // RESTART UNO
    socket.on("uno-restart", ({ roomCode }) => {
        const room = getRoom(roomCode);
        if (!room) return;

        const isHost = room.players[0] && room.players[0].id === socket.id;
        if (!isHost) return;

        startUnoGame(room);
        broadcastUnoRoom(io, room);
    });

    // LEAVE UNO
    socket.on("uno-leave", ({ roomCode }) => {
        const room = getRoom(roomCode);
        if (!room) return;

        room.players = room.players.filter(p => p.id !== socket.id);
        socket.leave(`uno-${roomCode}`);

        if (room.players.length === 0) {
            deleteRoom(roomCode);
            return;
        }

        if (room.status === "playing" && room.players.length < 2) {
            room.status = "waiting";
            room.lastAction = "Not enough players to continue game.";
        }

        broadcastUnoRoom(io, room);
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
                room.lastAction = "Player left, awaiting more players.";
            }

            broadcastUnoRoom(io, room);
        });
    });
}

module.exports = registerUnoEvents;
