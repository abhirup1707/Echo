import "./MiniGames.css";
import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import GameCard from "../components/games/GameCard";
import socket from "../socket";
import { SessionContext } from "../context/SessionContext";

export default function MiniGames() {
    const navigate = useNavigate();
    const { roomCode } = useContext(SessionContext);
    const [counts, setCounts] = useState({
        scribble: 0,
        uno: 0,
        tictactoe: 0,
        ludo: 0,
        chess: 0,
        snakeandladder: 0
    });

    // Auto-resume active minigame if user navigates back to /games without leaving
    useEffect(() => {
        const activeGame = sessionStorage.getItem("echo_active_game");
        if (activeGame && activeGame !== "/games") {
            navigate(activeGame, { replace: true });
        }
    }, [navigate]);

    useEffect(() => {
        if (!roomCode) {
            setCounts({
                scribble: 0,
                uno: 0,
                tictactoe: 0,
                ludo: 0,
                chess: 0,
                snakeandladder: 0
            });
            return undefined;
        }

        function handleMinigamesStatus(data) {
            if (data?.roomCode && data.roomCode !== roomCode) return;
            if (data?.counts) {
                setCounts(prev => ({ ...prev, ...data.counts }));
            }
        }

        function handleScribbleStatus(status) {
            if (status.roomCode !== roomCode) return;
            setCounts(prev => ({ ...prev, scribble: status.playerCount || 0 }));
        }

        socket.on("minigames-status", handleMinigamesStatus);
        socket.on("scribble-status", handleScribbleStatus);

        socket.emit("get-minigames-status", { roomCode });
        socket.emit("scribble-watch-status", { roomCode });

        return () => {
            socket.emit("scribble-unwatch-status", { roomCode });
            socket.off("minigames-status", handleMinigamesStatus);
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
                    players={counts.scribble}
                    maxPlayers="20"
                    available={true}
                    onClick={() => navigate("/games/scribble")}
                />

                <GameCard
                    title="🎴 UNO"
                    description="Official card battle with skips, reverses, wilds & draws."
                    players={counts.uno}
                    maxPlayers="15"
                    available={true}
                    onClick={() => navigate("/games/uno")}
                />

                <GameCard
                    title="⭕ Tic Tac Toe"
                    description="2 Player battle."
                    players={counts.tictactoe}
                    maxPlayers="2"
                    available={true}
                    onClick={() => navigate("/games/tictactoe")}
                />

                <GameCard
                    title="🎲 Ludo"
                    description="Classic 4-player token race to the home arena."
                    players={counts.ludo}
                    maxPlayers="4"
                    available={true}
                    onClick={() => navigate("/games/ludo")}
                />

                <GameCard
                    title="♟️ Chess"
                    description="Grandmaster FIDE chess match with checkmate detection."
                    players={counts.chess}
                    maxPlayers="2"
                    available={true}
                    onClick={() => navigate("/games/chess")}
                />

                <GameCard
                    title="🐍 Snake & Ladder"
                    description="Race to 100 with friends."
                    players={counts.snakeandladder}
                    maxPlayers="6"
                    available={true}
                    onClick={() => navigate("/games/snakeandladder")}
                />
            </div>
        </div>
    );
}
