const generateCode = require("../utils/generateCode");

const sessions = {};

function createSession(hostSocketId, username, sessionName, avatar = "") {

    const code = generateCode();

    sessions[code] = {
        code,
        name: sessionName,
        host: hostSocketId,

        members: [
            {
                id: hostSocketId,
                username,
                avatar: avatar || ""
            }
        ],

        currentSong: null,
        currentSong: null,
        currentMovie: null,
        currentVideo: null,
        movieTime: 0,
        moviePlaying: false,
        movieUpdatedAt: null,
        movieReadyMembers: [],

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