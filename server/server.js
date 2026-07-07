const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const upload = require("./middleware/upload");
const path = require("path");

const registerSessionHandlers = require("./socket/sessionHandlers");

const app = express();

app.use(cors({
    origin: true,
    credentials: true
}));
app.use(express.json());
app.use(

    "/uploads",

    express.static(

        path.join(__dirname, "uploads")

    )

);

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: true,
        credentials: true,
        methods: ["GET", "POST"]
    }
});

io.on("connection", (socket) => {
    registerSessionHandlers(io, socket);
});

const { getSession } = require("./rooms/SessionManager");

app.post(
    "/upload/:roomCode",
    upload.single("movie"),
    (req, res) => {

        if (!req.file) {

            return res.status(400).json({
                success: false,
                message: "No movie uploaded."
            });

        }

        const roomCode = req.params.roomCode;

        const videoUrl = `/uploads/${roomCode}/${req.file.filename}`;

        const session = getSession(roomCode);

        if (session) {

            session.currentMovie = {

                url: videoUrl,

                title: req.file.originalname

            };

            io.to(roomCode).emit(

                "movie-changed",

                session.currentMovie

            );

        }

        res.json({

            success: true,

            videoUrl

        });

    }
);

app.get("/", (req, res) => {
    res.send("Echo Backend Running");
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`🚀 Echo Backend Running on Port ${PORT}`);
});