export default function PlayerCard({

    scribbleRoom

}) {

    return (

        <div className="scribble-card">

            <h2>

                Players ({scribbleRoom?.players.length || 0})

            </h2>

            <div className="player-list">

                {

                    scribbleRoom?.players.map(player => (

                        <div

                            className="scribble-player"

                            key={player.id}

                        >

                            <div className="avatar">

                                {player.username[0].toUpperCase()}

                            </div>

                            <span>

                                {player.username}

                            </span>

                            {

                                player.id === scribbleRoom.host && (

                                    <strong>

                                        👑 Host

                                    </strong>

                                )

                            }

                        </div>

                    ))

                }

            </div>

        </div>

    );

}