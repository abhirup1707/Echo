const {
    createScribbleRoom,
    getScribbleRoom
} = require("./ScribbleManager");

const words = require("./Words");


// =========================================================
// DEBUG: CHECK HOW MANY WORDS ARE ACTUALLY LOADED
// =========================================================

console.log(
    "📚 TOTAL SCRIBBLE WORDS LOADED:",
    words.length
);

console.log(
    "📚 FIRST 20 WORDS:",
    words.slice(0, 20)
);


// =========================================================
// SERVER-SIDE CHOOSING TIMERS
// One timer per Scribble room
// =========================================================

const choosingTimers = {};


// =========================================================
// WORD PATTERN
//
// dog       => _ _ _  (3)
// ice cream => _ _ _    _ _ _ _ _  (3  5)
// =========================================================

function getWordPattern(word) {

    if (!word) return "";

    const parts = String(word)
        .trim()
        .split(/\s+/);

    const hiddenPattern = parts
        .map(part =>
            part
                .split("")
                .map(() => "_")
                .join(" ")
        )
        .join("    ");

    const letterCounts = parts
        .map(part => part.length)
        .join("  ");

    return `${hiddenPattern}  (${letterCounts})`;
}


// =========================================================
// PUBLIC ROOM STATE
//
// The actual current word is only sent to:
// 1. The drawer while drawing
// 2. Everyone during reveal
//
// Guessers only receive wordPattern.
// =========================================================

function getPublicRoom(room, socketId = null) {

    const canSeeCurrentWord =
        socketId === room.drawer ||
        room.phase === "reveal" ||
        room.phase === "finished";

    return {

        roomCode: room.roomCode,

        host: room.host,

        started: room.started,

        phase: room.phase,

        players: room.players,

        drawer: room.drawer,

        currentWord:
            canSeeCurrentWord
                ? room.currentWord
                : null,

        wordPattern:
            room.currentWord
                ? getWordPattern(room.currentWord)
                : "",

        wordOptions:
            socketId === room.drawer &&
            room.phase === "choosing"
                ? room.wordOptions
                : [],

        round: room.round,

        turnIndex: room.turnIndex,

        maxRounds: room.maxRounds,

        drawTime: room.drawTime,

        wordChoices: room.wordChoices,

        timeLeft: room.timeLeft,

        chooseTimeLeft:
            room.chooseTimeLeft ?? 0,

        correctGuessers:
            room.correctGuessers || [],

        canvas:
            room.canvas || [],

        chat:
            room.chat || [],

        scores:
            room.scores || {}

    };

}


// =========================================================
// EMIT ROOM STATE TO EACH PLAYER INDIVIDUALLY
//
// This prevents the real word and word options from leaking
// to guessers.
// =========================================================

function emitRoomState(io, room) {

    room.players.forEach(player => {

        io.to(player.id).emit(
            "scribble-room",
            getPublicRoom(room, player.id)
        );

    });

}


function emitScribbleStatus(io, room) {

    io.to(
        `${room.roomCode}-scribble-status`
    ).emit(
        "scribble-status",
        {
            roomCode: room.roomCode,
            playerCount: room.players.length
        }
    );

}


// =========================================================
// SYSTEM MESSAGE
// =========================================================

function addSystemMessage(room, text) {

    if (!Array.isArray(room.chat)) {

        room.chat = [];

    }

    const message = {

        id: `${Date.now()}-${Math.random()}`,

        author: "System",

        text,

        type: "system"

    };

    room.chat.push(message);

    return message;

}


// =========================================================
// GET RANDOM UNIQUE WORDS
// =========================================================

function getRandomWords(count) {

    if (
        !Array.isArray(words) ||
        words.length === 0
    ) {

        console.error(
            "❌ Words.js is empty or is not exporting an array."
        );

        return [];

    }


    const safeCount = Math.min(
        Number(count) || 5,
        words.length
    );


    /*
        Clean the complete word list.

        This removes:
        - empty strings
        - accidental spaces
        - duplicate words
    */

    const cleanWords = [

        ...new Set(

            words
                .map(word =>
                    String(word).trim()
                )
                .filter(Boolean)

        )

    ];


    const selectedWords = [];


    /*
        Pick truly random unique words
        directly from the complete list.
    */

    while (
        selectedWords.length < safeCount &&
        selectedWords.length < cleanWords.length
    ) {

        const randomIndex =
            Math.floor(
                Math.random() *
                cleanWords.length
            );


        const randomWord =
            cleanWords[randomIndex];


        if (
            !selectedWords.includes(randomWord)
        ) {

            selectedWords.push(
                randomWord
            );

        }

    }


    console.log(
        `🎲 Random words selected from ${cleanWords.length} words:`,
        selectedWords
    );


    return selectedWords;

}


