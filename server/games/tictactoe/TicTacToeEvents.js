const {
    createRoom,
    getRoom,
    deleteRoom,
    checkWinner,
    getPublicRoom,
    resetTTTRoom
} = require("./TicTacToeManager");
const { notifyGameActivity } = require("../GameStatusTracker");

function registerTicTacToeEvents(io, socket) {

    // =====================================================
    // JOIN TIC TAC TOE
    // =====================================================

    socket.on("ttt-join", ({ roomCode, username }) => {

        let room = getRoom(roomCode);

        if (!room) {
            room = createRoom(roomCode);
        }

        const alreadyPlayer = room.players.some(
            p => p.id === socket.id
        );

        if (!alreadyPlayer) {
            if (room.players.length >= 2 || room.status === "playing") {
                // Enter Spectate / Waiting Mode
                if (!room.spectators) room.spectators = [];
                if (!room.spectators.find(s => s.id === socket.id)) {
                    room.spectators.push({
                        id: socket.id,
                        username: username || "Spectator"
                    });
                }
                socket.join(`ttt-${roomCode}`);
                io.to(`ttt-${roomCode}`).emit("ttt-room", getPublicRoom(room));
                notifyGameActivity(io, roomCode);
                return;
            }
            const symbol = room.players.length === 0 ? "X" : "O";
            room.players.push({
                id: socket.id,
                username,
                symbol
            });
        }

        socket.join(`ttt-${roomCode}`);

        const publicRoom = getPublicRoom(room);

        if (room.players.length === 2 && room.status === "waiting") {
            room.status = "playing";
            publicRoom.status = "playing";
        }

        io.to(`ttt-${roomCode}`).emit("ttt-room", publicRoom);
        notifyGameActivity(io, roomCode);

    });


    // =====================================================
    // MAKE MOVE
    // =====================================================

    socket.on("ttt-move", ({ roomCode, index }) => {

        const room = getRoom(roomCode);
        if (!room) return;
        if (room.status !== "playing") return;

        const player = room.players.find(p => p.id === socket.id);
        if (!player) return;
        if (player.symbol !== room.currentTurn) return;
        if (room.board[index] !== null) return;

        room.board[index] = player.symbol;

        const result = checkWinner(room.board);

        if (result) {
            room.status = "finished";
            room.winner = result.winner;
            room.winLine = result.line;

            if (result.winner !== "draw") {
                room.scores[result.winner]++;
            }

            if (room.autoResetTimer) clearTimeout(room.autoResetTimer);
            room.autoResetTimer = setTimeout(() => {
                if (room.status === "finished") {
                    resetTTTRoom(room);
                    io.to(`ttt-${roomCode}`).emit("ttt-room", getPublicRoom(room));
                }
            }, 6000);
        } else {
            room.currentTurn = room.currentTurn === "X" ? "O" : "X";
        }

        io.to(`ttt-${roomCode}`).emit("ttt-room", getPublicRoom(room));

    });


    // =====================================================
    // RESTART / PLAY AGAIN
    // =====================================================

    socket.on("ttt-play-again", ({ roomCode }) => {
        handleTttRestart(roomCode);
    });

    socket.on("ttt-restart", ({ roomCode }) => {
        handleTttRestart(roomCode);
    });

    socket.on("ttt-reset", ({ roomCode }) => {
        handleTttRestart(roomCode);
    });

    function handleTttRestart(roomCode) {

        const room = getRoom(roomCode);
        if (!room) return;
        if (room.autoResetTimer) clearTimeout(room.autoResetTimer);

        resetTTTRoom(room);
        io.to(`ttt-${roomCode}`).emit("ttt-room", getPublicRoom(room));

    }


    // =====================================================
    // LEAVE
    // =====================================================

    socket.on("ttt-leave", ({ roomCode }) => {

        const room = getRoom(roomCode);
        if (!room) return;

        room.players = room.players.filter(p => p.id !== socket.id);
        if (room.spectators) {
            room.spectators = room.spectators.filter(s => s.id !== socket.id);
        }

        socket.leave(`ttt-${roomCode}`);

        if (room.players.length === 0 && (!room.spectators || room.spectators.length === 0)) {
            deleteRoom(roomCode);
            notifyGameActivity(io, roomCode);
            return;
        }

        resetTTTRoom(room);
        io.to(`ttt-${roomCode}`).emit("ttt-room", getPublicRoom(room));
        notifyGameActivity(io, roomCode);

    });


    // =====================================================
    // DISCONNECT
    // =====================================================

    socket.on("disconnect", () => {

        Object.values(getAllRooms()).forEach(room => {

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

            resetTTTRoom(room);
            io.to(`ttt-${room.roomCode}`).emit("ttt-room", getPublicRoom(room));
            notifyGameActivity(io, room.roomCode);

        });

    });

}

function getAllRooms() {
    const { rooms } = require("./TicTacToeManager");
    return rooms;
}

module.exports = registerTicTacToeEvents;
