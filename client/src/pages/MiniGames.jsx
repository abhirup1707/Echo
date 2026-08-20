import "./MiniGames.css";
import {
    useContext,
    useEffect,
    useState
} from "react";
import {
    Navigate,
    useNavigate
} from "react-router-dom";
import GameCard from "../components/games/GameCard";
import socket from "../socket";
import {
    SessionContext
} from "../context/SessionContext";
import {
    useScribble
} from "../context/ScribbleContext";

export default function MiniGames(){

const navigate=useNavigate();

const {
    roomCode
} = useContext(SessionContext);

const {
    joined,
    scribbleRoom
} = useScribble();

const [scribblePlayerCount, setScribblePlayerCount] =
    useState(0);


useEffect(() => {

    if (!roomCode) {

        setScribblePlayerCount(0);

        return undefined;

    }


    function handleScribbleStatus(status) {

        if (status.roomCode !== roomCode) return;

        setScribblePlayerCount(
            status.playerCount
        );

    }


    socket.on(
        "scribble-status",
        handleScribbleStatus
    );

    socket.emit(
        "scribble-watch-status",
        { roomCode }
    );


    return () => {

        socket.emit(
            "scribble-unwatch-status",
            { roomCode }
        );

        socket.off(
            "scribble-status",
            handleScribbleStatus
        );

    };

}, [roomCode]);


if (joined && scribbleRoom) {

    return <Navigate to="/games/scribble" replace />;

}

return(

<div className="games-page">

<h1>🎮 Mini Games</h1>

<div className="games-grid">

<GameCard

title="🎨 Scribble"

description="Draw and guess with your friends."

players={scribblePlayerCount}

maxPlayers="20"

available={true}

onClick={()=>navigate("/games/scribble")}

/>

<GameCard

title="🃏 UNO"

description="Classic multiplayer card game."

players="0"

maxPlayers="8"

available={false}

/>

<GameCard

title="⭕ Tic Tac Toe"

description="2 Player battle."

players="0"

maxPlayers="2"

available={true}

onClick={()=>navigate("/games/tictactoe")}

/>

<GameCard

title="🎲 Ludo"

description="Play with four friends."

players="0"

maxPlayers="4"

available={false}

/>

<GameCard

title="♟ Chess"

description="Play Chess together."

players="0"

maxPlayers="2"

available={false}

/>

<GameCard

title="🐍 Snake & Ladder"

description="Race to the finish."

players="0"

maxPlayers="4"

available={false}

/>

</div>

</div>

);

}