// =========================================================
// CALCULATE POINTS
// =========================================================

function calculatePoints(timeLeft, drawTime) {

    return Math.round(
        40 +
        (timeLeft / drawTime) * 60
    );

}


// =========================================================
// STOP CHOOSING TIMER
// =========================================================

function stopChoosingTimer(roomCode) {

    if (!choosingTimers[roomCode]) {

        return;

    }

    clearInterval(
        choosingTimers[roomCode]
    );

    delete choosingTimers[roomCode];

}


// =========================================================
// START FIXED 10-SECOND CHOOSING TIMER
// =========================================================

function startChoosingTimer(io, room) {

    const roomCode = room.roomCode;


    // Stop any previous timer for this room.
    stopChoosingTimer(roomCode);


    // Always start fresh from exactly 10 seconds.
    room.chooseTimeLeft = 10;


    console.log(
        `⏱ Choosing timer started for room ${roomCode}: 10s`
    );


    // Send complete updated state to each player.
    emitRoomState(io, room);


    // Send initial timer value immediately.
    io.to(
        `${roomCode}-scribble`
    ).emit(
        "scribble-choose-time",
        10
    );


    choosingTimers[roomCode] =
        setInterval(() => {

            const latestRoom =
                getScribbleRoom(roomCode);


            // Room disappeared.
            if (!latestRoom) {

                stopChoosingTimer(roomCode);

                return;

            }


            // Choosing phase already ended.
            if (
                latestRoom.phase !== "choosing"
            ) {

                stopChoosingTimer(roomCode);

                return;

            }


            // Countdown.
            latestRoom.chooseTimeLeft =
                Math.max(
                    0,
                    latestRoom.chooseTimeLeft - 1
                );


            console.log(
                `⏱ Room ${roomCode} choosing: ${latestRoom.chooseTimeLeft}s`
            );


            // Send countdown to everyone.
            io.to(
                `${roomCode}-scribble`
            ).emit(
                "scribble-choose-time",
                latestRoom.chooseTimeLeft
            );


            // Still counting.
            if (
                latestRoom.chooseTimeLeft > 0
            ) {

                return;

            }


            // Timer reached zero.
            stopChoosingTimer(roomCode);


            const availableOptions =
                Array.isArray(
                    latestRoom.wordOptions
                )
                    ? latestRoom.wordOptions
                    : [];


            if (
                availableOptions.length === 0
            ) {

                console.error(
                    `❌ No word options available in room ${roomCode}`
                );

                return;

            }


            // Auto-select one of the displayed options.
            const randomWord =
                availableOptions[
                    Math.floor(
                        Math.random() *
                        availableOptions.length
                    )
                ];


            console.log(
                `⏰ Choosing time expired. Auto-selected: ${randomWord}`
            );


            startDrawingPhase(
                io,
                latestRoom,
                randomWord
            );

        }, 1000);

}


// =========================================================
// START DRAWING PHASE
// =========================================================

function startDrawingPhase(io, room, word) {

    /*
        Stop choosing timer immediately.
    */

    stopChoosingTimer(
        room.roomCode
    );


    room.currentWord = word;

    room.wordOptions = [];

    room.phase = "drawing";

    room.timeLeft = room.drawTime;

    room.chooseTimeLeft = 0;

    room.correctGuessers = [];

    room.canvas = [];


    addSystemMessage(
        room,
        `${getDrawerName(room)} is drawing!`
    );


    console.log(
        `✏ Drawing started in ${room.roomCode}. Drawer: ${getDrawerName(room)}`
    );


    emitRoomState(io, room);


    io.to(
        `${room.roomCode}-scribble`
    ).emit(
        "scribble-clear-canvas"
    );

}


// =========================================================
// GET DRAWER NAME
// =========================================================

function getDrawerName(room) {

    const drawer = room.players.find(
        player =>
            player.id === room.drawer
    );

    return drawer
        ? drawer.username
        : "Someone";

}


// =========================================================
// REGISTER SCRIBBLE SOCKET EVENTS
// =========================================================

