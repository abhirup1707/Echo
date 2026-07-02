const {
    sessions,
    createSession,
    getSession,
    deleteSession
} = require("../rooms/SessionManager");

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
        console.log(username, "joined", roomCode);

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
    socket.on("pause-song", ({ roomCode }) => {
        io.to(roomCode).emit("pause-song");
    });

    socket.on("resume-song", ({ roomCode }) => {
        io.to(roomCode).emit("resume-song");
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
                deleteSession(code);
            }
        }
    });
}

module.exports = registerSessionHandlers;