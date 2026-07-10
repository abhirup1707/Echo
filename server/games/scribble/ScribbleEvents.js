const {
    createScribbleRoom,
    getScribbleRoom
} = require("./ScribbleManager");

const words = require("./Words");


function getPublicRoom(room, socketId = null) {

    return {

        roomCode: room.roomCode,

        host: room.host,

        started: room.started,

        phase: room.phase,

        players: room.players,

        drawer: room.drawer,

        currentWord:
            socketId === room.drawer
                ? room.currentWord
                : null,

        wordOptions:
            socketId === room.drawer
                ? room.wordOptions
                : [],

        round: room.round,

        turnIndex: room.turnIndex,

        maxRounds: room.maxRounds,

        drawTime: room.drawTime,

        wordChoices: room.wordChoices,

        timeLeft: room.timeLeft,

        correctGuessers: room.correctGuessers,

        canvas: room.canvas,

        chat: room.chat,

        scores: room.scores

    };

}


function emitRoomState(io, room) {

    room.players.forEach(player => {

        io.to(player.id).emit(
            "scribble-room",
            getPublicRoom(room, player.id)
        );

    });

}


function addSystemMessage(room, text) {

    const message = {

        id: `${Date.now()}-${Math.random()}`,

        author: "System",

        text,

        type: "system"

    };

    room.chat.push(message);

    return message;

}


function getRandomWords(count) {

    const shuffled = [...words]
        .sort(() => Math.random() - 0.5);

    return shuffled.slice(0, count);

}


function calculatePoints(timeLeft, drawTime) {

    return Math.round(
        40 + (timeLeft / drawTime) * 60
    );

}


