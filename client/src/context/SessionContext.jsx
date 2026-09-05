import { createContext, useContext, useEffect, useState } from "react";
import socket from "../socket";
import { MusicContext } from "./MusicContext";
import { ProfileContext } from "./ProfileContext";

export const SessionContext = createContext();

export default function SessionProvider({ children }) {

    const {
        playSong,
        pauseSong: localPause,
        resumeSong: localResume,
        stopSong: localStop,
        setSongSyncCommand,
        isPlaying
    } = useContext(MusicContext);

const {

    profile,

    queueSong,

    joinSession

} = useContext(ProfileContext);

    const [roomCode, setRoomCode] = useState("");

const [currentVideo, setCurrentVideo] = useState(null);
const [currentMovie,setCurrentMovie]=useState(null);
const [videoSyncCommand, setVideoSyncCommand] = useState(null);

    const [username, setUsername] = useState("");

    const [members, setMembers] = useState([]);

    const [queue, setQueue] = useState([]);
    
const [messages, setMessages] = useState([]);

    useEffect(() => {

        socket.on("song-changed", (song) => {

            console.log("Received song:", song.title);

            playSong(song);

        });

        socket.on("song-paused", ({ time }) => {
            console.log("Song paused at:", time);
            localPause();
            setSongSyncCommand({ type: "pause", time, id: Date.now() });
        });

        socket.on("song-resumed", ({ time }) => {
            console.log("Song resumed at:", time);
            localResume();
            setSongSyncCommand({ type: "resume", time, id: Date.now() });
        });

        socket.on("song-stopped", () => {
            console.log("Song stopped");
            localStop();
            setSongSyncCommand({ type: "stop", id: Date.now() });
        });

        socket.on("song-seeked", ({ time }) => {
            console.log("Song seeked to:", time);
            setSongSyncCommand({ type: "seek", time, id: Date.now() });
        });

        socket.on("video-changed", (video) => {
            console.log("Received video:", video.title);
            setCurrentVideo(video);
        });

        socket.on("video-paused", ({ time }) => {
            console.log("Video paused at:", time);
            setVideoSyncCommand({ type: "pause", time, id: Date.now() });
        });

        socket.on("video-resumed", ({ time }) => {
            console.log("Video resumed at:", time);
            setVideoSyncCommand({ type: "resume", time, id: Date.now() });
        });

        socket.on("video-seeked", ({ time }) => {
            console.log("Video seeked to:", time);
            setVideoSyncCommand({ type: "seek", time, id: Date.now() });
        });

        socket.on("video-stopped", () => {
            console.log("Video stopped");
            setCurrentVideo(null);
            setVideoSyncCommand({ type: "stop", id: Date.now() });
        });

        socket.on("movie-stopped", () => {
            console.log("Movie stopped");
            setCurrentMovie(null);
        });

        socket.on("members-updated", (members) => {

            setMembers(members);

        });

        socket.on("queue-updated", (queue) => {

            console.log("Queue Updated:", queue);

            setQueue(queue);

        });

        socket.on("chat-message", (message) => {

    setMessages(prev => [

        ...prev,

        message

    ]);

});

socket.on("chat-history", (history) => {

    setMessages(history);

});

socket.on("movie-changed",(movie)=>{

    console.log("Movie Received",movie);

    setCurrentMovie(movie);

});

        return () => {

            socket.off("song-changed");
            socket.off("song-paused");
            socket.off("song-resumed");
            socket.off("song-stopped");
            socket.off("song-seeked");
            socket.off("video-changed");
            socket.off("video-paused");
            socket.off("video-resumed");
            socket.off("video-seeked");
            socket.off("video-stopped");
            socket.off("movie-stopped");
            socket.off("movie-changed");
            socket.off("members-updated");
            socket.off("queue-updated");
            socket.off("chat-message");
            socket.off("chat-history");

        };

    }, []);

    function sendSong(song) {

        console.log("Sending song");

        if (roomCode === "") {

            playSong(song);

            return;

        }

        socket.emit("play-song", {

            roomCode,

            song

        });

    }

    function pauseSong(time = 0) {
        localPause();
        setSongSyncCommand({ type: "pause", time, id: Date.now() });
        if (roomCode !== "") {
            socket.emit("pause-song", { roomCode, time });
        }
    }

    function resumeSong(time = 0) {
        localResume();
        setSongSyncCommand({ type: "resume", time, id: Date.now() });
        if (roomCode !== "") {
            socket.emit("resume-song", { roomCode, time });
        }
    }

    function stopSong() {
        localStop();
        setSongSyncCommand({ type: "stop", id: Date.now() });
        if (roomCode !== "") {
            socket.emit("stop-song", { roomCode });
        }
    }

    function seekSong(time = 0) {
        setSongSyncCommand({ type: "seek", time, id: Date.now() });
        if (roomCode !== "") {
            socket.emit("seek-song", { roomCode, time });
        }
    }

function addToQueue(song, username) {

    queueSong();

    // Solo Mode
// Solo Mode
if (roomCode === "") {

    const queuedSong = {

        song,

        addedBy: {

            username

        },

        addedAt: Date.now()

    };

    setQueue(prev => [

        ...prev,

        queuedSong

    ]);

    return;

}

    // Room Mode
    socket.emit("add-to-queue", {

        roomCode,

        song,

        username

    });

}

function playNext() {

    // Solo Mode
    if (roomCode === "") {

        if (queue.length === 0) return;

        const nextSong = queue[0];

        playSong(nextSong.song);

        setQueue(prev => prev.slice(1));

        return;

    }

    // Room Mode
    socket.emit("play-next", {

        roomCode

    });

}

function sendVideo(video){
    setCurrentVideo(video);
    if(roomCode==="") return;
    socket.emit("play-video",{
        roomCode,
        video
    });
}

function pauseVideo(time = 0) {
    setVideoSyncCommand({ type: "pause", time, id: Date.now() });
    if (roomCode !== "") {
        socket.emit("pause-video", { roomCode, time });
    }
}

function resumeVideo(time = 0) {
    setVideoSyncCommand({ type: "resume", time, id: Date.now() });
    if (roomCode !== "") {
        socket.emit("resume-video", { roomCode, time });
    }
}

function stopVideo() {
    setCurrentVideo(null);
    setVideoSyncCommand({ type: "stop", id: Date.now() });
    if (roomCode !== "") {
        socket.emit("stop-video", { roomCode });
    }
}

function seekVideo(time = 0) {
    setVideoSyncCommand({ type: "seek", time, id: Date.now() });
    if (roomCode !== "") {
        socket.emit("seek-video", { roomCode, time });
    }
}

function stopMovie() {
    setCurrentMovie(null);
    if (roomCode !== "") {
        socket.emit("stop-movie", { roomCode });
    }
}

    

function sendMessage(text) {

    if (!text.trim()) return;

    const message = {
        id: Date.now(),
        username: profile.username,
        avatar: profile.avatar || "",
        message: text,
        time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
        })
    };

    // Solo Mode
    if (roomCode === "") {

        setMessages(prev => [

            ...prev,

            message

        ]);

        return;

    }

    socket.emit("send-message", {

        roomCode,

        message

    });

}

    // Call this whenever a room is successfully created or joined
// Call this whenever a room is successfully created or joined
function recordSession(room) {

    setMessages([]);

    setQueue([]);

    setCurrentVideo(null);

    setRoomCode(room);

    joinSession(room);

}

    return (

<SessionContext.Provider
value={{

    roomCode,

    setRoomCode: recordSession,

    username,

    setUsername,

    members,

    setMembers,

    queue,

    setQueue,

    currentVideo,

    setCurrentVideo,

  currentMovie,
setCurrentMovie,

    addToQueue,

    playNext,

    sendSong,
    pauseSong,
    resumeSong,
    stopSong,
    sendVideo,
    pauseVideo,
    resumeVideo,
    stopVideo,
    seekVideo,
    videoSyncCommand,
    stopMovie,

    messages,

sendMessage,

}}
>

            {children}

        </SessionContext.Provider>

    );

}