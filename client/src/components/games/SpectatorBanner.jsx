import React from "react";
import "./SpectatorBanner.css";

export default function SpectatorBanner({ gameTitle = "Match", isFinished = false, onExit }) {
    return (
        <div className="spectator-banner-container">
            <div className="spectator-banner-badge">
                <span className="spectator-live-pulse" />
                <span className="spectator-badge-text">👀 SPECTATING</span>
            </div>
            
            <div className="spectator-banner-info">
                <div className="spectator-banner-title">
                    {isFinished ? (
                        <span className="spectator-status finished">🏆 {gameTitle} Finished!</span>
                    ) : (
                        <span className="spectator-status live">Ongoing {gameTitle} in Progress</span>
                    )}
                </div>
                <div className="spectator-banner-subtitle">
                    <span className="spectator-spinner" />
                    {isFinished ? (
                        <span>Auto-entering Start Game page for next round...</span>
                    ) : (
                        <span>Waiting sign: Entering Start Game lobby once this match ends</span>
                    )}
                </div>
            </div>

            {onExit && (
                <button className="spectator-exit-btn" onClick={onExit} title="Leave spectator mode">
                    Exit Game
                </button>
            )}
        </div>
    );
}
