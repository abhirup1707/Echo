const {
    PLAYER_COLORS,
    rooms,
    createRoom,
    getRoom,
    deleteRoom,
    rollDice,
    getEffect,
    getPublicRoom
} = require("./SLManager");

let rollIdCounter = 0;

function registerSnakeLadderEvents(io, socket) {

    socket.on("sl-join", ({ roomCode, username }) => {

        let room = getRoom(roomCode);
        if (!room) room = createRoom(roomCode);

        const alreadyPlayer = room.players.some(p => p.id === socket.id);
        if (!alreadyPlayer) {
            if (room.players.length >= 6) {
                socket.emit("sl-full");
                return;
            }
            room.players.push({
                id: socket.id,
                username,
                position: 0,
                color: PLAYER_COLORS[room.players.length]
            });
        }

        socket.join(`sl-${roomCode}`);
        io.to(`sl-${roomCode}`).emit("sl-room", getPublicRoom(room));

    });


    socket.on("sl-start", ({ roomCode }) => {

        const room = getRoom(roomCode);
        if (!room) return;
        if (room.players.length < 2) return;

        room.mapIndex = 0;
        room.status = "playing";
        room.currentTurn = 0;
        room.dice = null;
        room.lastMove = null;
        room.winner = null;
        room.players.forEach(p => { p.position = 0; });

        io.to(`sl-${roomCode}`).emit("sl-room", getPublicRoom(room));

    });


    socket.on("sl-roll", ({ roomCode }) => {

        const room = getRoom(roomCode);
        if (!room) return;
        if (room.status !== "playing") return;

        const player = room.players[room.currentTurn];
        if (!player || player.id !== socket.id) return;

        const diceValue = rollDice();
        let newPos = player.position + diceValue;

        if (newPos > 100) {
            newPos = player.position;
            room.dice = { value: diceValue, id: ++rollIdCounter, overshoot: true };
            room.lastMove = {
                playerId: player.id,
                from: player.position,
                to: player.position,
                final: player.position,
                effect: null
            };
            room.currentTurn = (room.currentTurn + 1) % room.players.length;
            io.to(`sl-${roomCode}`).emit("sl-room", getPublicRoom(room));
            return;
        }

        if (newPos === 100) {
            player.position = 100;
            room.status = "finished";
            room.winner = { id: player.id, username: player.username };
            room.dice = { value: diceValue, id: ++rollIdCounter };
            room.lastMove = {
                playerId: player.id,
                from: newPos - diceValue,
                to: 100,
                final: 100,
                effect: null
            };
            room.gameCount++;
            io.to(`sl-${roomCode}`).emit("sl-room", getPublicRoom(room));
            return;
        }

        const effect = getEffect(room, newPos);
        const finalPos = effect ? effect.to : newPos;

        player.position = finalPos;

        if (finalPos === 100) {
            room.status = "finished";
            room.winner = { id: player.id, username: player.username };
            room.dice = { value: diceValue, id: ++rollIdCounter };
            room.lastMove = {
                playerId: player.id,
                from: newPos - diceValue,
                to: newPos,
                final: 100,
                effect
            };
            room.gameCount++;
            io.to(`sl-${roomCode}`).emit("sl-room", getPublicRoom(room));
            return;
        }

        room.dice = { value: diceValue, id: ++rollIdCounter };
        room.lastMove = {
            playerId: player.id,
            from: newPos - diceValue,
            to: newPos,
            final: finalPos,
            effect
        };

        room.currentTurn = (room.currentTurn + 1) % room.players.length;

        io.to(`sl-${roomCode}`).emit("sl-room", getPublicRoom(room));

    });


    socket.on("sl-play-again", ({ roomCode }) => {

        const room = getRoom(roomCode);
        if (!room) return;
        if (room.status !== "finished") return;

        room.mapIndex = 0;
        room.status = "playing";
        room.currentTurn = 0;
        room.dice = null;
        room.lastMove = null;
        room.winner = null;
        room.players.forEach(p => { p.position = 0; });

        io.to(`sl-${roomCode}`).emit("sl-room", getPublicRoom(room));

    });


    socket.on("sl-leave", ({ roomCode }) => {

        const room = getRoom(roomCode);
        if (!room) return;

        room.players = room.players.filter(p => p.id !== socket.id);

        socket.leave(`sl-${roomCode}`);

        if (room.players.length === 0) {
            deleteRoom(roomCode);
            return;
        }

        if (room.currentTurn >= room.players.length) {
            room.currentTurn = 0;
        }

        io.to(`sl-${roomCode}`).emit("sl-room", getPublicRoom(room));

    });


    socket.on("disconnect", () => {

        Object.values(rooms).forEach(room => {

            const wasPlayer = room.players.some(p => p.id === socket.id);
            if (!wasPlayer) return;

            room.players = room.players.filter(p => p.id !== socket.id);

            if (room.players.length === 0) {
                deleteRoom(room.roomCode);
                return;
            }

            if (room.currentTurn >= room.players.length) {
                room.currentTurn = 0;
            }

            io.to(`sl-${room.roomCode}`).emit("sl-room", getPublicRoom(room));

        });

    });

}

module.exports = registerSnakeLadderEvents;
