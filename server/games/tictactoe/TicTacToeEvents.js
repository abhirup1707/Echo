const {
    createRoom,
    getRoom,
    deleteRoom,
    checkWinner,
    getPublicRoom
} = require("./TicTacToeManager");

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
            if (room.players.length >= 2) {
                socket.emit("ttt-full");
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

    function handleTttRestart(roomCode) {

        const room = getRoom(roomCode);
        if (!room) return;

        const player = room.players.find(p => p.id === socket.id);
        if (!player) return;

        if (room.winner && room.winner !== "draw" && room.players.length === 2) {
            const winnerPlayer = room.players.find(p => p.symbol === room.winner);
            const loserPlayer = room.players.find(p => p.symbol !== room.winner);
            if (winnerPlayer && loserPlayer) {
                winnerPlayer.symbol = "X";
                loserPlayer.symbol = "O";
            }
        }

        room.board = Array(9).fill(null);
        room.currentTurn = "X";
        room.status = "playing";
        room.winner = null;
        room.winLine = null;

        io.to(`ttt-${roomCode}`).emit("ttt-room", getPublicRoom(room));

    }


    // =====================================================
    // LEAVE
    // =====================================================

    socket.on("ttt-leave", ({ roomCode }) => {

        const room = getRoom(roomCode);
        if (!room) return;

        room.players = room.players.filter(p => p.id !== socket.id);

        socket.leave(`ttt-${roomCode}`);

        if (room.players.length === 0) {
            deleteRoom(roomCode);
            return;
        }

        room.board = Array(9).fill(null);
        room.currentTurn = "X";
        room.status = "waiting";
        room.winner = null;
        room.winLine = null;

        io.to(`ttt-${roomCode}`).emit("ttt-room", getPublicRoom(room));

    });


    // =====================================================
    // DISCONNECT
    // =====================================================

    socket.on("disconnect", () => {

        Object.values(getAllRooms()).forEach(room => {

            const wasPlayer = room.players.some(p => p.id === socket.id);
            if (!wasPlayer) return;

            room.players = room.players.filter(p => p.id !== socket.id);

            if (room.players.length === 0) {
                deleteRoom(room.roomCode);
                return;
            }

            room.board = Array(9).fill(null);
            room.currentTurn = "X";
            room.status = "waiting";
            room.winner = null;
            room.winLine = null;

            io.to(`ttt-${room.roomCode}`).emit("ttt-room", getPublicRoom(room));

        });

    });

}

function getAllRooms() {
    const { rooms } = require("./TicTacToeManager");
    return rooms;
}

module.exports = registerTicTacToeEvents;
