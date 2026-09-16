import "./GameCard.css";

export default function GameCard({

title,
description,
players,
maxPlayers,
available,
onClick

}){

return(

<div

className="game-card"

onClick={available?onClick:null}

>

<h2>{title}</h2>

<p>{description}</p>

<div className="game-footer">

<span>

👥 {players}/{maxPlayers}

</span>

<button disabled={!available}>

{

available?

"Join":

"Coming Soon"

}

</button>

</div>

</div>

);

}