function registerScribbleEvents(io, socket) {

    console.log(
        "🎨 Scribble events registered for:",
        socket.id
    );


    // =====================================================
    // WATCH SCRIBBLE PLAYER COUNT (WITHOUT JOINING THE GAME)
    // =====================================================

    socket.on(
        "scribble-watch-status",
        ({ roomCode }) => {

            if (!roomCode) return;

            socket.join(
                `${roomCode}-scribble-status`
            );

            const room = getScribbleRoom(roomCode);

            socket.emit(
                "scribble-status",
                {
                    roomCode,
                    playerCount: room?.players?.length || 0
                }
            );

        }
    );


    socket.on(
        "scribble-unwatch-status",
        ({ roomCode }) => {

            if (!roomCode) return;

            socket.leave(
                `${roomCode}-scribble-status`
            );

        }
    );


    // =====================================================
    // JOIN SCRIBBLE
    // =====================================================

    socket.on(
        "scribble-join",
        ({ roomCode, username }) => {

            if (!roomCode || !username) {

                return;

            }


            let room =
                getScribbleRoom(roomCode);


            if (!room) {

                room = createScribbleRoom(
                    roomCode,
                    socket.id
                );

            }


            let player =
                room.players.find(
                    existingPlayer =>
                        existingPlayer.username ===
                        username
                );


            /*
                Reconnection:
                Update old socket ID to new socket ID.
            */

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
                    (
                        room.correctGuessers || []
                    ).map(id =>
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

            emitScribbleStatus(io, room);


            console.log(
                `🎨 ${username} joined Scribble ${roomCode}`
            );

        }
    );


    // =====================================================
    // UPDATE SETTINGS
    // =====================================================

    socket.on(
        "scribble-update-settings",
        ({ roomCode, settings }) => {

            const room =
                getScribbleRoom(roomCode);


            if (!room) return;

            if (
                room.host !== socket.id
            ) {
                return;
            }

            if (room.started) return;


            room.maxRounds =
                Number(
                    settings?.maxRounds
                ) || 5;


            room.drawTime =
                Number(
                    settings?.drawTime
                ) || 150;


            room.wordChoices =
                Number(
                    settings?.wordChoices
                ) || 5;


            room.timeLeft =
                room.drawTime;


            emitRoomState(io, room);

        }
    );


    // =====================================================
    // START GAME
    // =====================================================

    socket.on(
        "scribble-start",
        ({ roomCode }) => {

            const room =
                getScribbleRoom(roomCode);


            if (!room) return;


            if (
                room.host !== socket.id
            ) {
                return;
            }


            if (room.players.length < 2) {

                socket.emit(
                    "scribble-error",
                    "At least 2 players are required."
                );

                return;

            }


            /*
                Stop any old timer left over from
                a previous game.
            */

            stopChoosingTimer(roomCode);


            room.started = true;

            room.phase = "choosing";

            room.round = 1;

            room.turnIndex = 0;

            room.drawer =
                room.players[0].id;

            room.currentWord = null;

            room.wordOptions =
                getRandomWords(
                    room.wordChoices
                );

            room.correctGuessers = [];

            room.canvas = [];

            room.chat = [];

            room.timeLeft =
                room.drawTime;


            Object.keys(
                room.scores
            ).forEach(id => {

                room.scores[id] = 0;

            });


            addSystemMessage(
                room,
                `Round 1 of ${room.maxRounds} — ${room.players[0].username} is choosing a word!`
            );


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


            /*
                IMPORTANT:
                This sends the initial state AND
                starts the 10-second countdown.
            */

            startChoosingTimer(
                io,
                room
            );

        }
    );


    // =====================================================
    // SELECT WORD
    // =====================================================

    socket.on(
        "scribble-select-word",
        ({ roomCode, word }) => {

            const room =
                getScribbleRoom(roomCode);


            if (!room) return;

            if (
                room.phase !== "choosing"
            ) {
                return;
            }

            if (
                room.drawer !== socket.id
            ) {
                return;
            }

            if (
                !room.wordOptions.includes(word)
            ) {
                return;
            }


            startDrawingPhase(
                io,
                room,
                word
            );

        }
    );


    // =====================================================
    // DRAW STROKE
    // =====================================================

    socket.on(
        "scribble-draw",
        ({ roomCode, stroke }) => {

            const room =
                getScribbleRoom(roomCode);


            if (!room) return;

            if (
                room.phase !== "drawing"
            ) {
                return;
            }

            if (
                room.drawer !== socket.id
            ) {
                return;
            }

            if (!stroke) return;


            const action = {

                type: "stroke",

                ...stroke

            };


            room.canvas.push(action);


            /*
                Prevent unlimited memory growth.
            */

            if (
                room.canvas.length > 20000
            ) {

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


    // =====================================================
    // FILL TOOL
    // =====================================================

    socket.on(
        "scribble-fill",
        ({ roomCode, fill }) => {

            const room =
                getScribbleRoom(roomCode);


            if (!room) return;

            if (
                room.phase !== "drawing"
            ) {
                return;
            }

            if (
                room.drawer !== socket.id
            ) {
                return;
            }

            if (!fill) return;


            const action = {

                type: "fill",

                ...fill

            };


            room.canvas.push(action);


            io.to(
                `${roomCode}-scribble`
            ).emit(
                "scribble-fill",
                action
            );

        }
    );


    // =====================================================
    // UNDO LAST ACTION
    // =====================================================

    socket.on(
        "scribble-undo",
        ({ roomCode }) => {

            const room =
                getScribbleRoom(roomCode);


            if (!room) return;

            if (
                room.phase !== "drawing"
            ) {
                return;
            }

            if (
                room.drawer !== socket.id
            ) {
                return;
            }

            if (
                room.canvas.length === 0
            ) {
                return;
            }


            room.canvas.pop();


            io.to(
                `${roomCode}-scribble`
            ).emit(
                "scribble-canvas-state",
                room.canvas
            );

        }
    );


    // =====================================================
    // CLEAR CANVAS
    // =====================================================

    socket.on(
        "scribble-clear-canvas",
        ({ roomCode }) => {

            const room =
                getScribbleRoom(roomCode);


            if (!room) return;

            if (
                room.phase !== "drawing"
            ) {
                return;
            }

            if (
                room.drawer !== socket.id
            ) {
                return;
            }


            room.canvas = [];


            io.to(
                `${roomCode}-scribble`
            ).emit(
                "scribble-clear-canvas"
            );

        }
    );


    // =====================================================
    // SUBMIT GUESS
    // =====================================================

    socket.on(
        "scribble-guess",
        ({ roomCode, guess }) => {

            const room =
                getScribbleRoom(roomCode);


            if (!room) return;

            if (
                room.phase !== "drawing"
            ) {
                return;
            }

            if (
                room.drawer === socket.id
            ) {
                return;
            }


            const player =
                room.players.find(
                    existingPlayer =>
                        existingPlayer.id ===
                        socket.id
                );


            if (!player) return;


            const cleanGuess =
                String(
                    guess || ""
                ).trim();


            if (!cleanGuess) return;


            const alreadyGuessed =
                room.correctGuessers.includes(
                    socket.id
                );


            if (alreadyGuessed) return;


            const isCorrect =
                cleanGuess.toLowerCase() ===
                String(
                    room.currentWord || ""
                ).toLowerCase();


            // =============================================
            // CORRECT GUESS
            // =============================================

            if (isCorrect) {

                const points =
                    calculatePoints(
                        room.timeLeft,
                        room.drawTime
                    );


                room.correctGuessers.push(
                    socket.id
                );


                room.scores[socket.id] =
                    (
                        room.scores[
                            socket.id
                        ] || 0
                    ) + points;


                room.scores[room.drawer] =
                    (
                        room.scores[
                            room.drawer
                        ] || 0
                    ) + 15;


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


                room.chat.push(message);


                emitRoomState(io, room);


                /*
                    If every non-drawer player has
                    guessed correctly, end early.
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


            // =============================================
            // NORMAL / WRONG GUESS
            // =============================================

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


            room.chat.push(message);


            emitRoomState(io, room);

        }
    );


    // =====================================================
    // DRAWING TIMER TICK
    // =====================================================

    socket.on(
        "scribble-timer-tick",
        ({ roomCode }) => {

            const room =
                getScribbleRoom(roomCode);


            if (!room) return;

            if (
                room.drawer !== socket.id
            ) {
                return;
            }

            if (
                room.phase !== "drawing"
            ) {
                return;
            }

            if (
                room.timeLeft <= 0
            ) {
                return;
            }


            room.timeLeft -= 1;


            io.to(
                `${roomCode}-scribble`
            ).emit(
                "scribble-time",
                room.timeLeft
            );


            if (
                room.timeLeft <= 0
            ) {

                endCurrentTurn(
                    io,
                    room
                );

            }

        }
    );


    // =====================================================
    // PLAY AGAIN
    // =====================================================

    socket.on(
        "scribble-play-again",
        ({ roomCode }) => {

            const room =
                getScribbleRoom(roomCode);


            if (!room) return;

            if (
                room.host !== socket.id
            ) {
                return;
            }


            stopChoosingTimer(
                roomCode
            );


            room.started = false;

            room.phase = "lobby";

            room.drawer = null;

            room.currentWord = null;

            room.wordOptions = [];

            room.round = 1;

            room.turnIndex = 0;

            room.timeLeft =
                room.drawTime;

            room.chooseTimeLeft = 0;

            room.correctGuessers = [];

            room.canvas = [];

            room.chat = [];


            Object.keys(
                room.scores
            ).forEach(id => {

                room.scores[id] = 0;

            });


            emitRoomState(io, room);

        }
    );


    // =====================================================
    // LEAVE SCRIBBLE
    // =====================================================

    socket.on(
        "scribble-leave",
        ({ roomCode }) => {

            const room =
                getScribbleRoom(roomCode);


            if (!room) return;


            removePlayerFromRoom(
                io,
                socket,
                room
            );

        }
    );

}


// =========================================================
// END CURRENT DRAWING TURN
// =========================================================

function endCurrentTurn(io, room) {

    if (
        room.phase !== "drawing"
    ) {
        return;
    }


    /*
        Stop any choosing timer just in case.
    */

    stopChoosingTimer(
        room.roomCode
    );


    room.phase = "reveal";


    addSystemMessage(
        room,
        `The word was "${room.currentWord}"!`
    );


    emitRoomState(io, room);


    setTimeout(() => {

        const latestRoom =
            getScribbleRoom(
                room.roomCode
            );


        if (!latestRoom) return;


        if (
            latestRoom.phase !== "reveal"
        ) {
            return;
        }


        const totalTurns =
            latestRoom.players.length *
            latestRoom.maxRounds;


        /*
            GAME FINISHED
        */

        if (
            latestRoom.turnIndex + 1 >=
            totalTurns
        ) {

            latestRoom.phase =
                "finished";

            latestRoom.started =
                false;

            latestRoom.chooseTimeLeft =
                0;


            emitRoomState(
                io,
                latestRoom
            );


            return;

        }


        /*
            MOVE TO NEXT TURN
        */

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
            latestRoom.players[
                drawerIndex
            ].id;


        latestRoom.currentWord = null;


        latestRoom.wordOptions =
            getRandomWords(
                latestRoom.wordChoices
            );


        latestRoom.correctGuessers = [];

        latestRoom.canvas = [];

        latestRoom.timeLeft =
            latestRoom.drawTime;

        latestRoom.phase =
            "choosing";


        addSystemMessage(
            latestRoom,
            `Round ${latestRoom.round} of ${latestRoom.maxRounds} — ${latestRoom.players[drawerIndex].username} is choosing a word!`
        );


        io.to(
            `${latestRoom.roomCode}-scribble`
        ).emit(
            "scribble-clear-canvas"
        );


        /*
            Start a fresh 10-second timer
            for every new drawer.
        */

        startChoosingTimer(
            io,
            latestRoom
        );

    }, 3200);

}


// =========================================================
// REMOVE PLAYER FROM ROOM
// =========================================================

function removePlayerFromRoom(
    io,
    socket,
    room
) {

    const leavingPlayer =
        room.players.find(
            player =>
                player.id === socket.id
        );


    if (!leavingPlayer) return;


    const wasDrawer =
        room.drawer === socket.id;


    room.players =
        room.players.filter(
            player =>
                player.id !== socket.id
        );


    delete room.scores[
        socket.id
    ];


    room.correctGuessers =
        (
            room.correctGuessers || []
        ).filter(
            id => id !== socket.id
        );


    socket.leave(
        `${room.roomCode}-scribble`
    );


    emitScribbleStatus(io, room);


    /*
        No players remain.
        Stop the timer.
    */

    if (
        room.players.length === 0
    ) {

        stopChoosingTimer(
            room.roomCode
        );

        return;

    }


    /*
        Transfer host.
    */

    if (
        room.host === socket.id
    ) {

        room.host =
            room.players[0].id;

    }


    /*
        Drawer left during the game.
    */

    if (wasDrawer) {

        stopChoosingTimer(
            room.roomCode
        );


        room.drawer =
            room.players[0].id;

        room.phase =
            "choosing";

        room.currentWord =
            null;

        room.wordOptions =
            getRandomWords(
                room.wordChoices
            );

        room.correctGuessers =
            [];

        room.canvas = [];

        room.timeLeft =
            room.drawTime;


        addSystemMessage(
            room,
            `${getDrawerName(room)} is choosing a word!`
        );


        /*
            Start fresh 10-second timer
            for replacement drawer.
        */

        startChoosingTimer(
            io,
            room
        );


        return;

    }


    emitRoomState(
        io,
        room
    );

}


module.exports = registerScribbleEvents;
