const scribbleRooms = {};

function createScribbleRoom(roomCode, hostId) {

    if (scribbleRooms[roomCode]) {
        return scribbleRooms[roomCode];
    }

    scribbleRooms[roomCode] = {

        roomCode,

        host: hostId,

        started: false,

        // lobby | choosing | drawing | reveal | finished
        phase: "lobby",

        players: [],

        drawer: null,

        currentWord: null,

        wordOptions: [],

        round: 1,

        turnIndex: 0,

        maxRounds: 5,

        drawTime: 150,

        wordChoices: 5,

        // Word selection always begins with a full 10-second countdown.
        chooseTimeLeft: 10,

        timeLeft: 150,

        correctGuessers: [],

        canvas: [],

        chat: [
            {
                id: `welcome-${Date.now()}`,
                author: "System",
                text: "Welcome to Scribble! Guess words and draw your best doodles.",
                type: "system"
            }
        ],

        scores: {},

        createdAt: new Date()

    };

    return scribbleRooms[roomCode];

}

function getScribbleRoom(roomCode) {

    return scribbleRooms[roomCode];

}

function deleteScribbleRoom(roomCode) {

    delete scribbleRooms[roomCode];

}

module.exports = {

    scribbleRooms,

    createScribbleRoom,

    getScribbleRoom,

    deleteScribbleRoom

};
