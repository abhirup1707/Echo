import "./MiniGames.css";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import GameCard from "../components/games/GameCard";

export default function MiniGames(){

const navigate=useNavigate();

useEffect(() => {

    const game = localStorage.getItem("activeGame");

    if (game === "scribble") {

        navigate("/games/scribble", {

            replace: true

        });

    }

}, []);

return(

<div className="games-page">

<h1>🎮 Mini Games</h1>

<div className="games-grid">

<GameCard

title="🎨 Scribble"

description="Draw and guess with your friends."

players="0"

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

available={false}

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