const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const registerSessionHandlers = require("./socket/sessionHandlers");

const app = express();

app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

io.on("connection", (socket) => {
    registerSessionHandlers(io, socket);
});

app.get("/", (req, res) => {
    res.send("Echo Backend Running");
});

server.listen(5000, () => {
    console.log("🚀 Echo Backend Running on Port 5000");
});