function registerScribbleEvents(io, socket) {

    console.log(
        "🎨 Scribble events registered for:",
        socket.id
    );


    // =========================================================
    // JOIN SCRIBBLE
    // =========================================================

    socket.on(
        "scribble-join",
        ({ roomCode, username }) => {

            if (!roomCode || !username) return;

            let room = getScribbleRoom(roomCode);

            if (!room) {

                room = createScribbleRoom(
                    roomCode,
                    socket.id
                );

            }

            let player = room.players.find(
                p => p.username === username
            );

            if (player) {

                const oldId = player.id;

                player.id = socket.id;

                if (room.host === oldId) {

                    room.host = socket.id;

                }

                if (room.drawer === oldId) {

                    room.drawer = socket.id;

                }

                if (
                    oldId !== socket.id &&
                    room.scores[oldId] !== undefined
                ) {

                    room.scores[socket.id] =
                        room.scores[oldId];

                    delete room.scores[oldId];

                }

                room.correctGuessers =
                    room.correctGuessers.map(id =>
                        id === oldId
                            ? socket.id
                            : id
                    );

            } else {

                player = {

                    id: socket.id,

                    username

                };

                room.players.push(player);

                room.scores[socket.id] = 0;

            }

            socket.join(
                `${roomCode}-scribble`
            );

            emitRoomState(io, room);

            console.log(
                `🎨 ${username} joined Scribble ${roomCode}`
            );

        }
    );


    // =========================================================
    // UPDATE SETTINGS
    // =========================================================

    socket.on(
        "scribble-update-settings",
        ({ roomCode, settings }) => {

            const room = getScribbleRoom(roomCode);

            if (!room) return;

            if (room.host !== socket.id) return;

            if (room.started) return;

            room.maxRounds =
                Number(settings.maxRounds) || 5;

            room.drawTime =
                Number(settings.drawTime) || 150;

            room.wordChoices =
                Number(settings.wordChoices) || 5;

            room.timeLeft = room.drawTime;

            emitRoomState(io, room);

        }
    );


    // =========================================================
    // START GAME
    // =========================================================

    socket.on(
        "scribble-start",
        ({ roomCode }) => {

            const room = getScribbleRoom(roomCode);

            if (!room) return;

            if (room.host !== socket.id) return;

            if (room.players.length < 2) {

                socket.emit(
                    "scribble-error",
                    "At least 2 players are required."
                );

                return;

            }

            room.started = true;

            room.phase = "choosing";

            room.round = 1;

            room.turnIndex = 0;

            room.drawer =
                room.players[0].id;

            room.currentWord = null;

            room.wordOptions =
                getRandomWords(room.wordChoices);

            room.correctGuessers = [];

            room.canvas = [];

            room.chat = [];

            Object.keys(room.scores).forEach(id => {

                room.scores[id] = 0;

            });

            addSystemMessage(
                room,
                `Round 1 of ${room.maxRounds} — ${room.players[0].username} is choosing a word!`
            );

            emitRoomState(io, room);

            console.log(
                "🎮 Scribble started:",
                roomCode
            );

            console.log(
                "✏ Drawer:",
                room.players[0].username
            );

            console.log(
                "📝 Word options:",
                room.wordOptions
            );

        }
    );


    // =========================================================
    // SELECT WORD
    // =========================================================

    socket.on(
        "scribble-select-word",
        ({ roomCode, word }) => {

            const room = getScribbleRoom(roomCode);

            if (!room) return;

            if (room.phase !== "choosing") return;

            if (room.drawer !== socket.id) return;

            if (!room.wordOptions.includes(word)) return;

            room.currentWord = word;

            room.wordOptions = [];

            room.phase = "drawing";

            room.timeLeft = room.drawTime;

            room.correctGuessers = [];

            room.canvas = [];

            addSystemMessage(
                room,
                `${getDrawerName(room)} is drawing!`
            );

            emitRoomState(io, room);

            io.to(
                `${roomCode}-scribble`
            ).emit(
                "scribble-clear-canvas"
            );

        }
    );


    // =========================================================
    // DRAW STROKE
    // =========================================================

    socket.on(
        "scribble-draw",
        ({ roomCode, stroke }) => {

            const room = getScribbleRoom(roomCode);

            if (!room) return;

            if (room.phase !== "drawing") return;

            if (room.drawer !== socket.id) return;

            if (!stroke) return;

            const action = {

                type: "stroke",

                ...stroke

            };

            room.canvas.push(action);

            /*
                Prevent unlimited server memory growth.
            */

            if (room.canvas.length > 20000) {

                room.canvas.shift();

            }

            socket.to(
                `${roomCode}-scribble`
            ).emit(
                "scribble-draw",
                action
            );

        }
    );


    // =========================================================
    // FILL TOOL
    // =========================================================

    socket.on(
        "scribble-fill",
        ({ roomCode, fill }) => {

            const room = getScribbleRoom(roomCode);

            if (!room) return;

            if (room.phase !== "drawing") return;

            if (room.drawer !== socket.id) return;

            if (!fill) return;

            const action = {

                type: "fill",

                ...fill

            };

            room.canvas.push(action);

            /*
                Send to everyone, including drawer.

                This means the drawer doesn't need to apply
                the fill locally before emitting.
            */

            io.to(
                `${roomCode}-scribble`
            ).emit(
                "scribble-fill",
                action
            );

        }
    );


    // =========================================================
    // UNDO LAST ACTION
    // =========================================================

    socket.on(
        "scribble-undo",
        ({ roomCode }) => {

            const room = getScribbleRoom(roomCode);

            if (!room) return;

            if (room.phase !== "drawing") return;

            if (room.drawer !== socket.id) return;

            if (room.canvas.length === 0) return;

            /*
                Remove the latest canvas action.

                NOTE:
                Right now each scribble-draw event is one
                history action, so a single Undo may remove
                only one small line segment.
            */

            room.canvas.pop();

            /*
                Send the entire remaining canvas history
                to everyone, including the drawer.
            */

            io.to(
                `${roomCode}-scribble`
            ).emit(
                "scribble-canvas-state",
                room.canvas
            );

        }
    );


    // =========================================================
    // CLEAR CANVAS
    // =========================================================

    socket.on(
        "scribble-clear-canvas",
        ({ roomCode }) => {

            const room = getScribbleRoom(roomCode);

            if (!room) return;

            if (room.phase !== "drawing") return;

            if (room.drawer !== socket.id) return;

            room.canvas = [];

            io.to(
                `${roomCode}-scribble`
            ).emit(
                "scribble-clear-canvas"
            );

        }
    );


    // =========================================================
    // SUBMIT GUESS
    // =========================================================

socket.on(
    "scribble-guess",
    ({ roomCode, guess }) => {

        const room = getScribbleRoom(roomCode);

        if (!room) return;

        if (room.phase !== "drawing") return;

        if (room.drawer === socket.id) return;


        const player = room.players.find(
            p => p.id === socket.id
        );

        if (!player) return;


        const cleanGuess =
            String(guess || "").trim();

        if (!cleanGuess) return;


        /*
            Check whether player has already
            guessed the correct answer.
        */

        const alreadyGuessed =
            room.correctGuessers.includes(
                socket.id
            );


        /*
            Don't allow additional guesses after
            this player has already guessed correctly.
        */

        if (alreadyGuessed) return;


        const isCorrect =
            cleanGuess.toLowerCase() ===
            room.currentWord.toLowerCase();


        // =================================================
        // CORRECT GUESS
        // =================================================

        if (isCorrect) {

            const points = calculatePoints(
                room.timeLeft,
                room.drawTime
            );


            room.correctGuessers.push(
                socket.id
            );


            room.scores[socket.id] =
                (
                    room.scores[socket.id] || 0
                ) + points;


            room.scores[room.drawer] =
                (
                    room.scores[room.drawer] || 0
                ) + 15;


            /*
                IMPORTANT:
                Don't reveal the actual correct word
                to other players in chat.
            */

            const message = {

                id:
                    `${Date.now()}-${Math.random()}`,

                author:
                    player.username,

                text:
                    "guessed the word!",

                type:
                    "correct"

            };


            /*
                Store permanently in room chat.
            */

            room.chat.push(message);


            /*
                Update everyone.
            */

            emitRoomState(io, room);


            /*
                If every non-drawer player has guessed,
                finish this turn early.
            */

            if (
                room.correctGuessers.length >=
                room.players.length - 1
            ) {

                endCurrentTurn(
                    io,
                    room
                );

            }


            return;

        }


        // =================================================
        // NORMAL / WRONG GUESS
        // =================================================

        const message = {

            id:
                `${Date.now()}-${Math.random()}`,

            author:
                player.username,

            text:
                cleanGuess,

            type:
                "guess"

        };


        /*
            THIS stores every message typed by players.
        */

        room.chat.push(message);


        /*
            Broadcast the updated complete room state.

            This guarantees every client receives the
            complete chat history, not only the latest
            message.
        */

        emitRoomState(io, room);

    }
);


    // =========================================================
    // TIMER TICK
    // =========================================================

    socket.on(
        "scribble-timer-tick",
        ({ roomCode }) => {

            const room = getScribbleRoom(roomCode);

            if (!room) return;

            if (room.drawer !== socket.id) return;

            if (room.phase !== "drawing") return;

            if (room.timeLeft <= 0) return;

            room.timeLeft -= 1;

            io.to(
                `${roomCode}-scribble`
            ).emit(
                "scribble-time",
                room.timeLeft
            );

            if (room.timeLeft <= 0) {

                endCurrentTurn(io, room);

            }

        }
    );


    // =========================================================
    // PLAY AGAIN
    // =========================================================

    socket.on(
        "scribble-play-again",
        ({ roomCode }) => {

            const room = getScribbleRoom(roomCode);

            if (!room) return;

            if (room.host !== socket.id) return;

            room.started = false;

            room.phase = "lobby";

            room.drawer = null;

            room.currentWord = null;

            room.wordOptions = [];

            room.round = 1;

            room.turnIndex = 0;

            room.timeLeft = room.drawTime;

            room.correctGuessers = [];

            room.canvas = [];

            room.chat = [];

            Object.keys(room.scores).forEach(id => {

                room.scores[id] = 0;

            });

            emitRoomState(io, room);

        }
    );


    // =========================================================
    // LEAVE SCRIBBLE
    // =========================================================

    socket.on(
        "scribble-leave",
        ({ roomCode }) => {

            const room = getScribbleRoom(roomCode);

            if (!room) return;

            removePlayerFromRoom(
                io,
                socket,
                room
            );

        }
    );

}


