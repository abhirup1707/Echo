import { createContext, useContext, useEffect, useState } from "react";
import socket from "../socket";
import { MusicContext } from "./MusicContext";
import { ProfileContext } from "./ProfileContext";

export const SessionContext = createContext();

export default function SessionProvider({ children }) {

    const { playSong } = useContext(MusicContext);

const {

    profile,

    queueSong,

    joinSession

} = useContext(ProfileContext);

    const [roomCode, setRoomCode] = useState("");

const [currentVideo, setCurrentVideo] = useState(null);
const [currentMovie,setCurrentMovie]=useState(null);

    const [username, setUsername] = useState("");

    const [members, setMembers] = useState([]);

    const [queue, setQueue] = useState([]);
    
const [messages, setMessages] = useState([]);

    useEffect(() => {

        socket.on("song-changed", (song) => {

            console.log("Received song:", song.title);

            playSong(song);

        });

        socket.on("video-changed", (video) => {

    console.log("Received video:", video.title);

    setCurrentVideo(video);

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
             socket.off("video-changed");
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


    // Show instantly on your own screen
    setCurrentVideo(video);

    // If alone, stop here
    if(roomCode==="") return;

    // Otherwise notify everyone
    socket.emit("play-video",{

        roomCode,

        video

    });


}

    

function sendMessage(text) {

    if (!text.trim()) return;

    const message = {

        id: Date.now(),

        username: profile.username,

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

    sendVideo,

    

    messages,

sendMessage,

}}
>

            {children}

        </SessionContext.Provider>

    );

}