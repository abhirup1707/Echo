import "./MiniGames.css";
import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import GameCard from "../components/games/GameCard";
import socket from "../socket";
import { SessionContext } from "../context/SessionContext";
import { useScribble } from "../context/ScribbleContext";

export default function MiniGames() {
    const navigate = useNavigate();
    const { roomCode } = useContext(SessionContext);
    const { joined, scribbleRoom } = useScribble();
    const [scribblePlayerCount, setScribblePlayerCount] = useState(0);

    // Auto-resume active minigame if user navigates back to /games without leaving
    useEffect(() => {
        const activeGame = sessionStorage.getItem("echo_active_game");
        if (activeGame && activeGame !== "/games") {
            navigate(activeGame, { replace: true });
        }
    }, [navigate]);

    useEffect(() => {
        if (!roomCode) {
            setScribblePlayerCount(0);
            return undefined;
        }

        function handleScribbleStatus(status) {
            if (status.roomCode !== roomCode) return;
            setScribblePlayerCount(status.playerCount);
        }

        socket.on("scribble-status", handleScribbleStatus);
        socket.emit("scribble-watch-status", { roomCode });

        return () => {
            socket.emit("scribble-unwatch-status", { roomCode });
            socket.off("scribble-status", handleScribbleStatus);
        };
    }, [roomCode]);

    return (
        <div className="games-page">
            <h1>🎮 Mini Games</h1>

            <div className="games-grid">
                <GameCard
                    title="🎨 Scribble"
                    description="Draw and guess with your friends."
                    players={scribblePlayerCount}
                    maxPlayers="20"
                    available={true}
                    onClick={() => navigate("/games/scribble")}
                />

                <GameCard
                    title="🎴 UNO"
                    description="Official card battle with skips, reverses, wilds & draws."
                    players="0"
                    maxPlayers="15"
                    available={true}
                    onClick={() => navigate("/games/uno")}
                />

                <GameCard
                    title="⭕ Tic Tac Toe"
                    description="2 Player battle."
                    players="0"
                    maxPlayers="2"
                    available={true}
                    onClick={() => navigate("/games/tictactoe")}
                />

                <GameCard
                    title="🎲 Ludo"
                    description="Classic 4-player token race to the home arena."
                    players="0"
                    maxPlayers="4"
                    available={true}
                    onClick={() => navigate("/games/ludo")}
                />

                <GameCard
                    title="♟️ Chess"
                    description="Grandmaster FIDE chess match with checkmate detection."
                    players="0"
                    maxPlayers="2"
                    available={true}
                    onClick={() => navigate("/games/chess")}
                />

                <GameCard
                    title="🐍 Snake & Ladder"
                    description="Race to 100 with friends."
                    players="0"
                    maxPlayers="6"
                    available={true}
                    onClick={() => navigate("/games/snakeandladder")}
                />
            </div>
        </div>
    );
}
