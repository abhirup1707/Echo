import { useContext, useEffect, useRef } from "react";
import { SessionContext } from "../../context/SessionContext";
import socket from "../../socket";

function MoviePlayer() {

    const { currentMovie, roomCode } = useContext(SessionContext);

    const videoRef = useRef(null);

    useEffect(() => {

        socket.on("play-movie", () => {

            if (videoRef.current) {

                videoRef.current.play();

            }

        });

        socket.on("pause-movie", () => {

    if(videoRef.current){

        videoRef.current.pause();

    }

});

        return () => {

            socket.off("play-movie");
            socket.off("pause-movie");

        };

    }, []);

    function handlePlay() {

        socket.emit("play-movie", {

            roomCode

        });

    }

    function handlePause() {

    socket.emit("pause-movie", {

        roomCode

    });

}

    // ✅ AFTER ALL HOOKS
    if (!currentMovie) return null;

    return (

        <div style={{ marginTop: "30px" }}>

            <h2>🎬 {currentMovie.title}</h2>

            <video

                ref={videoRef}

                controls

                width="100%"

                src={`${import.meta.env.VITE_API_URL}${currentMovie.url}`}

                onPlay={handlePlay}
                onPause={handlePause}
                style={{

                    borderRadius: "15px",

                    marginTop: "15px"

                }}

            />

        </div>

    );

}

export default MoviePlayer;