import {
    useEffect,
    useRef,
    useState
} from "react";

import socket from "../../../socket";

import "./ScribbleGame.css";


const COLORS = [
    "#111827",
    "#ef4444",
    "#f97316",
    "#eab308",
    "#22c55e",
    "#06b6d4",
    "#3b82f6",
    "#8b5cf6",
    "#ec4899"
];


export default function ScribbleGame({

    roomCode,

    scribbleRoom

}) {

    const canvasRef = useRef(null);

    const isDrawingRef = useRef(false);

    const lastPointRef = useRef(null);

    const [color, setColor] =
        useState("#111827");

    const [brushSize, setBrushSize] =
        useState(5);

    const [eraser, setEraser] =
        useState(false);

    const [guess, setGuess] =
        useState("");

    const [timeLeft, setTimeLeft] =
        useState(
            scribbleRoom?.timeLeft || 150
        );


    const isDrawer =
        scribbleRoom?.drawer === socket.id;


    const drawer =
        scribbleRoom?.players?.find(
            player =>
                player.id ===
                scribbleRoom.drawer
        );


    // =====================================================
    // TIME UPDATE
    // =====================================================

    useEffect(() => {

        setTimeLeft(
            scribbleRoom?.timeLeft || 0
        );

    }, [scribbleRoom?.timeLeft]);


    // =====================================================
    // SOCKET LISTENERS
    // =====================================================

    useEffect(() => {

        function handleRemoteStroke(stroke) {

            drawStroke(stroke);

        }


        function handleClearCanvas() {

            clearCanvasLocally();

        }


        function handleTime(time) {

            setTimeLeft(time);

        }


        socket.on(
            "scribble-draw",
            handleRemoteStroke
        );

        socket.on(
            "scribble-clear-canvas",
            handleClearCanvas
        );

        socket.on(
            "scribble-time",
            handleTime
        );


        return () => {

            socket.off(
                "scribble-draw",
                handleRemoteStroke
            );

            socket.off(
                "scribble-clear-canvas",
                handleClearCanvas
            );

            socket.off(
                "scribble-time",
                handleTime
            );

        };

    }, []);


    // =====================================================
    // DRAW EXISTING CANVAS
    // =====================================================

    useEffect(() => {

        if (
            scribbleRoom?.phase !== "drawing"
        ) {
            return;
        }

        clearCanvasLocally();

        scribbleRoom?.canvas?.forEach(
            stroke => {

                drawStroke(stroke);

            }
        );

    }, [
        scribbleRoom?.phase
    ]);


    // =====================================================
    // DRAWER CONTROLS TIMER
    // =====================================================

    useEffect(() => {

        if (!isDrawer) return;

        if (
            scribbleRoom?.phase !== "drawing"
        ) {
            return;
        }

        const timer = setInterval(() => {

            socket.emit(
                "scribble-timer-tick",
                {
                    roomCode
                }
            );

        }, 1000);


        return () => {

            clearInterval(timer);

        };

    }, [
        isDrawer,
        roomCode,
        scribbleRoom?.phase
    ]);


    // =====================================================
    // CANVAS HELPERS
    // =====================================================

    function getCanvasPoint(event) {

        const canvas = canvasRef.current;

        if (!canvas) return null;

        const rect =
            canvas.getBoundingClientRect();


        let clientX;

        let clientY;


        if (event.touches) {

            clientX =
                event.touches[0].clientX;

            clientY =
                event.touches[0].clientY;

        } else {

            clientX = event.clientX;

            clientY = event.clientY;

        }


        return {

            x:
                (
                    (clientX - rect.left) /
                    rect.width
                ) * canvas.width,

            y:
                (
                    (clientY - rect.top) /
                    rect.height
                ) * canvas.height

        };

    }


    function drawStroke(stroke) {

        const canvas =
            canvasRef.current;

        if (!canvas) return;


        const ctx =
            canvas.getContext("2d");


        ctx.beginPath();

        ctx.moveTo(
            stroke.fromX,
            stroke.fromY
        );

        ctx.lineTo(
            stroke.toX,
            stroke.toY
        );

        ctx.strokeStyle =
            stroke.eraser
                ? "#ffffff"
                : stroke.color;

        ctx.lineWidth =
            stroke.size;

        ctx.lineCap = "round";

        ctx.lineJoin = "round";

        ctx.stroke();

    }


    function clearCanvasLocally() {

        const canvas =
            canvasRef.current;

        if (!canvas) return;

        const ctx =
            canvas.getContext("2d");

        ctx.clearRect(
            0,
            0,
            canvas.width,
            canvas.height
        );

        ctx.fillStyle = "#ffffff";

        ctx.fillRect(
            0,
            0,
            canvas.width,
            canvas.height
        );

    }


    // =====================================================
    // DRAW EVENTS
    // =====================================================

    function startDrawing(event) {

        if (!isDrawer) return;

        if (
            scribbleRoom?.phase !== "drawing"
        ) {
            return;
        }

        event.preventDefault();

        const point =
            getCanvasPoint(event);

        if (!point) return;

        isDrawingRef.current = true;

        lastPointRef.current = point;

    }


    function continueDrawing(event) {

        if (!isDrawer) return;

        if (!isDrawingRef.current) return;

        event.preventDefault();

        const point =
            getCanvasPoint(event);

        const previous =
            lastPointRef.current;

        if (!point || !previous) return;


        const stroke = {

            fromX: previous.x,

            fromY: previous.y,

            toX: point.x,

            toY: point.y,

            color,

            size: eraser
                ? brushSize * 3
                : brushSize,

            eraser

        };


        drawStroke(stroke);


        socket.emit(
            "scribble-draw",
            {

                roomCode,

                stroke

            }
        );


        lastPointRef.current = point;

    }


    function stopDrawing() {

        isDrawingRef.current = false;

        lastPointRef.current = null;

    }


    function clearCanvas() {

        if (!isDrawer) return;

        socket.emit(
            "scribble-clear-canvas",
            {
                roomCode
            }
        );

    }


    // =====================================================
    // SELECT WORD
    // =====================================================

    function selectWord(word) {

        socket.emit(
            "scribble-select-word",
            {

                roomCode,

                word

            }
        );

    }


    // =====================================================
    // SUBMIT GUESS
    // =====================================================

    function submitGuess(event) {

        event.preventDefault();

        if (!guess.trim()) return;

        socket.emit(
            "scribble-guess",
            {

                roomCode,

                guess: guess.trim()

            }
        );

        setGuess("");

    }


    // =====================================================
    // CHOOSING SCREEN
    // =====================================================

    if (
        scribbleRoom.phase === "choosing"
    ) {

        return (

            <div className="scribble-game-shell">

                <div className="scribble-choosing-card">

                    {

                        isDrawer ? (

                            <>

                                <div className="scribble-big-icon">

                                    🎨

                                </div>

                                <h1>

                                    Pick a word to draw!

                                </h1>

                                <p>

                                    Choose one word and start drawing.

                                </p>


                                <div className="scribble-word-options">

                                    {

                                        scribbleRoom.wordOptions.map(
                                            word => (

                                                <button
                                                    key={word}
                                                    onClick={() =>
                                                        selectWord(word)
                                                    }
                                                >

                                                    {word}

                                                </button>

                                            )
                                        )

                                    }

                                </div>

                            </>

                        ) : (

                            <>

                                <div className="scribble-waiting-animation">

                                    ✏️

                                </div>

                                <h1>

                                    {drawer?.username || "The drawer"} is choosing a word...

                                </h1>

                                <p>

                                    Get ready to guess!

                                </p>

                            </>

                        )

                    }

                </div>

            </div>

        );

    }


    // =====================================================
    // FINISHED SCREEN
    // =====================================================

    if (
        scribbleRoom.phase === "finished"
    ) {

        const leaderboard = [
            ...scribbleRoom.players
        ].sort(
            (a, b) =>
                (
                    scribbleRoom.scores[b.id] || 0
                ) -
                (
                    scribbleRoom.scores[a.id] || 0
                )
        );


        return (

            <div className="scribble-game-shell">

                <div className="scribble-finished-card">

                    <div className="scribble-big-icon">

                        🏆

                    </div>

                    <h1>

                        Game Finished!

                    </h1>

                    <div className="scribble-final-leaderboard">

                        {

                            leaderboard.map(
                                (player, index) => (

                                    <div
                                        className="scribble-final-player"
                                        key={player.id}
                                    >

                                        <span>

                                            {
                                                index === 0
                                                    ? "🥇"
                                                    : index === 1
                                                        ? "🥈"
                                                        : index === 2
                                                            ? "🥉"
                                                            : `#${index + 1}`
                                            }

                                        </span>

                                        <strong>

                                            {player.username}

                                        </strong>

                                        <b>

                                            {
                                                scribbleRoom.scores[
                                                    player.id
                                                ] || 0
                                            } pts

                                        </b>

                                    </div>

                                )
                            )

                        }

                    </div>


                    {
                        scribbleRoom.host === socket.id && (

                            <button
                                className="scribble-play-again-btn"
                                onClick={() => {

                                    socket.emit(
                                        "scribble-play-again",
                                        {
                                            roomCode
                                        }
                                    );

                                }}
                            >

                                🔄 Play Again

                            </button>

                        )
                    }

                </div>

            </div>

        );

    }


    // =====================================================
    // MAIN DRAWING / REVEAL SCREEN
    // =====================================================

    const hasGuessed =
        scribbleRoom.correctGuessers.includes(
            socket.id
        );


    return (

        <div className="scribble-game-shell">

            <div className="scribble-game-topbar">

                <div>

                    <span>

                        Round

                    </span>

                    <strong>

                        {scribbleRoom.round}/{scribbleRoom.maxRounds}

                    </strong>

                </div>


                <div className="scribble-word-display">

                    {

                        isDrawer ? (

                            <>

                                Word:{" "}

                                <strong>

                                    {scribbleRoom.currentWord}

                                </strong>

                            </>

                        ) : (

                            <strong>

                                {
                                    scribbleRoom.currentWord
                                        ? scribbleRoom.currentWord
                                            .split("")
                                            .map(() => "_")
                                            .join(" ")
                                        : "Waiting..."
                                }

                            </strong>

                        )

                    }

                </div>


                <div className="scribble-timer">

                    ⏱ {timeLeft}s

                </div>

            </div>


            <div className="scribble-main-grid">

                {/* PLAYERS */}

                <aside className="scribble-players-panel">

                    <h2>

                        👥 Players

                    </h2>


                    {

                        [...scribbleRoom.players]
                            .sort(
                                (a, b) =>
                                    (
                                        scribbleRoom.scores[b.id] || 0
                                    ) -
                                    (
                                        scribbleRoom.scores[a.id] || 0
                                    )
                            )
                            .map(player => {

                                const playerIsDrawer =
                                    player.id ===
                                    scribbleRoom.drawer;

                                const playerGuessed =
                                    scribbleRoom.correctGuessers.includes(
                                        player.id
                                    );


                                return (

                                    <div
                                        className="scribble-score-player"
                                        key={player.id}
                                    >

                                        <div className="scribble-player-avatar">

                                            {
                                                player.username
                                                    .charAt(0)
                                                    .toUpperCase()
                                            }

                                        </div>


                                        <div className="scribble-player-details">

                                            <strong>

                                                {player.username}

                                            </strong>

                                            <span>

                                                {
                                                    scribbleRoom.scores[
                                                        player.id
                                                    ] || 0
                                                } pts

                                            </span>

                                        </div>


                                        {
                                            playerIsDrawer && (

                                                <span>

                                                    ✏️

                                                </span>

                                            )
                                        }


                                        {
                                            playerGuessed && (

                                                <span>

                                                    ✅

                                                </span>

                                            )
                                        }

                                    </div>

                                );

                            })

                    }

                </aside>


                {/* CANVAS */}

                <main className="scribble-canvas-section">

                    {
                        scribbleRoom.phase === "reveal" && (

                            <div className="scribble-reveal-banner">

                                The word was{" "}

                                <strong>

                                    {scribbleRoom.currentWord}

                                </strong>

                            </div>

                        )
                    }


                    <canvas
                        ref={canvasRef}
                        width={900}
                        height={600}
                        className={
                            isDrawer
                                ? "scribble-canvas drawer"
                                : "scribble-canvas"
                        }
                        onMouseDown={startDrawing}
                        onMouseMove={continueDrawing}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={continueDrawing}
                        onTouchEnd={stopDrawing}
                    />


                    {
                        isDrawer &&
                        scribbleRoom.phase === "drawing" && (

                            <div className="scribble-toolbar">

                                <div className="scribble-colors">

                                    {

                                        COLORS.map(
                                            item => (

                                                <button
                                                    key={item}
                                                    className={
                                                        color === item &&
                                                        !eraser
                                                            ? "active"
                                                            : ""
                                                    }
                                                    style={{
                                                        background: item
                                                    }}
                                                    onClick={() => {

                                                        setColor(item);

                                                        setEraser(false);

                                                    }}
                                                />

                                            )
                                        )

                                    }

                                </div>


                                <div className="scribble-brush-control">

                                    <span>

                                        🖌️

                                    </span>

                                    <input
                                        type="range"
                                        min="2"
                                        max="30"
                                        value={brushSize}
                                        onChange={(event) =>
                                            setBrushSize(
                                                Number(
                                                    event.target.value
                                                )
                                            )
                                        }
                                    />

                                </div>


                                <button
                                    className={
                                        eraser
                                            ? "scribble-tool-btn active"
                                            : "scribble-tool-btn"
                                    }
                                    onClick={() =>
                                        setEraser(
                                            current => !current
                                        )
                                    }
                                >

                                    🧽 Eraser

                                </button>


                                <button
                                    className="scribble-tool-btn danger"
                                    onClick={clearCanvas}
                                >

                                    🗑 Clear

                                </button>

                            </div>

                        )
                    }

                </main>


                {/* CHAT */}

                <aside className="scribble-chat-panel">

                    <h2>

                        💬 Guesses

                    </h2>


                    <div className="scribble-chat-messages">

                        {

                            scribbleRoom.chat.map(
                                message => (

                                    <div
                                        className={
                                            `scribble-message ${message.type}`
                                        }
                                        key={message.id}
                                    >

                                        {
                                            message.type !== "system" && (

                                                <strong>

                                                    {message.author}

                                                </strong>

                                            )
                                        }

                                        <span>

                                            {message.text}

                                        </span>

                                    </div>

                                )
                            )

                        }

                    </div>


                    {
                        !isDrawer &&
                        !hasGuessed &&
                        scribbleRoom.phase === "drawing" && (

                            <form
                                className="scribble-guess-form"
                                onSubmit={submitGuess}
                            >

                                <input
                                    value={guess}
                                    onChange={(event) =>
                                        setGuess(
                                            event.target.value
                                        )
                                    }
                                    placeholder="Type your guess..."
                                    autoComplete="off"
                                />

                                <button type="submit">

                                    ➤

                                </button>

                            </form>

                        )
                    }


                    {
                        hasGuessed && (

                            <div className="scribble-guessed-message">

                                ✅ You guessed correctly!

                            </div>

                        )
                    }


                    {
                        isDrawer && (

                            <div className="scribble-drawer-message">

                                ✏️ You're drawing!

                            </div>

                        )
                    }

                </aside>

            </div>

        </div>

    );

}