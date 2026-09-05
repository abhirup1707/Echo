const {
    createRoom,
    getRoom,
    deleteRoom,
    getLegalMoves,
    makeChessMove,
    getPublicChessRoom,
    rooms
} = require("./ChessManager");

function registerChessEvents(io, socket) {
    // JOIN CHESS
    socket.on("chess-join", ({ roomCode, username }) => {
        let room = getRoom(roomCode);
        if (!room) {
            room = createRoom(roomCode);
        }

        const existingPlayer = room.players.find(p => p.id === socket.id);
        if (!existingPlayer) {
            if (room.players.length >= 2) {
                // Spectator
                socket.join(`chess-${roomCode}`);
                socket.emit("chess-room", getPublicChessRoom(room));
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
    });

    // RESTART
    socket.on("chess-restart", ({ roomCode }) => {
        const room = getRoom(roomCode);
        if (!room) return;

        const { createRoom: resetRoom } = require("./ChessManager");
        const players = room.players;
        // Swap colors for rematch
        if (players.length === 2) {
            players[0].color = players[0].color === "w" ? "b" : "w";
            players[1].color = players[1].color === "w" ? "b" : "w";
        }

        const newRoom = resetRoom(roomCode);
        newRoom.players = players;
        newRoom.status = "playing";

        io.to(`chess-${roomCode}`).emit("chess-room", getPublicChessRoom(newRoom));
    });

    // LEAVE CHESS
    socket.on("chess-leave", ({ roomCode }) => {
        const room = getRoom(roomCode);
        if (!room) return;

        room.players = room.players.filter(p => p.id !== socket.id);
        socket.leave(`chess-${roomCode}`);

        if (room.players.length === 0) {
            deleteRoom(roomCode);
            return;
        }

        if (room.status === "playing") {
            room.status = "waiting";
        }

        io.to(`chess-${roomCode}`).emit("chess-room", getPublicChessRoom(room));
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

            if (room.status === "playing") {
                room.status = "waiting";
            }

            io.to(`chess-${room.roomCode}`).emit("chess-room", getPublicChessRoom(room));
        });
    });
}

module.exports = registerChessEvents;
