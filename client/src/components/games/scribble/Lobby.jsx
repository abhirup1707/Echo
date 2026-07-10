import PlayerCard from "./PlayerCard";
import Settings from "./Settings";

export default function Lobby({

    scribbleRoom,

    isHost,

    roomCode,

    maxRounds,
    setMaxRounds,

    drawTime,
    setDrawTime,

    wordChoices,
    setWordChoices,

    socket

}) {

    return (

        <div className="scribble-layout">

            <PlayerCard

                scribbleRoom={scribbleRoom}

            />

            <Settings

                scribbleRoom={scribbleRoom}

                isHost={isHost}

                roomCode={roomCode}

                maxRounds={maxRounds}
                setMaxRounds={setMaxRounds}

                drawTime={drawTime}
                setDrawTime={setDrawTime}

                wordChoices={wordChoices}
                setWordChoices={setWordChoices}

                socket={socket}

            />

        </div>

    );

}