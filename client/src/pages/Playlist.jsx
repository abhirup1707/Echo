import { useContext, useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PlaylistContext from "../context/PlaylistContext";
import { SessionContext } from "../context/SessionContext";
import { ProfileContext } from "../context/ProfileContext";
import { MusicContext } from "../context/MusicContext";
import { searchSongs } from "../services/youtube";
import SongCard from "../components/music/SongCard";
import UserAvatar from "../components/common/UserAvatar";
import socket from "../socket";
import "./Playlist.css";

function Playlist() {

    const { id, code } = useParams();
    const navigate = useNavigate();

    const { profile } = useContext(ProfileContext);
    const { addToQueue } = useContext(SessionContext);
    const { playSong, recentSongs } = useContext(MusicContext);

    const {
        playlists,
        collabPlaylists,
        removeSongFromPlaylist,
        removeSongFromCollabPlaylist,
        addSongToPlaylist,
        addSongToCollabPlaylist,
        deletePlaylist,
        deleteCollabPlaylist,
        leaveCollabPlaylist,
        renamePlaylist,
        joinCollabPlaylist
    } = useContext(PlaylistContext);

    const isCollab = !!code;
    const isRecents = id === "recents";

    const playlist = isCollab
        ? collabPlaylists.find(p => p.code === code)
        : isRecents
            ? { id: "recents", name: "Recents", songs: recentSongs }
            : playlists.find(p => p.id === id);

    const [editing, setEditing] = useState(false);
    const [editName, setEditName] = useState("");
    const [copied, setCopied] = useState(false);
    const [linkCopied, setLinkCopied] = useState(false);
    const [joining, setJoining] = useState(false);
    const [showMembers, setShowMembers] = useState(false);

    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [showSearch, setShowSearch] = useState(false);
    const searchTimerRef = useRef(null);

    useEffect(() => {
        if (!showSearch || !searchQuery.trim()) {
            setSearchResults([]);
            return;
        }
        clearTimeout(searchTimerRef.current);
        searchTimerRef.current = setTimeout(async () => {
            const results = await searchSongs(searchQuery);
            setSearchResults(results);
        }, 500);
        return () => clearTimeout(searchTimerRef.current);
    }, [searchQuery, showSearch]);

    useEffect(() => {
        if (isCollab && !playlist && profile.username && !joining) {
            setJoining(true);
            joinCollabPlaylist(code);
        }
    }, [isCollab, playlist, profile.username]);

    if (isCollab && !playlist) {
        return (
            <div className="playlist-page">
                <div className="playlist-empty">
                    {joining ? (
                        <>
                            <h2>Joining playlist...</h2>
                            <p style={{ color: "#777" }}>Connecting to {code}</p>
                        </>
                    ) : (
                        <>
                            <h2>Playlist not found</h2>
                            <button onClick={() => navigate("/")}>
                                Go Home
                            </button>
                        </>
                    )}
                </div>
            </div>
        );
    }

    if (!isCollab && !playlist) {
        return (
            <div className="playlist-page">
                <div className="playlist-empty">
                    <h2>Playlist not found</h2>
                    <button onClick={() => navigate("/")}>
                        Go Home
                    </button>
                </div>
            </div>
        );
    }

    function handleRemoveSong(videoId) {
        if (isCollab) {
            removeSongFromCollabPlaylist(code, videoId);
        } else {
            removeSongFromPlaylist(playlist.id, videoId);
        }
    }

    function handleAddSong(song) {
        const songData = {
            title: song.snippet.title,
            artist: song.snippet.channelTitle,
            cover: song.snippet.thumbnails.high.url,
            videoId: song.id.videoId
        };
        if (isCollab) {
            addSongToCollabPlaylist(code, songData);
        } else {
            addSongToPlaylist(playlist.id, songData);
        }
    }

    function handleDelete() {
        const confirmed = window.confirm(
            `Delete "${playlist.name}"?`
        );
        if (!confirmed) return;
        if (isCollab) {
            deleteCollabPlaylist(code);
        } else {
            deletePlaylist(playlist.id);
        }
        navigate("/");
    }

    function handleRename() {
        if (!editName.trim()) return;
        renamePlaylist(playlist.id, editName);
        setEditing(false);
    }

    function handleCopyCode() {
        const text = code || playlist.code;
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    function handleCopyLink() {
        const url = `${window.location.origin}/playlist/collab/${code || playlist.code}`;
        navigator.clipboard.writeText(url);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
    }

    function handleLeave() {
        leaveCollabPlaylist(code);
        navigate("/");
    }


    return (

        <div className="playlist-page">

            {/* ── HEADER ── */}

            <div className="playlist-header">

                <button
                    className="playlist-back-btn"
                    onClick={() => navigate("/")}
                >
                    ← Back
                </button>

                <div className="playlist-header-info">

                    {editing ? (

                        <div className="playlist-rename-form">

                            <input
                                value={editName}
                                onChange={e => setEditName(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && handleRename()}
                                autoFocus
                            />

                            <button onClick={handleRename}>✓</button>

                            <button onClick={() => setEditing(false)}>✕</button>

                        </div>

                    ) : (

                        <h1 className="playlist-title">

                            {playlist.name}

                            {!isCollab && !isRecents && (
                                <button
                                    className="playlist-edit-name-btn"
                                    onClick={() => {
                                        setEditName(playlist.name);
                                        setEditing(true);
                                    }}
                                >
                                    ✏️
                                </button>
                            )}

                        </h1>

                    )}

                    <span className="playlist-meta">

                        {playlist.songs.length} song{playlist.songs.length !== 1 ? "s" : ""}

                        {isCollab && (
                            <>
                                {" · "}
                                <button
                                    className="playlist-code-btn"
                                    onClick={() => setShowMembers(true)}
                                >
                                    {playlist.members?.length || 0} member{(playlist.members?.length || 0) !== 1 ? "s" : ""}
                                </button>
                            </>
                        )}

                        {isCollab && (
                            <>
                                {" · "}
                                <button
                                    className="playlist-code-btn"
                                    onClick={handleCopyCode}
                                >
                                    {copied ? "Copied!" : `Code: ${code || playlist.code}`}
                                </button>
                                {" · "}
                                <button
                                    className="playlist-code-btn"
                                    onClick={handleCopyLink}
                                >
                                    {linkCopied ? "Link Copied!" : "🔗 Copy Invite Link"}
                                </button>
                            </>
                        )}

                    </span>

                </div>

                <div className="playlist-actions">

                    {!isRecents && (

                        <button
                            className="playlist-search-toggle-btn"
                            onClick={() => setShowSearch(!showSearch)}
                        >
                            {showSearch ? "✕ Close" : "🔍 Search to Add"}
                        </button>

                    )}

                    {!isCollab && !isRecents ? (
                        <button
                            className="playlist-delete-btn"
                            onClick={handleDelete}
                        >
                            🗑 Delete
                        </button>
                    ) : isCollab ? (
                        <button
                            className="playlist-leave-btn"
                            onClick={handleLeave}
                        >
                            Leave
                        </button>
                    ) : null}

                </div>

            </div>


            {/* ── SEARCH TO ADD ── */}

            {showSearch && (

                <div className="playlist-add-search">

                    <input
                        className="playlist-add-search-input"
                        placeholder="Search songs to add to this playlist..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        autoFocus
                    />

                    {searchResults.length > 0 && (

                        <div className="playlist-add-results">

                            {searchResults.map(song => {

                                const alreadyAdded = playlist.songs.some(
                                    s => s.videoId === song.id.videoId
                                );

                                return (

                                    <div
                                        className="playlist-add-result"
                                        key={song.id.videoId}
                                    >

                                        <img
                                            src={song.snippet.thumbnails.default.url}
                                            alt=""
                                            className="playlist-add-thumb"
                                        />

                                        <div className="playlist-add-info">

                                            <strong>{song.snippet.title}</strong>

                                            <span>{song.snippet.channelTitle}</span>

                                        </div>

                                        <button
                                            className={`playlist-add-btn ${alreadyAdded ? "added" : ""}`}
                                            onClick={() => !alreadyAdded && handleAddSong(song)}
                                            disabled={alreadyAdded}
                                        >
                                            {alreadyAdded ? "✓" : "＋"}
                                        </button>

                                    </div>

                                );

                            })}

                        </div>

                    )}

                </div>

            )}


            {/* ── SONG LIST ── */}

            {playlist.songs.length > 0 ? (

                <div className="playlist-grid">

                    {playlist.songs.map(song => (

                        <div
                            className="playlist-song-wrapper"
                            key={song.videoId}
                        >

                            <SongCard
                                song={song}
                                onPlay={playSong}
                                onQueue={(song) =>
                                    addToQueue(song, profile.username)
                                }
                            />

                            <button
                                className="playlist-remove-btn"
                                onClick={() => handleRemoveSong(song.videoId)}
                                title="Remove from playlist"
                            >
                                ✕
                            </button>

                        </div>

                    ))}

                </div>

            ) : !showSearch ? (

                <div className="playlist-empty-songs">

                    <p>No songs yet. Press "Search to Add" to find songs.</p>

                </div>

            ) : null}


            {/* ── MEMBERS OVERLAY ── */}

            {showMembers && isCollab && (
                <div
                    className="playlist-members-overlay"
                    onClick={() => setShowMembers(false)}
                >
                    <div
                        className="playlist-members-modal"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="playlist-members-header">
                            <h2>Members ({playlist.members?.length || 0})</h2>
                            <button onClick={() => setShowMembers(false)}>✕</button>
                        </div>
                        <div className="playlist-members-list">
                            {(playlist.members || []).map(member => (
                                <div className="playlist-member-item" key={member.id}>
                                    <UserAvatar
                                        avatar={member.avatar || (member.username === profile.username ? profile.avatar : "")}
                                        username={member.username}
                                        size={36}
                                    />
                                    <span>{member.username}</span>
                                    {member.id === socket.id && (
                                        <span className="playlist-member-you">You</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

        </div>

    );

}

export default Playlist;
