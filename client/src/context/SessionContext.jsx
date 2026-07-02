import { createContext, useContext, useEffect, useState } from "react";
import socket from "../socket";
import { MusicContext } from "./MusicContext";

export const SessionContext = createContext();

export default function SessionProvider({ children }) {

    const { playSong } = useContext(MusicContext);

    const [roomCode, setRoomCode] = useState("");
const [username,setUsername]=useState("");
    const [members, setMembers] = useState([]);
const [queue, setQueue] = useState([]);
    useEffect(() => {

        socket.on("song-changed", (song) => {

            console.log("Received song:", song.title);

            playSong(song);

        });

        socket.on("members-updated", (members) => {

            setMembers(members);

        });
socket.on("queue-updated", (queue) => {

    console.log("Queue Updated:", queue);

    setQueue(queue);

});
        return () => {

            socket.off("song-changed");

            socket.off("members-updated");
socket.off("queue-updated");
        };

    }, []);

    function sendSong(song){

        console.log("Sending song");
        console.log(roomCode);

        if(roomCode===""){

            playSong(song);

            return;

        }

        socket.emit("play-song",{

            roomCode,

            song

        });

    }
function addToQueue(song, username) {

    if (roomCode === "") return;

    socket.emit("add-to-queue", {

        roomCode,

        song,

        username

    });

}

function playNext() {

    if (roomCode === "") return;

    socket.emit("play-next", {

        roomCode

    });

}
    return(

        <SessionContext.Provider
value={{

    roomCode,

    setRoomCode,

    username,

    setUsername,

    members,

    queue,

    addToQueue,

    playNext,

    sendSong

}}
        >
            {children}
        </SessionContext.Provider>

    );
}