const {
    playlists,
    createPlaylist,
    getPlaylist,
    deletePlaylist,
    removeMember,
    addMember,
    addSong,
    removeSong,
    getPublicPlaylist
} = require("../rooms/PlaylistManager");

function registerPlaylistHandlers(io, socket) {

    // =====================================================
    // LOAD ALL COLLAB PLAYLISTS ON CONNECT
    // =====================================================

    socket.on("load-collab-playlists", ({ username }) => {

        Object.values(playlists).forEach(playlist => {

            const isMember = playlist.members.some(
                m => m.username === username
            );

            if (!isMember) return;

            socket.join(`playlist-${playlist.code}`);

            socket.emit(
                "playlist-updated",
                getPublicPlaylist(playlist)
            );

        });

    });


    // =====================================================
    // CREATE COLLAB PLAYLIST
    // =====================================================

    socket.on("create-playlist", ({ name, username }) => {

        const playlist = createPlaylist(
            name,
            username,
            socket.id
        );

        const publicPlaylist = getPublicPlaylist(playlist);

        socket.join(`playlist-${playlist.code}`);

        socket.emit(
            "playlist-created",
            publicPlaylist
        );

    });


    // =====================================================
    // JOIN COLLAB PLAYLIST
    // =====================================================

    socket.on("join-playlist", ({ code, username }) => {

        const playlist = getPlaylist(code);

        if (!playlist) {
            socket.emit("playlist-not-found");
            return;
        }

        addMember(code, socket.id, username);

        socket.join(`playlist-${code}`);

        const publicPlaylist = getPublicPlaylist(playlist);

        socket.emit(
            "playlist-updated",
            publicPlaylist
        );

        io.to(`playlist-${code}`).emit(
            "playlist-updated",
            publicPlaylist
        );

    });


    // =====================================================
    // LEAVE COLLAB PLAYLIST
    // =====================================================

    socket.on("leave-playlist", ({ code, username }) => {

        const playlist = getPlaylist(code);

        if (!playlist) return;

        removeMember(code, socket.id);

        socket.leave(`playlist-${code}`);

        io.to(`playlist-${code}`).emit(
            "playlist-updated",
            getPublicPlaylist(playlist)
        );

    });


    // =====================================================
    // ADD SONG TO COLLAB PLAYLIST
    // =====================================================

    socket.on("playlist-add-song", ({ code, song }) => {

        const playlist = getPlaylist(code);

        if (!playlist) return;

        addSong(code, song);

        io.to(`playlist-${code}`).emit(
            "playlist-updated",
            getPublicPlaylist(playlist)
        );

    });


    // =====================================================
    // REMOVE SONG FROM COLLAB PLAYLIST
    // =====================================================

    socket.on("playlist-remove-song", ({ code, videoId }) => {

        const playlist = getPlaylist(code);

        if (!playlist) return;

        removeSong(code, videoId);

        io.to(`playlist-${code}`).emit(
            "playlist-updated",
            getPublicPlaylist(playlist)
        );

    });


    // =====================================================
    // DELETE COLLAB PLAYLIST
    // =====================================================

    socket.on("delete-playlist", ({ code }) => {

        const playlist = getPlaylist(code);

        if (!playlist) return;

        io.to(`playlist-${code}`).emit(
            "playlist-deleted",
            { code }
        );

        deletePlaylist(code);

    });


    // =====================================================
    // DISCONNECT — just leave socket rooms, keep playlists
    // =====================================================

    socket.on("disconnect", () => {

        Object.values(playlists).forEach(playlist => {

            socket.leave(`playlist-${playlist.code}`);

        });

    });

}

module.exports = registerPlaylistHandlers;
