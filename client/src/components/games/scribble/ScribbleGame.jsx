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

    const chatEndRef = useRef(null);


    const [color, setColor] =
        useState("#111827");

    const [brushSize, setBrushSize] =
        useState(5);

    /*
        Available tools:

        brush
        eraser
        fill
    */

    const [tool, setTool] =
        useState("brush");


    const [guess, setGuess] =
        useState("");


    const [timeLeft, setTimeLeft] =
        useState(
            scribbleRoom?.timeLeft || 150
        );


const [chooseTimeLeft, setChooseTimeLeft] =
    useState(
        scribbleRoom?.chooseTimeLeft ?? 0
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
    // CHOOSING TIME UPDATE
    // =====================================================

// =====================================================
// CHOOSING TIME UPDATE
// =====================================================

useEffect(() => {

    if (
        typeof scribbleRoom?.chooseTimeLeft === "number"
    ) {

        setChooseTimeLeft(
            scribbleRoom.chooseTimeLeft
        );

    }

}, [scribbleRoom?.chooseTimeLeft]);


    // =====================================================
    // DRAWING TIME UPDATE
    // =====================================================

    useEffect(() => {

        setTimeLeft(
            scribbleRoom?.timeLeft || 0
        );

    }, [scribbleRoom?.timeLeft]);


    // =====================================================
    // CHAT AUTO SCROLL
    // =====================================================

    useEffect(() => {

        chatEndRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "nearest"
        });

    }, [scribbleRoom?.chat?.length]);


    // =====================================================
    // SOCKET LISTENERS
    // =====================================================

    useEffect(() => {

        function handleRemoteStroke(stroke) {

            drawAction(stroke);

        }


        function handleRemoteFill(fill) {

            applyFill(fill);

        }


        function handleClearCanvas() {

            clearCanvasLocally();

        }


        function handleCanvasState(actions) {

            redrawCanvas(actions);

        }


        function handleTime(time) {

            setTimeLeft(time);

        }


        function handleChooseTime(time) {

            setChooseTimeLeft(time);

        }


        socket.on(
            "scribble-draw",
            handleRemoteStroke
        );

        socket.on(
            "scribble-fill",
            handleRemoteFill
        );

        socket.on(
            "scribble-clear-canvas",
            handleClearCanvas
        );

        socket.on(
            "scribble-canvas-state",
            handleCanvasState
        );

        socket.on(
            "scribble-time",
            handleTime
        );

        socket.on(
            "scribble-choose-time",
            handleChooseTime
        );


        return () => {

            socket.off(
                "scribble-draw",
                handleRemoteStroke
            );

            socket.off(
                "scribble-fill",
                handleRemoteFill
            );

            socket.off(
                "scribble-clear-canvas",
                handleClearCanvas
            );

            socket.off(
                "scribble-canvas-state",
                handleCanvasState
            );

            socket.off(
                "scribble-time",
                handleTime
            );

            socket.off(
                "scribble-choose-time",
                handleChooseTime
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

        redrawCanvas(
            scribbleRoom?.canvas || []
        );

    }, [
        scribbleRoom?.phase
    ]);


    // =====================================================
    // DRAWER CONTROLS DRAWING TIMER
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


    // =====================================================
    // DRAW ONE STROKE
    // =====================================================

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


    // =====================================================
    // DRAW ANY CANVAS ACTION
    // =====================================================

    function drawAction(action) {

        if (!action) return;


        if (action.type === "fill") {

            applyFill(action);

            return;

        }


        drawStroke(action);

    }


    // =====================================================
    // CLEAR CANVAS LOCALLY
    // =====================================================

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
    // REDRAW COMPLETE CANVAS HISTORY
    // =====================================================

    function redrawCanvas(actions) {

        clearCanvasLocally();


        if (!Array.isArray(actions)) return;


        actions.forEach(action => {

            drawAction(action);

        });

    }


    // =====================================================
    // HEX COLOR TO RGBA
    // =====================================================

    function hexToRGBA(hex) {

        const cleanHex =
            hex.replace("#", "");


        const value =
            parseInt(cleanHex, 16);


        return [

            (value >> 16) & 255,

            (value >> 8) & 255,

            value & 255,

            255

        ];

    }


    // =====================================================
    // FLOOD FILL
    // =====================================================

    function applyFill(fill) {

        const canvas =
            canvasRef.current;

        if (!canvas) return;


        const ctx =
            canvas.getContext(
                "2d",
                {
                    willReadFrequently: true
                }
            );


        const width =
            canvas.width;

        const height =
            canvas.height;


        const startX =
            Math.floor(fill.x);

        const startY =
            Math.floor(fill.y);


        if (
            startX < 0 ||
            startX >= width ||
            startY < 0 ||
            startY >= height
        ) {

            return;

        }


        const imageData =
            ctx.getImageData(
                0,
                0,
                width,
                height
            );


        const data =
            imageData.data;


        function getPixelIndex(x, y) {

            return (
                y * width + x
            ) * 4;

        }


        const startIndex =
            getPixelIndex(
                startX,
                startY
            );


        const targetColor = [

            data[startIndex],

            data[startIndex + 1],

            data[startIndex + 2],

            data[startIndex + 3]

        ];


        const fillColor =
            hexToRGBA(fill.color);


        if (
            targetColor[0] === fillColor[0] &&
            targetColor[1] === fillColor[1] &&
            targetColor[2] === fillColor[2] &&
            targetColor[3] === fillColor[3]
        ) {

            return;

        }


        function matchesTarget(index) {

            return (

                data[index] ===
                    targetColor[0] &&

                data[index + 1] ===
                    targetColor[1] &&

                data[index + 2] ===
                    targetColor[2] &&

                data[index + 3] ===
                    targetColor[3]

            );

        }


        function colorPixel(index) {

            data[index] =
                fillColor[0];

            data[index + 1] =
                fillColor[1];

            data[index + 2] =
                fillColor[2];

            data[index + 3] =
                255;

        }


        const stack = [
            [startX, startY]
        ];


        while (stack.length > 0) {

            const [x, y] =
                stack.pop();


            if (
                x < 0 ||
                x >= width ||
                y < 0 ||
                y >= height
            ) {

                continue;

            }


            const index =
                getPixelIndex(x, y);


            if (!matchesTarget(index)) {

                continue;

            }


            colorPixel(index);


            stack.push(
                [x + 1, y],
                [x - 1, y],
                [x, y + 1],
                [x, y - 1]
            );

        }


        ctx.putImageData(
            imageData,
            0,
            0
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


        if (tool === "fill") {

            const fill = {

                type: "fill",

                x: point.x,

                y: point.y,

                color

            };


            socket.emit(
                "scribble-fill",
                {

                    roomCode,

                    fill

                }
            );


            return;

        }


        isDrawingRef.current = true;

        lastPointRef.current = point;

    }


    function continueDrawing(event) {

        if (!isDrawer) return;

        if (!isDrawingRef.current) return;

        if (tool === "fill") return;


        event.preventDefault();


        const point =
            getCanvasPoint(event);


        const previous =
            lastPointRef.current;


        if (!point || !previous) return;


        const stroke = {

            type: "stroke",

            fromX: previous.x,

            fromY: previous.y,

            toX: point.x,

            toY: point.y,

            color,

            size:
                tool === "eraser"
                    ? brushSize * 3
                    : brushSize,

            eraser:
                tool === "eraser"

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


    function undoCanvas() {

        if (!isDrawer) return;


        socket.emit(
            "scribble-undo",
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


                    {/* FIXED 10 SECOND WORD CHOOSING TIMER */}

                    <div className="scribble-choose-timer">

                        ⏱ {chooseTimeLeft}s

                    </div>


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

                                    Choose one word before time runs out.

                                </p>


                                <div className="scribble-word-options">

                                    {

                                        (scribbleRoom.wordOptions || []).map(
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

                                    {scribbleRoom.currentWord || "Waiting..."}

                                </strong>

                            </>

                        ) : (

                            <strong>

                                {
                                    scribbleRoom.wordPattern ||
                                    "Waiting..."
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
                                                        tool !== "eraser"
                                                            ? "active"
                                                            : ""
                                                    }
                                                    style={{
                                                        background: item
                                                    }}
                                                    onClick={() => {

                                                        setColor(item);

                                                        if (
                                                            tool === "eraser"
                                                        ) {

                                                            setTool("brush");

                                                        }

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
                                        tool === "brush"
                                            ? "scribble-tool-btn active"
                                            : "scribble-tool-btn"
                                    }
                                    onClick={() =>
                                        setTool("brush")
                                    }
                                >

                                    🖌 Brush

                                </button>


                                <button
                                    className={
                                        tool === "eraser"
                                            ? "scribble-tool-btn active"
                                            : "scribble-tool-btn"
                                    }
                                    onClick={() =>
                                        setTool("eraser")
                                    }
                                >

                                    🧽 Eraser

                                </button>


                                <button
                                    className={
                                        tool === "fill"
                                            ? "scribble-tool-btn active"
                                            : "scribble-tool-btn"
                                    }
                                    onClick={() =>
                                        setTool("fill")
                                    }
                                >

                                    🪣 Fill

                                </button>


                                <button
                                    className="scribble-tool-btn"
                                    onClick={undoCanvas}
                                >

                                    ↩ Undo

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

                            (scribbleRoom.chat || []).map(
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


                        <div ref={chatEndRef} />

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