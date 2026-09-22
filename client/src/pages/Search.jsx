import { useState, useEffect, useContext, useRef } from "react";
import { searchSongs } from "../services/youtube";
import { SessionContext } from "../context/SessionContext";
import { ProfileContext } from "../context/ProfileContext";
import SongCard from "../components/music/SongCard";
import { startBackgroundAudio } from "../utils/backgroundAudio";
import { FaSearch } from "react-icons/fa";
import "./Search.css";

function Search() {
    const { profile } = useContext(ProfileContext);
    const { addToQueue, playWithAutoQueue } = useContext(SessionContext);

    // Retrieve cached search state to preserve history across page navigation
    const cached = (() => {
        try {
            const raw = sessionStorage.getItem("echo_search_tab_cache");
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    })();

    // Search State
    const [query, setQuery] = useState(() => cached?.query || "");
    const [songs, setSongs] = useState(() => cached?.songs || []);

    const isInitialMountRef = useRef(true);

    // Persist search state across navigation
    useEffect(() => {
        try {
            const stateToSave = { query, songs };
            sessionStorage.setItem("echo_search_tab_cache", JSON.stringify(stateToSave));
        } catch (e) {}
    }, [query, songs]);

    // Manual search handler
    async function handleSearch(searchQuery = query) {
        if (!searchQuery.trim()) {
            setSongs([]);
            return;
        }
        const results = await searchSongs(searchQuery);
        setSongs(results);
    }

    useEffect(() => {
        if (isInitialMountRef.current) {
            isInitialMountRef.current = false;
            if (songs.length > 0) return;
        }

        const timer = setTimeout(() => {
            handleSearch();
        }, 500);
        return () => clearTimeout(timer);
    }, [query]);

    function handlePlayTrack(songObj) {
        try {
            startBackgroundAudio();
        } catch (e) {}
        playWithAutoQueue(songObj);
    }

    const standardSuggestions = [
        "Blinding Lights - The Weeknd",
        "Levitating - Dua Lipa",
        "Bohemian Rhapsody - Queen",
        "Shape of You - Ed Sheeran",
        "Stairway to Heaven - Led Zeppelin",
        "Smells Like Teen Spirit - Nirvana",
        "Hotel California - Eagles",
        "Lose Yourself - Eminem",
        "Sweet Child O' Mine - Guns N Roses",
        "Watermelon Sugar - Harry Styles",
        "Bad Guy - Billie Eilish",
        "Starboy - The Weeknd"
    ];

    return (
        <div className="search-page">
            <div className="search-header-container">
                <h1 className="search-title">Music Search</h1>
                <p className="search-subtitle">
                    Search millions of songs. Playing any song automatically queues related tracks continuously with no interruption!
                </p>
            </div>

            <div className="search-input-wrapper">
                <span className="search-icon-adornment">
                    <FaSearch />
                </span>
                <input
                    className="search-input"
                    placeholder="Search songs, artists, albums, or lyrics..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    autoFocus
                />
                {query && (
                    <button
                        className="search-clear-input-btn"
                        onClick={() => {
                            setQuery("");
                            setSongs([]);
                        }}
                        title="Clear search"
                    >
                        ✕
                    </button>
                )}
            </div>

            {!query.trim() && songs.length === 0 && (
                <div className="search-suggestions">
                    <span className="search-suggestion-label">🔥 Trending searches:</span>
                    <div className="search-suggestions-chips">
                        {standardSuggestions.map((s, i) => (
                            <button
                                key={i}
                                className="search-suggestion-chip"
                                onClick={() => setQuery(s.split(" - ")[0])}
                                style={{ animationDelay: `${i * 0.04}s` }}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                    <p className="search-hint-text">
                        Tip: Click any track to start playing and build an instant smart queue
                    </p>
                </div>
            )}

            <div className="results-grid">
                {songs.map((song) => (
                    <SongCard
                        key={song.id.videoId}
                        song={{
                            title: song.snippet.title,
                            artist: song.snippet.channelTitle,
                            cover: song.snippet.thumbnails?.high?.url || song.snippet.thumbnails?.default?.url,
                            videoId: song.id.videoId
                        }}
                        onPlay={handlePlayTrack}
                        onQueue={(s) => addToQueue(s, profile?.username || "You")}
                    />
                ))}
            </div>
        </div>
    );
}

export default Search;
