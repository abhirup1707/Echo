const {
    sessions,
    createSession,
    getSession,
    deleteSession,
    getPublicMembers
} = require("../rooms/SessionManager");
const {
    getPublicMembersWithGames,
    getMinigamesStatus
} = require("../games/GameStatusTracker");
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

        socket.emit("session-created", {
            ...session,
            members: getPublicMembersWithGames(session)
        });

        io.to(session.code).emit(
            "members-updated",
            getPublicMembersWithGames(session)
        );

        console.log("Created:", session.code);

    });

    socket.on("join-session", ({ roomCode, username, avatar }) => {

        const session = getSession(roomCode);

        if (!session) {
            socket.emit("room-not-found");
            return;
        }

        const isHost = Boolean(
            session.host === socket.id ||
            session.hostUsername === username ||
            session.members.length === 0
        );

        if (session.members.length === 0 || !session.host) {
            session.host = socket.id;
            session.hostUsername = username;
        }

        const existingIdx = session.members.findIndex(m => m.id === socket.id || m.username === username);
        if (existingIdx !== -1) {
            session.members[existingIdx] = {
                id: socket.id,
                username,
                avatar: avatar || session.members[existingIdx].avatar || "",
                isHost: isHost || session.members[existingIdx].isHost
            };
        } else {
            session.members.push({
                id: socket.id,
                username,
                avatar: avatar || "",
                isHost
            });
        }

        socket.join(roomCode);

        io.to(roomCode).emit(
            "members-updated",
            getPublicMembersWithGames(session)
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
    let currentTime = Number(session.songTime) || 0;
    if (session.playing && session.songUpdatedAt) {
        currentTime += Math.max(0, (Date.now() - session.songUpdatedAt) / 1000);
    }
    socket.emit("song-changed", session.currentSong);
    if (session.playing) {
        socket.emit("song-resumed", { time: Math.max(0, currentTime) });
    } else {
        socket.emit("song-paused", { time: Math.max(0, currentTime) });
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

        socket.emit("minigames-status", getMinigamesStatus(roomCode));

    });

    socket.on("get-minigames-status", ({ roomCode }) => {
        if (!roomCode) return;
        socket.emit("minigames-status", getMinigamesStatus(roomCode));
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

// ==========================================
// SCREEN SHARE & WATCH PARTY SIGNALING (WebRTC)
// ==========================================

socket.on("stream-start", ({ roomCode, streamTitle, hasAudio, username }) => {
    const session = getSession(roomCode);
    if (!session) return;

    session.activeStream = {
        streamerId: socket.id,
        streamerUsername: username || "Host",
        streamTitle: streamTitle || "Live Watch Party",
        hasAudio: Boolean(hasAudio),
        startedAt: Date.now()
    };

    io.to(roomCode).emit("stream-started", session.activeStream);
    console.log(`[Stream] Started in ${roomCode} by ${socket.id} (${username})`);
});

socket.on("stream-stop", ({ roomCode }) => {
    const session = getSession(roomCode);
    if (!session) return;

    if (session.activeStream && session.activeStream.streamerId === socket.id) {
        session.activeStream = null;
        io.to(roomCode).emit("stream-stopped");
        console.log(`[Stream] Stopped in ${roomCode} by streamer`);
    }
});

socket.on("stream-get-status", ({ roomCode }, callback) => {
    const session = getSession(roomCode);
    const activeStream = session ? session.activeStream || null : null;
    if (typeof callback === "function") {
        callback({ activeStream });
    } else {
        socket.emit("stream-status-response", { activeStream });
    }
});

socket.on("stream-join-viewer", ({ roomCode, username }) => {
    const session = getSession(roomCode);
    if (!session || !session.activeStream) return;

    io.to(session.activeStream.streamerId).emit("stream-viewer-joined", {
        viewerId: socket.id,
        username: username || "Guest"
    });
});

socket.on("stream-leave-viewer", ({ roomCode }) => {
    const session = getSession(roomCode);
    if (!session || !session.activeStream) return;

    io.to(session.activeStream.streamerId).emit("stream-viewer-left", {
        viewerId: socket.id
    });
});

socket.on("stream-offer", ({ targetId, offer }) => {
    io.to(targetId).emit("stream-offer", {
        from: socket.id,
        offer
    });
});

socket.on("stream-answer", ({ targetId, answer }) => {
    io.to(targetId).emit("stream-answer", {
        from: socket.id,
        answer
    });
});

socket.on("stream-ice-candidate", ({ targetId, candidate }) => {
    io.to(targetId).emit("stream-ice-candidate", {
        from: socket.id,
        candidate
    });
});

// ==========================================
// HOST KICK MEMBER
// ==========================================

socket.on("kick-member", ({ roomCode, targetSocketId, targetUsername }) => {
    const session = getSession(roomCode);
    if (!session) return;

    // Verify caller is host
    const isHost = Boolean(
        session.host === socket.id ||
        (session.hostUsername && socket.username === session.hostUsername) ||
        (session.members[0] && session.members[0].id === socket.id)
    );

    if (!isHost) {
        socket.emit("kick-error", { message: "Only the room host can kick members." });
        return;
    }

    // Cannot kick yourself
    if (socket.id === targetSocketId || (targetUsername && socket.username === targetUsername)) {
        return;
    }

    const targetMember = session.members.find(
        m => m.id === targetSocketId || (targetUsername && m.username === targetUsername)
    );

    if (!targetMember) return;

    // Remove from session members
    session.members = session.members.filter(
        m => m.id !== targetMember.id && m.username !== targetMember.username
    );

    // Notify the kicked target user
    io.to(targetMember.id).emit("kicked-from-room", {
        roomCode,
        reason: "You were removed from the room by the host."
    });

    // Make target leave socket room
    const targetSocket = io.sockets.sockets.get(targetMember.id);
    if (targetSocket) {
        targetSocket.leave(roomCode);
    }

    // Voice call cleanup for kicked user
    socket.to(roomCode).emit("voice-peer-left", {
        socketId: targetMember.id
    });

    // Stream cleanup if kicked user was the streamer
    if (session.activeStream && session.activeStream.streamerId === targetMember.id) {
        session.activeStream = null;
        io.to(roomCode).emit("stream-stopped");
    }

    // Broadcast updated public members list
    io.to(roomCode).emit("members-updated", getPublicMembersWithGames(session));

    // Post system announcement in room chat
    const kickNotice = {
        id: Date.now(),
        sender: "System",
        text: `👢 ${targetMember.username} was kicked from the room by the host.`,
        isSystem: true,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    if (!session.messages) session.messages = [];
    session.messages.push(kickNotice);
    io.to(roomCode).emit("chat-message", kickNotice);

    console.log(`[Kick] ${targetMember.username} kicked from ${roomCode} by host (${socket.id})`);
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

    // Stream cleanup on session leave
    if (session.activeStream) {
        if (session.activeStream.streamerId === socket.id) {
            session.activeStream = null;
            socket.to(roomCode).emit("stream-stopped");
        } else {
            io.to(session.activeStream.streamerId).emit("stream-viewer-left", {
                viewerId: socket.id
            });
        }
    }

    // Host migration on leave
    if (session.host === socket.id || (session.hostUsername && socket.username === session.hostUsername)) {
        if (session.members.length > 0) {
            session.host = session.members[0].id;
            session.hostUsername = session.members[0].username;
        } else {
            session.host = null;
            session.hostUsername = null;
        }
    }

    io.to(roomCode).emit(
        "members-updated",
        getPublicMembersWithGames(session)
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
            session.songTime = Number(time) || 0;
            session.songUpdatedAt = Date.now();
        }
        socket.to(roomCode).emit("song-paused", { time: Number(time) || 0 });
    });

    socket.on("resume-song", ({ roomCode, time }) => {
        const session = getSession(roomCode);
        if (session) {
            session.playing = true;
            session.songTime = Number(time) || 0;
            session.songUpdatedAt = Date.now();
        }
        socket.to(roomCode).emit("song-resumed", { time: Number(time) || 0 });
    });

    socket.on("seek-song", ({ roomCode, time }) => {
        const session = getSession(roomCode);
        if (session) {
            session.songTime = Number(time) || 0;
            session.songUpdatedAt = Date.now();
        }
        socket.to(roomCode).emit("song-seeked", { time: Number(time) || 0 });
    });

    socket.on("heartbeat-song", ({ roomCode, time }) => {
        const session = getSession(roomCode);
        if (!session) return;
        session.songTime = Number(time) || 0;
        session.songUpdatedAt = Date.now();
        socket.to(roomCode).emit("sync-song-heartbeat", { time: Number(time) || 0 });
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

            // Stream cleanup on disconnect
            if (session.activeStream) {
                if (session.activeStream.streamerId === socket.id) {
                    session.activeStream = null;
                    socket.to(code).emit("stream-stopped");
                } else {
                    io.to(session.activeStream.streamerId).emit("stream-viewer-left", {
                        viewerId: socket.id
                    });
                }
            }

            // Host migration on disconnect
            if (session.host === socket.id || (session.hostUsername && socket.username === session.hostUsername)) {
                if (session.members.length > 0) {
                    session.host = session.members[0].id;
                    session.hostUsername = session.members[0].username;
                } else {
                    session.host = null;
                    session.hostUsername = null;
                }
            }

            io.to(code).emit(
                "members-updated",
                getPublicMembersWithGames(session)
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