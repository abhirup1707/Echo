import "./GameCard.css";

export default function GameCard({
    title,
    description,
    players,
    maxPlayers,
    available = true,
    onClick
}) {
    const isLive = Number(players) > 0;

    return (
        <div
            className={`game-card ${isLive ? "game-card--active" : ""}`}
            onClick={available ? onClick : null}
            role="button"
            tabIndex={available ? 0 : -1}
        >
            <div className="game-card-header">
                <h2>{title}</h2>
                {isLive ? (
                    <div className="game-live-pill" title="Players currently playing">
                        <span className="live-pulse-dot"></span>
                        <span>LIVE</span>
                    </div>
                ) : (
                    <span className="game-ready-pill">READY</span>
                )}
            </div>

            <p>{description}</p>

            <div className="game-footer">
                <span className="game-players-count">
                    <span className="player-emoji">👥</span>
                    <strong>{players}</strong>/{maxPlayers}
                </span>

                <button disabled={!available} className="game-play-btn">
                    {available ? (
                        <>
                            <span>Play</span>
                            <span className="btn-arrow">→</span>
                        </>
                    ) : (
                        "Coming Soon"
                    )}
                </button>
            </div>
        </div>
    );
}