const generateCode = require("../utils/generateCode");

const sessions = {};

function createSession(hostSocketId, username, sessionName, avatar = "") {

    const code = generateCode();

    sessions[code] = {
        code,
        name: sessionName,
        host: hostSocketId,
        hostUsername: username,

        members: [
            {
                id: hostSocketId,
                username,
                avatar: avatar || "",
                isHost: true
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

        voiceMembers: new Set(),

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

function getPublicMembers(session) {
    if (!session || !session.members) return [];
    return session.members.map(m => ({
        id: m.id,
        username: m.username,
        avatar: m.avatar || "",
        isHost: Boolean(
            m.isHost ||
            m.id === session.host ||
            (session.hostUsername && m.username === session.hostUsername)
        ),
        inVoice: Boolean(session.voiceMembers && session.voiceMembers.has(m.id))
    }));
}

module.exports = {
    sessions,
    createSession,
    getSession,
    deleteSession,
    getPublicMembers
};