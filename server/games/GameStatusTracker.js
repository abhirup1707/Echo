const { getRoom: getChessRoom } = require("./chess/ChessManager");
const { getRoom: getLudoRoom } = require("./ludo/LudoManager");
const { getRoom: getUnoRoom } = require("./uno/UnoManager");
const { getRoom: getTTTRoom } = require("./tictactoe/TicTacToeManager");
const { getRoom: getSLRoom } = require("./snakeandladder/SLManager");
const { getScribbleRoom } = require("./scribble/ScribbleManager");
const { getSession, getPublicMembers } = require("../rooms/SessionManager");

/**
 * Returns the game identifier that a user is actively participating in within roomCode.
 * Returns null if not in any game.
 */
function getMemberActiveGame(roomCode, socketId, username) {
    if (!roomCode) return null;

    // Chess
    const chess = getChessRoom(roomCode);
    if (chess && (
        (chess.players && chess.players.some(p => p.id === socketId || (username && p.username === username))) ||
        (chess.spectators && chess.spectators.some(s => s.id === socketId || (username && s.username === username)))
    )) {
        return "chess";
    }

    // Ludo
    const ludo = getLudoRoom(roomCode);
    if (ludo && (
        (ludo.players && ludo.players.some(p => p.id === socketId || (username && p.username === username))) ||
        (ludo.spectators && ludo.spectators.some(s => s.id === socketId || (username && s.username === username)))
    )) {
        return "ludo";
    }

    // UNO
    const uno = getUnoRoom(roomCode);
    if (uno && (
        (uno.players && uno.players.some(p => p.id === socketId || (username && p.username === username))) ||
        (uno.spectators && uno.spectators.some(s => s.id === socketId || (username && s.username === username)))
    )) {
        return "uno";
    }

    // TicTacToe
    const ttt = getTTTRoom(roomCode);
    if (ttt && (
        (ttt.players && ttt.players.some(p => p.id === socketId || (username && p.username === username))) ||
        (ttt.spectators && ttt.spectators.some(s => s.id === socketId || (username && s.username === username)))
    )) {
        return "tictactoe";
    }

    // Snake & Ladder
    const sl = getSLRoom(roomCode);
    if (sl && (
        (sl.players && sl.players.some(p => p.id === socketId || (username && p.username === username))) ||
        (sl.spectators && sl.spectators.some(s => s.id === socketId || (username && s.username === username)))
    )) {
        return "snakeandladder";
    }

    // Scribble
    const scribble = getScribbleRoom(roomCode);
    if (scribble && scribble.players && scribble.players.some(p => p.id === socketId || (username && p.username === username))) {
        return "scribble";
    }

    return null;
}

/**
 * Returns the current player count for each minigame in the roomCode session.
 */
function getMinigamesStatus(roomCode) {
    if (!roomCode) {
        return {
            roomCode: "",
            counts: { scribble: 0, uno: 0, tictactoe: 0, ludo: 0, chess: 0, snakeandladder: 0 }
        };
    }

    return {
        roomCode,
        counts: {
            scribble: getScribbleRoom(roomCode)?.players?.length || 0,
            uno: getUnoRoom(roomCode)?.players?.length || 0,
            tictactoe: getTTTRoom(roomCode)?.players?.length || 0,
            ludo: getLudoRoom(roomCode)?.players?.length || 0,
            chess: getChessRoom(roomCode)?.players?.length || 0,
            snakeandladder: getSLRoom(roomCode)?.players?.length || 0
        }
    };
}

/**
 * Returns the public members list for a session, augmented with each member's currentGame.
 */
function getPublicMembersWithGames(session) {
    if (!session || !session.members) return [];
    const baseMembers = getPublicMembers(session);
    return baseMembers.map(m => ({
        ...m,
        currentGame: getMemberActiveGame(session.code, m.id, m.username)
    }));
}

/**
 * Broadcasts both minigames-status and updated members to the roomCode socket channel.
 */
function notifyGameActivity(io, roomCode) {
    if (!io || !roomCode) return;

    const status = getMinigamesStatus(roomCode);
    io.to(roomCode).emit("minigames-status", status);
    io.to(`${roomCode}-minigames-status`).emit("minigames-status", status);

    const session = getSession(roomCode);
    if (session) {
        io.to(roomCode).emit("members-updated", getPublicMembersWithGames(session));
    }
}

module.exports = {
    getMemberActiveGame,
    getMinigamesStatus,
    getPublicMembersWithGames,
    notifyGameActivity
};
