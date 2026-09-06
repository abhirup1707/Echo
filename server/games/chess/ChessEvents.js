const {
    createRoom,
    getRoom,
    deleteRoom,
    getLegalMoves,
    makeChessMove,
    getPublicChessRoom,
    resetChessGame,
    rooms
} = require("./ChessManager");
const { notifyGameActivity } = require("../GameStatusTracker");

function scheduleChessAutoReset(io, room) {
    if (!room) return;
    if (room.autoResetTimer) clearTimeout(room.autoResetTimer);
    room.autoResetTimer = setTimeout(() => {
        if (room.status === "checkmate" || room.status === "stalemate" || room.status === "resigned") {
            resetChessGame(room);
            io.to(`chess-${room.roomCode}`).emit("chess-room", getPublicChessRoom(room));
        }
    }, 7000);
}

function registerChessEvents(io, socket) {
    // JOIN CHESS
    socket.on("chess-join", ({ roomCode, username }) => {
        let room = getRoom(roomCode);
        if (!room) {
            room = createRoom(roomCode);
        }

        const existingPlayer = room.players.find(p => p.id === socket.id);
        const existingSpectator = room.spectators?.find(s => s.id === socket.id);

        if (!existingPlayer) {
            if (room.players.length >= 2 || room.status === "playing") {
                // Enter Spectate / Waiting Mode
                if (!room.spectators) room.spectators = [];
                if (!existingSpectator) {
                    room.spectators.push({
                        id: socket.id,
                        username: username || "Spectator"
                    });
                }
                socket.join(`chess-${roomCode}`);
                io.to(`chess-${roomCode}`).emit("chess-room", getPublicChessRoom(room));
                notifyGameActivity(io, roomCode);
                return;
            }
            const color = room.players.length === 0 ? "w" : "b";
            room.players.push({
                id: socket.id,
                username,
                color
            });
        }

        socket.join(`chess-${roomCode}`);

        if (room.players.length === 2 && room.status === "waiting") {
            room.status = "playing";
        }

        io.to(`chess-${roomCode}`).emit("chess-room", getPublicChessRoom(room));
        notifyGameActivity(io, roomCode);
    });

    // GET LEGAL MOVES FOR PIECE
    socket.on("chess-get-moves", ({ roomCode, from }) => {
        const room = getRoom(roomCode);
        if (!room) return;
        const player = room.players.find(p => p.id === socket.id);
        if (!player || player.color !== room.turn) {
            socket.emit("chess-legal-moves", { from, moves: [] });
            return;
        }

        const moves = getLegalMoves(room, from);
        socket.emit("chess-legal-moves", { from, moves });
    });

    // MAKE MOVE
    socket.on("chess-move", ({ roomCode, from, to, promotion }) => {
        const room = getRoom(roomCode);
        if (!room) return;

        const result = makeChessMove(room, socket.id, from, to, promotion);
        if (result.success) {
            io.to(`chess-${roomCode}`).emit("chess-room", getPublicChessRoom(room));
            if (room.status === "checkmate" || room.status === "stalemate") {
                scheduleChessAutoReset(io, room);
            }
        } else {
            socket.emit("chess-error", { message: result.message });
        }
    });

    // RESIGN
    socket.on("chess-resign", ({ roomCode }) => {
        const room = getRoom(roomCode);
        if (!room || room.status !== "playing") return;

        const player = room.players.find(p => p.id === socket.id);
        if (!player) return;

        room.status = "resigned";
        room.winner = player.color === "w" ? "b" : "w";
        io.to(`chess-${roomCode}`).emit("chess-room", getPublicChessRoom(room));
        scheduleChessAutoReset(io, room);
    });

    // START CHESS
    socket.on("chess-start", ({ roomCode }) => {
        const room = getRoom(roomCode);
        if (!room) return;
        if (room.players.length >= 2) {
            room.status = "playing";
            io.to(`chess-${roomCode}`).emit("chess-room", getPublicChessRoom(room));
        }
    });

    // RESTART / PLAY AGAIN
    socket.on("chess-play-again", ({ roomCode }) => {
        const room = getRoom(roomCode);
        if (!room) return;
        resetChessGame(room);
        io.to(`chess-${roomCode}`).emit("chess-room", getPublicChessRoom(room));
    });

    socket.on("chess-restart", ({ roomCode }) => {
        const room = getRoom(roomCode);
        if (!room) return;
        resetChessGame(room);
        io.to(`chess-${roomCode}`).emit("chess-room", getPublicChessRoom(room));
    });

    socket.on("chess-reset", ({ roomCode }) => {
        const room = getRoom(roomCode);
        if (!room) return;
        resetChessGame(room);
        io.to(`chess-${roomCode}`).emit("chess-room", getPublicChessRoom(room));
    });

    // LEAVE CHESS
    socket.on("chess-leave", ({ roomCode }) => {
        const room = getRoom(roomCode);
        if (!room) return;

        room.players = room.players.filter(p => p.id !== socket.id);
        if (room.spectators) {
            room.spectators = room.spectators.filter(s => s.id !== socket.id);
        }
        socket.leave(`chess-${roomCode}`);

        if (room.players.length === 0 && (!room.spectators || room.spectators.length === 0)) {
            if (room.autoResetTimer) clearTimeout(room.autoResetTimer);
            deleteRoom(roomCode);
            notifyGameActivity(io, roomCode);
            return;
        }

        if (room.players.length < 2) {
            resetChessGame(room);
        }

        io.to(`chess-${roomCode}`).emit("chess-room", getPublicChessRoom(room));
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
                if (room.autoResetTimer) clearTimeout(room.autoResetTimer);
                deleteRoom(room.roomCode);
                notifyGameActivity(io, room.roomCode);
                return;
            }

            if (room.players.length < 2) {
                resetChessGame(room);
            }

            io.to(`chess-${room.roomCode}`).emit("chess-room", getPublicChessRoom(room));
            notifyGameActivity(io, room.roomCode);
        });
    });
}

module.exports = registerChessEvents;
