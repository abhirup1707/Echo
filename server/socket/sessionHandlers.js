const {
    sessions,
    createSession,
    getSession,
    deleteSession
} = require("../rooms/SessionManager");
const fs = require("fs");
const path = require("path");

function registerSessionHandlers(io, socket) {

    console.log("Connected:", socket.id);

    socket.on("create-session", ({ username, sessionName }) => {

        const session = createSession(
            socket.id,
            username,
            sessionName
        );

        socket.join(session.code);

        socket.emit("session-created", session);

        io.to(session.code).emit(
            "members-updated",
            session.members
        );

        console.log("Created:", session.code);

    });

    socket.on("join-session", ({ roomCode, username }) => {

        const session = getSession(roomCode);

        if (!session) {
            socket.emit("room-not-found");
            return;
        }

        session.members.push({
            id: socket.id,
            username
        });

        socket.join(roomCode);

        io.to(roomCode).emit(
            "members-updated",
            session.members
        );
socket.emit(
    "queue-updated",
    session.queue
);

socket.emit(
    "chat-history",
    session.messages || []
);

if (session.currentVideo) {

    socket.emit(

        "video-changed",

        session.currentVideo

    );

}





if (session.currentSong) {

    socket.emit(

        "song-changed",

        session.currentSong

    );

}

if (session.currentMovie) {

    socket.emit(
        "movie-changed",
        session.currentMovie
    );

}
        console.log(username, "joined", roomCode);

        socket.to(roomCode).emit("peer-joined", {

    socketId: socket.id

});

    });

    socket.on("play-song", ({ roomCode, song }) => {

        const session = getSession(roomCode);

        if (!session) {
            console.log("Session not found:", roomCode);
            return;
        }

        session.currentSong = song;
        session.playing = true;

        console.log("Broadcasting song:", song.title);

        io.to(roomCode).emit("song-changed", song);

    });

    socket.on("play-video", ({ roomCode, video }) => {

    const session = getSession(roomCode);

    if (!session) {

        console.log("Session not found:", roomCode);

        return;

    }

    session.currentVideo = video;

    console.log("Broadcasting video:", video.title);

    io.to(roomCode).emit("video-changed", video);

});


// ===============================
// GOOGLE DRIVE WATCH TOGETHER
// ===============================


// ===============================
// WEBRTC SIGNALING
// ===============================

// Host sends WebRTC Offer
socket.on("webrtc-offer", ({ targetId, signal }) => {

    io.to(targetId).emit("webrtc-offer", {

        from: socket.id,

        signal

    });

});

// Viewer sends WebRTC Answer
socket.on("webrtc-answer", ({ targetId, signal }) => {

    io.to(targetId).emit("webrtc-answer", {

        from: socket.id,

        signal

    });

});

// Exchange ICE Candidates
socket.on("webrtc-ice", ({ targetId, candidate }) => {

    io.to(targetId).emit("webrtc-ice", {

        from: socket.id,

        candidate

    });

});

socket.on("send-message", ({ roomCode, message }) => {

    const session = getSession(roomCode);

    if (!session) return;

    // Store chat history for this session
    if (!session.messages) {

        session.messages = [];

    }

    session.messages.push(message);

    io.to(roomCode).emit(

        "chat-message",

        message

    );

    console.log(

        `${message.username}: ${message.message}`

    );

});


socket.on("add-to-queue", ({ roomCode, song, username }) => {

    const session = getSession(roomCode);

    if (!session) return;

    const queuedSong = {

        song,

        addedBy: {

            id: socket.id,

            username

        },

        addedAt: Date.now()

    };

    session.queue.push(queuedSong);

    io.to(roomCode).emit(

        "queue-updated",

        session.queue

    );

    console.log(
        `${username} added ${song.title} to queue`
    );

});

socket.on("play-next", ({ roomCode }) => {

    const session = getSession(roomCode);

    if (!session) return;

    if (session.queue.length === 0) return;

    const nextSong = session.queue.shift();

    session.currentSong = nextSong.song;

    session.playing = true;

    io.to(roomCode).emit(
        "song-changed",
        nextSong.song
    );

    io.to(roomCode).emit(
        "queue-updated",
        session.queue
    );

    console.log(
        "Playing next:",
        nextSong.song.title
    );

});

socket.on("leave-session", ({ roomCode }) => {

    const session = getSession(roomCode);

    if (!session) return;

    session.members = session.members.filter(
        member => member.id !== socket.id
    );

    socket.leave(roomCode);

    io.to(roomCode).emit(
        "members-updated",
        session.members
    );

    io.to(roomCode).emit(
        "queue-updated",
        session.queue
    );

    console.log(socket.id + " left " + roomCode);

if (session.members.length === 0) {

    const uploadFolder = path.join(

        __dirname,

        "..",

        "uploads",

        roomCode

    );

    if (fs.existsSync(uploadFolder)) {

        fs.rmSync(uploadFolder, {

            recursive: true,

            force: true

        });

        console.log(

            "🗑 Deleted uploads:",

            roomCode

        );

    }

    deleteSession(roomCode);

    console.log(

        "Deleted empty room:",

        roomCode

    );

}

});
    socket.on("pause-song", ({ roomCode }) => {
        io.to(roomCode).emit("pause-song");
    });

    socket.on("resume-song", ({ roomCode }) => {
        io.to(roomCode).emit("resume-song");
    });

    // ================= MOVIE PLAY =================

socket.on("play-movie", ({ roomCode }) => {

    io.to(roomCode).emit("play-movie");

});

// ================= MOVIE PAUSE =================

socket.on("pause-movie", ({ roomCode }) => {

    io.to(roomCode).emit("pause-movie");

});

    socket.on("disconnect", () => {

        console.log(socket.id, "Disconnected");

        for (const code in sessions) {

            const session = sessions[code];

            session.members = session.members.filter(
                member => member.id !== socket.id
            );

            io.to(code).emit(
                "members-updated",
                session.members
            );

           if (session.members.length === 0) {

    const uploadFolder = path.join(

        __dirname,

        "..",

        "uploads",

        code

    );

    if (fs.existsSync(uploadFolder)) {

        fs.rmSync(uploadFolder, {

            recursive: true,

            force: true

        });

        console.log(

            "🗑 Deleted uploads:",

            code

        );

    }

    deleteSession(code);

}
        }
    });
}

module.exports = registerSessionHandlers;