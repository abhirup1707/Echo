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

    socket.on("create-session", ({ username, sessionName, avatar }) => {

        const session = createSession(
            socket.id,
            username,
            sessionName,
            avatar
        );

        socket.join(session.code);

        socket.emit("session-created", session);

        io.to(session.code).emit(
            "members-updated",
            session.members
        );

        console.log("Created:", session.code);

    });

    socket.on("join-session", ({ roomCode, username, avatar }) => {

        const session = getSession(roomCode);

        if (!session) {
            socket.emit("room-not-found");
            return;
        }

        const existingIdx = session.members.findIndex(m => m.id === socket.id || m.username === username);
        if (existingIdx !== -1) {
            session.members[existingIdx] = {
                id: socket.id,
                username,
                avatar: avatar || session.members[existingIdx].avatar || ""
            };
        } else {
            session.members.push({
                id: socket.id,
                username,
                avatar: avatar || ""
            });
        }

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
    let curVideoTime = session.videoTime || 0;
    if (session.videoPlaying && session.videoUpdatedAt) {
        curVideoTime += (Date.now() - session.videoUpdatedAt) / 1000;
    }
    socket.emit("video-changed", session.currentVideo);
    if (session.videoPlaying) {
        socket.emit("video-resumed", { time: curVideoTime });
    } else {
        socket.emit("video-paused", { time: curVideoTime });
    }
}





if (session.currentSong) {
    let currentTime = session.songTime || 0;
    if (session.playing && session.songUpdatedAt) {
        currentTime += (Date.now() - session.songUpdatedAt) / 1000;
    }
    socket.emit("song-changed", session.currentSong);
    if (session.playing) {
        socket.emit("song-resumed", { time: currentTime });
    } else {
        socket.emit("song-paused", { time: currentTime });
    }
}

if (session.currentMovie) {

    let currentTime = session.movieTime;
    if (session.moviePlaying && session.movieUpdatedAt) {
        currentTime += (Date.now() - session.movieUpdatedAt) / 1000;
    }

    socket.emit(
        "movie-changed",
        session.currentMovie
    );

    socket.emit(
        "movie-sync",
        {
            time: currentTime,
            playing: session.moviePlaying,
            movie: session.currentMovie
        }
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
        session.songTime = 0;
        session.songUpdatedAt = Date.now();

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
        session.videoPlaying = true;
        session.videoTime = 0;
        session.videoUpdatedAt = Date.now();

        console.log("Broadcasting video:", video.title);

        io.to(roomCode).emit("video-changed", video);

    });

    socket.on("pause-video", ({ roomCode, time }) => {
        const session = getSession(roomCode);
        if (session) {
            session.videoPlaying = false;
            session.videoTime = time || 0;
            session.videoUpdatedAt = Date.now();
        }
        io.to(roomCode).emit("video-paused", { time: time || 0 });
    });

    socket.on("resume-video", ({ roomCode, time }) => {
        const session = getSession(roomCode);
        if (session) {
            session.videoPlaying = true;
            session.videoTime = time || 0;
            session.videoUpdatedAt = Date.now();
        }
        io.to(roomCode).emit("video-resumed", { time: time || 0 });
    });

    socket.on("seek-video", ({ roomCode, time }) => {
        const session = getSession(roomCode);
        if (session) {
            session.videoTime = time || 0;
            session.videoUpdatedAt = Date.now();
        }
        io.to(roomCode).emit("video-seeked", { time: time || 0 });
    });

    socket.on("stop-video", ({ roomCode }) => {
        const session = getSession(roomCode);
        if (session) {
            session.currentVideo = null;
            session.videoPlaying = false;
            session.videoTime = 0;
            session.videoUpdatedAt = null;
        }
        io.to(roomCode).emit("video-stopped");
    });

    socket.on("stop-movie", ({ roomCode }) => {
        const session = getSession(roomCode);
        if (session) {
            session.currentMovie = null;
            session.moviePlaying = false;
            session.movieTime = 0;
            session.movieUpdatedAt = null;
            session.movieReadyMembers = [];
        }
        io.to(roomCode).emit("movie-stopped");
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

// ===============================
// VOICE CALL SIGNALING (WebRTC Mesh)
// ===============================

socket.on("voice-join", ({ roomCode, username }) => {
    const session = getSession(roomCode);
    if (!session) return;

    const peersInRoom = (session.members || [])
        .filter(m => m.id !== socket.id)
        .map(m => ({ id: m.id, username: m.username }));

    socket.emit("voice-all-peers", peersInRoom);

    socket.to(roomCode).emit("voice-peer-joined", {
        socketId: socket.id,
        username
    });
});

socket.on("voice-offer", ({ targetId, offer }) => {
    io.to(targetId).emit("voice-offer", {
        from: socket.id,
        offer
    });
});

socket.on("voice-answer", ({ targetId, answer }) => {
    io.to(targetId).emit("voice-answer", {
        from: socket.id,
        answer
    });
});

socket.on("voice-ice-candidate", ({ targetId, candidate }) => {
    io.to(targetId).emit("voice-ice-candidate", {
        from: socket.id,
        candidate
    });
});

socket.on("voice-status-update", ({ roomCode, isMuted, isDeafened }) => {
    socket.to(roomCode).emit("voice-peer-status", {
        socketId: socket.id,
        isMuted,
        isDeafened
    });
});

socket.on("voice-leave", ({ roomCode }) => {
    socket.to(roomCode).emit("voice-peer-left", {
        socketId: socket.id
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
        session.songTime = 0;
        session.songUpdatedAt = Date.now();

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

    socket.to(roomCode).emit("voice-peer-left", {
        socketId: socket.id
    });

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
    socket.on("pause-song", ({ roomCode, time }) => {
        const session = getSession(roomCode);
        if (session) {
            session.playing = false;
            session.songTime = time || 0;
            session.songUpdatedAt = Date.now();
        }
        io.to(roomCode).emit("song-paused", { time: time || 0 });
    });

    socket.on("resume-song", ({ roomCode, time }) => {
        const session = getSession(roomCode);
        if (session) {
            session.playing = true;
            session.songTime = time || 0;
            session.songUpdatedAt = Date.now();
        }
        io.to(roomCode).emit("song-resumed", { time: time || 0 });
    });

    socket.on("seek-song", ({ roomCode, time }) => {
        const session = getSession(roomCode);
        if (session) {
            session.songTime = time || 0;
            session.songUpdatedAt = Date.now();
        }
        io.to(roomCode).emit("song-seeked", { time: time || 0 });
    });

    socket.on("stop-song", ({ roomCode }) => {
        const session = getSession(roomCode);
        if (session) {
            session.currentSong = null;
            session.playing = false;
            session.songTime = 0;
            session.songUpdatedAt = null;
        }
        io.to(roomCode).emit("song-stopped");
    });

    // ================= MOVIE PLAY =================

socket.on("play-movie", ({ roomCode, time }) => {

    const session = getSession(roomCode);
    if (session) {
        session.moviePlaying = true;
        session.movieTime = time || 0;
        session.movieUpdatedAt = Date.now();
    }
    io.to(roomCode).emit("play-movie", { time: time || 0 });

});

// ================= MOVIE PAUSE =================

socket.on("pause-movie", ({ roomCode, time }) => {

    const session = getSession(roomCode);
    if (session) {
        session.moviePlaying = false;
        session.movieTime = time || 0;
        session.movieUpdatedAt = Date.now();
    }
    io.to(roomCode).emit("pause-movie", { time: time || 0 });

});

// ================= MOVIE SEEK =================

socket.on("seek-movie", ({ roomCode, time }) => {

    const session = getSession(roomCode);
    if (session) {
        session.movieTime = time;
        session.movieUpdatedAt = Date.now();
    }
    io.to(roomCode).emit("seek-movie", { time });

});

// ================= MOVIE SYNC (for late joiners) =================

socket.on("sync-movie", ({ roomCode }) => {

    const session = getSession(roomCode);
    if (!session || !session.currentMovie) return;

    let currentTime = session.movieTime;
    if (session.moviePlaying && session.movieUpdatedAt) {
        currentTime += (Date.now() - session.movieUpdatedAt) / 1000;
    }

    socket.emit("movie-sync", {
        time: currentTime,
        playing: session.moviePlaying,
        movie: session.currentMovie
    });

});

// ================= MOVIE HEARTBEAT (drift correction) =================

socket.on("heartbeat-movie", ({ roomCode, time }) => {

    const session = getSession(roomCode);
    if (!session) return;

    session.movieTime = time;
    session.movieUpdatedAt = Date.now();

    socket.to(roomCode).emit("sync-heartbeat", { time });

});

// ================= MOVIE DOWNLOAD TRACKING =================

socket.on("movie-download-done", ({ roomCode }) => {

    const session = getSession(roomCode);
    if (!session) return;

    if (!session.movieReadyMembers.includes(socket.id)) {
        session.movieReadyMembers.push(socket.id);
    }

    const total = session.members.length;
    const ready = session.movieReadyMembers.length;

    io.to(roomCode).emit("movie-ready-count", { ready, total });

    console.log(`Movie download: ${ready}/${total} ready in ${roomCode}`);

    if (ready >= total && total > 0) {
        io.to(roomCode).emit("all-ready");
        console.log(`All members ready in ${roomCode} — starting movie`);
    }

});

socket.on("movie-download-start", ({ roomCode }) => {

    const session = getSession(roomCode);
    if (!session) return;

    const total = session.members.length;
    const ready = session.movieReadyMembers.length;

    io.to(roomCode).emit("movie-ready-count", { ready, total });

});

    socket.on("disconnect", () => {

        console.log(socket.id, "Disconnected");

        for (const code in sessions) {

            const session = sessions[code];

            session.members = session.members.filter(
                member => member.id !== socket.id
            );

            socket.to(code).emit("voice-peer-left", {
                socketId: socket.id
            });

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