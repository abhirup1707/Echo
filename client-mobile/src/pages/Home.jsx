import "./Home.css";
import { SessionContext } from "../context/SessionContext";
import { ProfileContext } from "../context/ProfileContext";
import PlaylistContext from "../context/PlaylistContext";
import { useContext, useState } from "react";
import { MusicContext } from "../context/MusicContext";
import { useNavigate } from "react-router-dom";

function Home() {

    const { addToQueue, sendSong, clearQueue } = useContext(SessionContext);
    const { profile } = useContext(ProfileContext);
    const { recentSongs, playSong } = useContext(MusicContext);

    const {
        playlists,
        collabPlaylists,
        createPlaylist,
        createCollabPlaylist,
        joinCollabPlaylist
    } = useContext(PlaylistContext);

    const navigate = useNavigate();

    const [showModal, setShowModal] = useState(false);
    const [modalTab, setModalTab] = useState("create");
    const [playlistName, setPlaylistName] = useState("");
    const [joinCode, setJoinCode] = useState("");


    function handleCreate() {
        if (!playlistName.trim()) return;
        createPlaylist(playlistName);
        setPlaylistName("");
        setShowModal(false);
    }


    function handleCreateCollab() {
        if (!playlistName.trim()) return;
        createCollabPlaylist(playlistName);
        setPlaylistName("");
        setShowModal(false);
    }


    function handleJoin() {
        if (!joinCode.trim()) return;
        joinCollabPlaylist(joinCode);
        setJoinCode("");
        setShowModal(false);
    }


    function playPlaylist(songs) {
        if (!songs || songs.length === 0) return;
        if (typeof clearQueue === "function") {
            clearQueue();
        }
        sendSong(songs[0]);
        playSong(songs[0]);
        for (let i = 1; i < songs.length; i++) {
            addToQueue(songs[i], profile.username || "Home");
        }
    }


    const greeting = (() => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good morning";
        if (hour < 17) return "Good afternoon";
        return "Good evening";
    })();

    return (
        <div className="home-page">
            {/* ── HERO BANNER ── */}
            <div className="home-hero-banner">
                <div className="home-hero-content">
                    <div className="home-hero-badge">
                        <span className="badge-pulse-dot" />
                        <span>PREMIUM AUDIO EXPERIENCE</span>
                    </div>
                    <h1 className="home-title">
                        {greeting}, <span className="home-username">{profile.username || "Friend"}</span>
                    </h1>
                    <p className="home-hero-subtitle">
                        Synchronized listening, collaborative sessions, and non-stop music.
                    </p>
                    <div className="home-quick-actions">
                        <button className="home-quick-btn dj-btn" onClick={() => navigate("/dj")}>
                            ✨ AI DJ Studio
                        </button>
                        <button className="home-quick-btn video-btn" onClick={() => navigate("/videos")}>
                            🎬 Watch Together
                        </button>
                        <button className="home-quick-btn games-btn" onClick={() => navigate("/games")}>
                            🎮 Mini Games
                        </button>
                        <button className="home-quick-btn add-btn" onClick={() => setShowModal(true)}>
                            + New Playlist
                        </button>
                    </div>
                </div>
            </div>

            {/* ── YOUR PLAYLISTS ── */}

            <section className="home-section">

                <h2 className="home-section-title">

                    Your Playlists

                </h2>

                <div className="home-playlist-grid">

                    {/* Recents card — always first if songs exist */}
                    {recentSongs.length > 0 && (

                        <div
                            className="home-playlist-card recents"
                            onClick={() => navigate("/playlist/recents")}
                        >

                            <div className="home-playlist-covers">

                                {recentSongs.slice(0, 4).map((song, i) => (

                                    <img
                                        key={i}
                                        src={song.cover}
                                        alt=""
                                        className="home-playlist-thumb"
                                    />

                                ))}

                            </div>

                            <div className="home-playlist-info">

                                <strong>Recents</strong>

                                <span>
                                    {recentSongs.length} song{recentSongs.length !== 1 ? "s" : ""}
                                </span>

                            </div>

                            <button
                                className="home-playlist-play-btn"
                                onClick={e => {
                                    e.stopPropagation();
                                    playPlaylist(recentSongs);
                                }}
                            >
                                ▶
                            </button>

                        </div>

                    )}

                    {playlists.map(playlist => (

                        <div
                            className="home-playlist-card"
                            key={playlist.id}
                            onClick={() =>
                                navigate(`/playlist/${playlist.id}`)
                            }
                        >

                            <div className="home-playlist-covers">

                                {playlist.songs
                                    .slice(0, 4)
                                    .map((song, i) => (

                                        <img
                                            key={i}
                                            src={song.cover}
                                            alt=""
                                            className="home-playlist-thumb"
                                        />

                                    ))}

                                {playlist.songs.length === 0 && (

                                    <div className="home-playlist-empty-icon">
                                        🎵
                                    </div>

                                )}

                            </div>

                            <div className="home-playlist-info">

                                <strong>{playlist.name}</strong>

                                <span>
                                    {playlist.songs.length} song{playlist.songs.length !== 1 ? "s" : ""}
                                </span>

                            </div>

                            {playlist.songs.length > 0 && (

                                <button
                                    className="home-playlist-play-btn"
                                    onClick={e => {
                                        e.stopPropagation();
                                        playPlaylist(playlist.songs);
                                    }}
                                >
                                    ▶
                                </button>

                            )}

                        </div>

                    ))}

                </div>

            </section>


            {/* ── COLLAB PLAYLISTS ── */}

            {collabPlaylists.length > 0 && (

                <section className="home-section">

                    <h2 className="home-section-title">

                        Collaborative Playlists

                    </h2>

                    <div className="home-playlist-grid">

                        {collabPlaylists.map(playlist => (

                            <div
                                className="home-playlist-card collab"
                                key={playlist.code}
                                onClick={() =>
                                    navigate(`/playlist/collab/${playlist.code}`)
                                }
                            >

                                <div className="home-playlist-covers">

                                    {playlist.songs
                                        .slice(0, 4)
                                        .map((song, i) => (

                                            <img
                                                key={i}
                                                src={song.cover}
                                                alt=""
                                                className="home-playlist-thumb"
                                            />

                                        ))}

                                    {playlist.songs.length === 0 && (

                                        <div className="home-playlist-empty-icon">
                                            🎵
                                        </div>

                                    )}

                                </div>

                                <div className="home-playlist-info">

                                    <strong>{playlist.name}</strong>

                                    <span>
                                        {playlist.songs.length} song{playlist.songs.length !== 1 ? "s" : ""} · {playlist.members.length} member{playlist.members.length !== 1 ? "s" : ""}
                                    </span>

                                </div>

                                <div className="home-playlist-collab-badge">
                                    🔗 Collab
                                </div>

                                {playlist.songs.length > 0 && (

                                    <button
                                        className="home-playlist-play-btn"
                                        onClick={e => {
                                            e.stopPropagation();
                                            playPlaylist(playlist.songs);
                                        }}
                                    >
                                        ▶
                                    </button>

                                )}

                            </div>

                        ))}

                    </div>

                </section>

            )}


            {/* ── EMPTY STATE ── */}
            {recentSongs.length === 0 &&
                playlists.length === 0 &&
                collabPlaylists.length === 0 && (
                <div className="home-empty glass-card">
                    <div className="home-empty-icon">🎧</div>
                    <h2>Start Your Sonic Journey</h2>
                    <p>Search your favorite tracks, collaborate with friends, or let the AI DJ curate an instant vibe.</p>
                    <div className="home-empty-actions">
                        <button className="home-empty-btn primary" onClick={() => navigate("/search")}>
                            🔍 Search Songs
                        </button>
                        <button className="home-empty-btn secondary" onClick={() => setShowModal(true)}>
                            + Create Playlist
                        </button>
                        <button className="home-empty-btn dj" onClick={() => navigate("/dj")}>
                            ✨ Launch AI DJ
                        </button>
                    </div>
                </div>
            )}


            {/* ── NEW PLAYLIST MODAL ── */}

            {showModal && (

                <div
                    className="home-modal-overlay"
                    onClick={() => setShowModal(false)}
                >

                    <div
                        className="home-modal"
                        onClick={e => e.stopPropagation()}
                    >

                        <button
                            className="home-modal-close"
                            onClick={() => setShowModal(false)}
                        >
                            ✕
                        </button>

                        <h2>New Playlist</h2>

                        <div className="home-modal-tabs">

                            <button
                                className={modalTab === "create" ? "active" : ""}
                                onClick={() => setModalTab("create")}
                            >
                                Create New
                            </button>

                            <button
                                className={modalTab === "join" ? "active" : ""}
                                onClick={() => setModalTab("join")}
                            >
                                Join Collab
                            </button>

                        </div>

                        {modalTab === "create" ? (

                            <div className="home-modal-form">

                                <input
                                    value={playlistName}
                                    onChange={e => setPlaylistName(e.target.value)}
                                    placeholder="Playlist name..."
                                    onKeyDown={e => e.key === "Enter" && handleCreate()}
                                    autoFocus
                                />

                                <div className="home-modal-actions">

                                    <button
                                        className="home-modal-primary"
                                        onClick={handleCreate}
                                    >
                                        Create Playlist
                                    </button>

                                    <button
                                        className="home-modal-secondary"
                                        onClick={handleCreateCollab}
                                    >
                                        Create Collab
                                    </button>

                                </div>

                            </div>

                        ) : (

                            <div className="home-modal-form">

                                <input
                                    value={joinCode}
                                    onChange={e => setJoinCode(e.target.value.toUpperCase())}
                                    placeholder="Enter playlist code..."
                                    onKeyDown={e => e.key === "Enter" && handleJoin()}
                                    autoFocus
                                    maxLength={6}
                                    style={{ textTransform: "uppercase", letterSpacing: "3px", textAlign: "center", fontSize: "18px" }}
                                />

                                <button
                                    className="home-modal-primary"
                                    onClick={handleJoin}
                                >
                                    Join Playlist
                                </button>

                            </div>

                        )}

                    </div>

                </div>

            )}

        </div>

    );

}

export default Home;
