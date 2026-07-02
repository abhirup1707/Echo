const generateCode = require("../utils/generateCode");

const sessions = {};

function createSession(hostSocketId, username, sessionName) {

    const code = generateCode();

    sessions[code] = {
        code,
        name: sessionName,
        host: hostSocketId,

        members: [
            {
                id: hostSocketId,
                username
            }
        ],

        currentSong: null,
        queue: [],
        chat: [],
        playing: false,
        currentTime: 0,
        createdAt: new Date()
    };

    return sessions[code];
}

function getSession(code) {
    return sessions[code];
}

function deleteSession(code) {
    delete sessions[code];
}

module.exports = {
    sessions,
    createSession,
    getSession,
    deleteSession
};