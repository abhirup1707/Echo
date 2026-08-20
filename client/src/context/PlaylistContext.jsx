import { createContext, useState, useEffect, useContext } from "react";
import socket from "../socket";
import { ProfileContext } from "./ProfileContext";

const PlaylistContext = createContext();

export function PlaylistProvider({ children }) {

    const { profile } = useContext(ProfileContext);

    const [playlists, setPlaylists] = useState(() => {
        const saved = localStorage.getItem("echo-playlists");
        return saved ? JSON.parse(saved) : [];
    });

    const [collabPlaylists, setCollabPlaylists] = useState([]);

    const [activeCollabCode, setActiveCollabCode] = useState("");


    useEffect(() => {
        localStorage.setItem(
            "echo-playlists",
            JSON.stringify(playlists)
        );
    }, [playlists]);


    // =====================================================
    // SOCKET LISTENERS FOR COLLAB PLAYLISTS
    // =====================================================

    useEffect(() => {

        function handlePlaylistUpdated(data) {
            setCollabPlaylists(prev => {
                const idx = prev.findIndex(
                    p => p.code === data.code
                );
                if (idx >= 0) {
                    const next = [...prev];
                    next[idx] = data;
                    return next;
                }
                return [...prev, data];
            });
        }

        function handlePlaylistCreated(data) {
            setCollabPlaylists(prev => {
                const exists = prev.some(
                    p => p.code === data.code
                );
                if (exists) return prev;
                return [...prev, data];
            });
        }

        function handlePlaylistDeleted(data) {
            setCollabPlaylists(prev =>
                prev.filter(p => p.code !== data.code)
            );
        }

        socket.on("playlist-updated", handlePlaylistUpdated);
        socket.on("playlist-created", handlePlaylistCreated);
        socket.on("playlist-deleted", handlePlaylistDeleted);

        socket.emit("load-collab-playlists", { username: profile.username });

        return () => {
            socket.off("playlist-updated", handlePlaylistUpdated);
            socket.off("playlist-created", handlePlaylistCreated);
            socket.off("playlist-deleted", handlePlaylistDeleted);
        };

    }, []);


    // =====================================================
    // PERSONAL PLAYLISTS (localStorage)
    // =====================================================

    function createPlaylist(name) {
        const newPlaylist = {
            id: `pl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            name: name.trim(),
            songs: [],
            createdAt: Date.now(),
            isCollab: false
        };
        setPlaylists(prev => [...prev, newPlaylist]);
        return newPlaylist;
    }


    function deletePlaylist(playlistId) {
        setPlaylists(prev =>
            prev.filter(p => p.id !== playlistId)
        );
    }


    function renamePlaylist(playlistId, newName) {
        setPlaylists(prev =>
            prev.map(p =>
                p.id === playlistId
                    ? { ...p, name: newName.trim() }
                    : p
            )
        );
    }


    function addSongToPlaylist(playlistId, song) {
        setPlaylists(prev =>
            prev.map(p => {
                if (p.id !== playlistId) return p;
                const exists = p.songs.some(
                    s => s.videoId === song.videoId
                );
                if (exists) return p;
                return {
                    ...p,
                    songs: [...p.songs, {
                        ...song,
                        addedAt: Date.now()
                    }]
                };
            })
        );
    }


    function removeSongFromPlaylist(playlistId, videoId) {
        setPlaylists(prev =>
            prev.map(p => {
                if (p.id !== playlistId) return p;
                return {
                    ...p,
                    songs: p.songs.filter(
                        s => s.videoId !== videoId
                    )
                };
            })
        );
    }


    // =====================================================
    // COLLAB PLAYLISTS (socket-backed)
    // =====================================================

    function createCollabPlaylist(name) {
        socket.emit("create-playlist", {
            name: name.trim(),
            username: profile.username
        });
    }


    function joinCollabPlaylist(code) {
        socket.emit("join-playlist", {
            code: code.trim().toUpperCase(),
            username: profile.username
        });
        setActiveCollabCode(code.trim().toUpperCase());
    }


    function leaveCollabPlaylist(code) {
        socket.emit("leave-playlist", {
            code,
            username: profile.username
        });
        if (activeCollabCode === code) {
            setActiveCollabCode("");
        }
    }


    function addSongToCollabPlaylist(code, song) {
        socket.emit("playlist-add-song", {
            code,
            song: {
                ...song,
                addedBy: profile.username,
                addedAt: Date.now()
            }
        });
    }


    function removeSongFromCollabPlaylist(code, videoId) {
        socket.emit("playlist-remove-song", {
            code,
            videoId
        });
    }


    function deleteCollabPlaylist(code) {
        socket.emit("delete-playlist", { code });
    }


    // =====================================================
    // UNIFIED HELPERS
    // =====================================================

    function getAllPlaylists() {
        return [
            ...playlists,
            ...collabPlaylists
        ];
    }

    function getPlaylistById(id) {
        return playlists.find(p => p.id === id)
            || collabPlaylists.find(p => p.code === id);
    }


    const value = {

        playlists,
        collabPlaylists,

        createPlaylist,
        deletePlaylist,
        renamePlaylist,
        addSongToPlaylist,
        removeSongFromPlaylist,

        createCollabPlaylist,
        joinCollabPlaylist,
        leaveCollabPlaylist,
        addSongToCollabPlaylist,
        removeSongFromCollabPlaylist,
        deleteCollabPlaylist,

        activeCollabCode,
        setActiveCollabCode,

        getAllPlaylists,
        getPlaylistById
    };

    return (
        <PlaylistContext.Provider value={value}>
            {children}
        </PlaylistContext.Provider>
    );

}

export default PlaylistContext;
