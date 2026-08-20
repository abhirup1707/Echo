const fs = require("fs");
const path = require("path");
const generateCode = require("../utils/generateCode");

const DATA_FILE = path.join(__dirname, "..", "data", "collab-playlists.json");

let playlists = {};

function loadPlaylists() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const raw = fs.readFileSync(DATA_FILE, "utf8");
            playlists = JSON.parse(raw);
        }
    } catch (err) {
        console.error("Failed to load collab playlists:", err.message);
        playlists = {};
    }
}

function savePlaylists() {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(playlists, null, 2));
    } catch (err) {
        console.error("Failed to save collab playlists:", err.message);
    }
}

loadPlaylists();

function createPlaylist(name, creatorUsername, creatorSocketId) {
    const code = generateCode();
    playlists[code] = {
        code,
        name,
        creator: creatorUsername,
        members: [{ id: creatorSocketId, username: creatorUsername }],
        songs: [],
        createdAt: new Date()
    };
    savePlaylists();
    return playlists[code];
}

function getPlaylist(code) {
    return playlists[code] || null;
}

function deletePlaylist(code) {
    delete playlists[code];
    savePlaylists();
}

function removeMember(code, socketId) {
    const playlist = playlists[code];
    if (!playlist) return;
    playlist.members = playlist.members.filter(m => m.id !== socketId);
    savePlaylists();
}

function addMember(code, socketId, username) {
    const playlist = playlists[code];
    if (!playlist) return;
    const alreadyMember = playlist.members.some(m => m.id === socketId);
    if (!alreadyMember) {
        playlist.members.push({ id: socketId, username });
    }
    savePlaylists();
}

function addSong(code, song) {
    const playlist = playlists[code];
    if (!playlist) return;
    const exists = playlist.songs.some(s => s.videoId === song.videoId);
    if (exists) return false;
    playlist.songs.push(song);
    savePlaylists();
    return true;
}

function removeSong(code, videoId) {
    const playlist = playlists[code];
    if (!playlist) return;
    playlist.songs = playlist.songs.filter(s => s.videoId !== videoId);
    savePlaylists();
}

function renamePlaylist(code, newName) {
    const playlist = playlists[code];
    if (!playlist) return;
    playlist.name = newName;
    savePlaylists();
}

function getPublicPlaylist(playlist) {
    return {
        code: playlist.code,
        name: playlist.name,
        creator: playlist.creator,
        members: playlist.members,
        songs: playlist.songs,
        createdAt: playlist.createdAt
    };
}

module.exports = {
    playlists,
    createPlaylist,
    getPlaylist,
    deletePlaylist,
    removeMember,
    addMember,
    addSong,
    removeSong,
    renamePlaylist,
    getPublicPlaylist
};