/* =========================================================
   HELPERS
========================================================= */


function getDrawerName(room) {

    const drawer = room.players.find(
        p => p.id === room.drawer
    );

    return drawer
        ? drawer.username
        : "Someone";

}


function endCurrentTurn(io, room) {

    if (room.phase !== "drawing") return;

    room.phase = "reveal";

    addSystemMessage(
        room,
        `The word was "${room.currentWord}"!`
    );

    emitRoomState(io, room);

    setTimeout(() => {

        const latestRoom =
            getScribbleRoom(room.roomCode);

        if (!latestRoom) return;

        if (latestRoom.phase !== "reveal") return;

        const totalTurns =
            latestRoom.players.length *
            latestRoom.maxRounds;

        if (
            latestRoom.turnIndex + 1 >= totalTurns
        ) {

            latestRoom.phase = "finished";

            latestRoom.started = false;

            emitRoomState(io, latestRoom);

            return;

        }

        latestRoom.turnIndex += 1;

        latestRoom.round =
            Math.floor(
                latestRoom.turnIndex /
                latestRoom.players.length
            ) + 1;

        const drawerIndex =
            latestRoom.turnIndex %
            latestRoom.players.length;

        latestRoom.drawer =
            latestRoom.players[drawerIndex].id;

        latestRoom.currentWord = null;

        latestRoom.wordOptions =
            getRandomWords(
                latestRoom.wordChoices
            );

        latestRoom.correctGuessers = [];

        latestRoom.canvas = [];

        latestRoom.timeLeft =
            latestRoom.drawTime;

        latestRoom.phase = "choosing";

        addSystemMessage(
            latestRoom,
            `Round ${latestRoom.round} of ${latestRoom.maxRounds} — ${latestRoom.players[drawerIndex].username} is choosing a word!`
        );

        emitRoomState(io, latestRoom);

        io.to(
            `${latestRoom.roomCode}-scribble`
        ).emit(
            "scribble-clear-canvas"
        );

    }, 3200);

}


function removePlayerFromRoom(
    io,
    socket,
    room
) {

    const leavingPlayer =
        room.players.find(
            p => p.id === socket.id
        );

    if (!leavingPlayer) return;

    room.players =
        room.players.filter(
            p => p.id !== socket.id
        );

    delete room.scores[socket.id];

    room.correctGuessers =
        room.correctGuessers.filter(
            id => id !== socket.id
        );

    socket.leave(
        `${room.roomCode}-scribble`
    );

    /*
        Transfer host if needed.
    */

    if (
        room.host === socket.id &&
        room.players.length > 0
    ) {

        room.host =
            room.players[0].id;

    }

    /*
        If drawer leaves, move to next turn.
    */

    if (
        room.drawer === socket.id &&
        room.players.length > 0
    ) {

        room.drawer =
            room.players[0].id;

        room.phase = "choosing";

        room.currentWord = null;

        room.wordOptions =
            getRandomWords(
                room.wordChoices
            );

        room.canvas = [];

    }

    emitRoomState(io, room);

}


module.exports = registerScribbleEvents;