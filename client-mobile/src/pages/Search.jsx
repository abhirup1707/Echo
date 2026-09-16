import { useState, useEffect, useContext, useRef } from "react";
import { searchSongs, formatDuration } from "../services/youtube";
import {
    generatePlaylist,
    generateAutoVibePrompt
} from "../services/aiPlaylist";
import { SessionContext } from "../context/SessionContext";
import { ProfileContext } from "../context/ProfileContext";
import { MusicContext } from "../context/MusicContext";
import PlaylistContext from "../context/PlaylistContext";
import SongCard from "../components/music/SongCard";
import { startBackgroundAudio } from "../utils/backgroundAudio";
import {
    FaRobot,
    FaPlay,
    FaMagic,
    FaClock,
    FaTimes,
    FaCheck,
    FaBookmark,
    FaListUl,
    FaSpinner,
    FaFire
} from "react-icons/fa";
import "./Search.css";

function Search() {
    const { profile } = useContext(ProfileContext);
    const {
        currentSong,
        recentSongs,
        playSong,
        resumeSong,
        setIsPlaying
    } = useContext(MusicContext);
    const { sendSong, addToQueue, clearQueue } = useContext(SessionContext);
    const { createPlaylist } = useContext(PlaylistContext);

    // Retrieve cached search state to preserve history across page navigation
    const cached = (() => {
        try {
            const raw = sessionStorage.getItem("echo_search_tab_cache");
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    })();

    // Standard Search State
    const [query, setQuery] = useState(() => cached?.query || "");
    const [songs, setSongs] = useState(() => cached?.songs || []);

    // AI Playlist State
    const [aiPrompt, setAiPrompt] = useState(() => cached?.aiPrompt || "");
    const [aiMinutes, setAiMinutes] = useState(() => cached?.aiMinutes || 45);
    const [isGenerating, setIsGenerating] = useState(false);
    const [progressInfo, setProgressInfo] = useState(() => cached?.progressInfo || {
        status: "",
        current: 0,
        accumulatedSeconds: 0,
        targetSeconds: 2700,
        percent: 0
    });
    const [aiPlaylist, setAiPlaylist] = useState(() => cached?.aiPlaylist || []);
    const [firstTrackPlaying, setFirstTrackPlaying] = useState(() => cached?.firstTrackPlaying || null);
    const [playlistSaved, setPlaylistSaved] = useState(() => cached?.playlistSaved || false);
    const [showAiTrackList, setShowAiTrackList] = useState(() => (cached?.showAiTrackList !== undefined ? cached.showAiTrackList : true));

    const activeGeneratorRef = useRef(null);
    const isInitialMountRef = useRef(true);

    // Persist search tab work across page navigation
    useEffect(() => {
        try {
            const stateToSave = {
                query,
                songs,
                aiPrompt,
                aiMinutes,
                progressInfo,
                aiPlaylist,
                firstTrackPlaying,
                playlistSaved,
                showAiTrackList
            };
            sessionStorage.setItem("echo_search_tab_cache", JSON.stringify(stateToSave));
        } catch (e) {}
    }, [query, songs, aiPrompt, aiMinutes, progressInfo, aiPlaylist, firstTrackPlaying, playlistSaved, showAiTrackList]);

    // Standard manual search
    async function handleSearch(searchQuery = query) {
        if (!searchQuery.trim()) {
            setSongs([]);
            return;
        }
        const results = await searchSongs(searchQuery);
        setSongs(results);
    }

    useEffect(() => {
        // Skip duplicate immediate search on initial mount if songs were already restored
        if (isInitialMountRef.current) {
            isInitialMountRef.current = false;
            if (songs.length > 0) return;
        }

        const timer = setTimeout(() => {
            handleSearch();
        }, 500);
        return () => clearTimeout(timer);
    }, [query]);

    // Quick Mood Suggestions
    const quickVibes = [
        { label: "⚡ Gym Hype & Phonk", prompt: "Gym motivation phonk and high energy workout songs" },
        { label: "☕ Late Night Lofi Study", prompt: "Chill lofi hip hop study and relax beats" },
        { label: "🌌 Synthwave Night Drive", prompt: "80s cyberpunk synthwave night drive retro hits" },
        { label: "💖 Soulful Romantic Duets", prompt: "Soulful romantic love songs and acoustic duets" },
        { label: "🎸 2000s Nostalgic Rock", prompt: "2000s nostalgic alternative rock and pop rock hits" },
        { label: "🕺 Bollywood Party Bangers", prompt: "High energy upbeat Bollywood party dance hits" }
    ];

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

    // Run AI Generation
    async function startAiGeneration(targetPrompt = null, targetMins = null) {
        if (isGenerating) return;

        // Unlock audio immediately during the user's click gesture
        try {
            startBackgroundAudio();
            setIsPlaying(true);
        } catch (e) {}

        let effectivePrompt = (targetPrompt !== null ? targetPrompt : aiPrompt).trim();
        const effectiveMins = targetMins !== null ? targetMins : (Number(aiMinutes) || 45);

        // If no prompt entered, automatically read last song & singer
        if (!effectivePrompt) {
            const lastPlayed = currentSong || (recentSongs && recentSongs.length > 0 ? recentSongs[0] : null);
            const vibe = generateAutoVibePrompt(lastPlayed);
            effectivePrompt = vibe.prompt;
            setAiPrompt(vibe.prompt);
        }

        // Reset state & clear previous queue to ensure clean uninterrupted AI playback
        if (typeof clearQueue === "function") {
            clearQueue();
        }
        setIsGenerating(true);
        setAiPlaylist([]);
        setFirstTrackPlaying(null);
        setPlaylistSaved(false);
        setShowAiTrackList(true);
        setProgressInfo({
            status: "Starting AI Smart DJ (Finding individual songs)...",
            current: 0,
            accumulatedSeconds: 0,
            targetSeconds: effectiveMins * 60,
            percent: 5
        });

        // Launch generator
        const generator = await generatePlaylist({
            prompt: effectivePrompt,
            minutes: effectiveMins,
            lastSong: currentSong || (recentSongs && recentSongs.length > 0 ? recentSongs[0] : null),
            onFirstTrackReady: (firstTrack) => {
                // Instantly start playback locally and in room!
                try {
                    startBackgroundAudio();
                    playSong(firstTrack);
                    sendSong(firstTrack);
                    resumeSong(0);
                    setIsPlaying(true);
                } catch (e) {
                    console.warn("Immediate playback trigger error:", e);
                }
                setFirstTrackPlaying(firstTrack);
            },
            onTrackAdded: (track, progress, isFirst) => {
                setAiPlaylist(prev => {
                    const exists = prev.some(t => t.videoId === track.videoId);
                    if (exists) return prev;
                    return [...prev, track];
                });

                // Add subsequent tracks to the player's queue in real time (Track 1 is already playing!)
                if (!isFirst) {
                    addToQueue(track, profile?.username || "AI DJ");
                }

                if (progress) {
                    setProgressInfo(progress);
                }
            },
            onProgress: (prog) => {
                setProgressInfo(prog);
            },
            onComplete: (allTracks) => {
                setIsGenerating(false);
                const totalSec = allTracks.reduce((acc, t) => acc + (t.durationSeconds || 210), 0);
                setProgressInfo({
                    status: `🎉 Complete! ${allTracks.length} individual songs (${formatDuration(totalSec)} total)`,
                    current: allTracks.length,
                    accumulatedSeconds: totalSec,
                    targetSeconds: effectiveMins * 60,
                    percent: 100
                });
            },
            onError: (err) => {
                console.error("AI Playlist generation error:", err);
                setIsGenerating(false);
                setProgressInfo(prev => ({
                    ...prev,
                    status: "⚠️ AI generator encountered an issue. Try another prompt!"
                }));
            }
        });

        activeGeneratorRef.current = generator;
    }

    // Auto-Vibe button handler
    function handleAutoVibeClick() {
        const lastPlayed = currentSong || (recentSongs && recentSongs.length > 0 ? recentSongs[0] : null);
        const vibe = generateAutoVibePrompt(lastPlayed);
        setAiPrompt(vibe.prompt);
        startAiGeneration(vibe.prompt, Number(aiMinutes) || 45);
    }

    // Cancel active generation
    function handleCancelGeneration() {
        if (activeGeneratorRef.current && typeof activeGeneratorRef.current.abort === "function") {
            activeGeneratorRef.current.abort();
        }
        setIsGenerating(false);
        setProgressInfo(prev => ({
            ...prev,
            status: "⏹️ Generation stopped by user."
        }));
    }

    // Save generated AI playlist to personal library
    function handleSavePlaylist() {
        if (!aiPlaylist || aiPlaylist.length === 0) return;
        const promptLabel = aiPrompt.slice(0, 26).trim() || "AI Mix";
        const plName = `✨ ${promptLabel} (${aiMinutes}m)`;
        createPlaylist(plName, aiPlaylist);
        setPlaylistSaved(true);
    }

    // Clear current AI mix to start fresh
    function handleClearAiMix() {
        if (activeGeneratorRef.current && typeof activeGeneratorRef.current.abort === "function") {
            activeGeneratorRef.current.abort();
        }
        setIsGenerating(false);
        setAiPlaylist([]);
        setFirstTrackPlaying(null);
        setPlaylistSaved(false);
        setProgressInfo({
            status: "",
            current: 0,
            accumulatedSeconds: 0,
            targetSeconds: 2700,
            percent: 0
        });
    }

    // Play specific track from AI list and queue subsequent tracks in order
    function handlePlayAiTrack(idx) {
        const selected = aiPlaylist[idx];
        if (!selected) return;
        if (typeof clearQueue === "function") {
            clearQueue();
        }
        sendSong(selected);
        playSong(selected);
        resumeSong(0);
        for (let i = idx + 1; i < aiPlaylist.length; i++) {
            addToQueue(aiPlaylist[i], profile?.username || "AI DJ");
        }
    }

    // Calculate total accumulated seconds
    const totalAccumulatedSec = aiPlaylist.reduce((acc, t) => acc + (t.durationSeconds || 210), 0);

    return (
        <div className="search-page">
            <h1 className="search-title">
                Music & AI DJ
            </h1>

            {/* =================================================== */}
            {/* 🤖 AI PLAYLIST GENERATOR CARD                        */}
            {/* =================================================== */}
            <div className="ai-playlist-card">
                <div className="ai-card-glow-mesh" />

                <div className="ai-card-header">
                    <div className="ai-title-wrap">
                        <div className="ai-robot-avatar">
                            <FaRobot />
                        </div>
                        <div>
                            <div className="ai-badge-row">
                                <h2 className="ai-card-title">AI Playlist Generator</h2>
                                <span className="ai-live-tag">⚡ Instant Play • Individual Audio Tracks</span>
                            </div>
                            <p className="ai-card-subtitle">
                                Type what you want to hear & how many minutes. <strong>Track 1 starts playing immediately</strong> while AI streams individual single songs to fill your duration!
                            </p>
                        </div>
                    </div>
                </div>

                {/* Quick Vibe Chips */}
                <div className="ai-quick-vibes">
                    <span className="ai-quick-label"><FaFire /> Quick Vibes:</span>
                    <div className="ai-quick-chips-scroll">
                        {quickVibes.map((vibe, idx) => (
                            <button
                                key={idx}
                                className="ai-vibe-chip"
                                disabled={isGenerating}
                                onClick={() => {
                                    setAiPrompt(vibe.prompt);
                                    startAiGeneration(vibe.prompt, Number(aiMinutes) || 45);
                                }}
                            >
                                {vibe.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Inputs Area */}
                <div className="ai-input-grid">
                    {/* Prompt Box */}
                    <div className="ai-prompt-box">
                        <label className="ai-input-label">
                            🎧 What do you want to listen to?
                        </label>
                        <div className="ai-input-wrap">
                            <input
                                className="ai-text-input"
                                placeholder="e.g. Late night synthwave drive, Arijit Singh romantic hits, 2000s rock..."
                                value={aiPrompt}
                                disabled={isGenerating}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !isGenerating) {
                                        startAiGeneration();
                                    }
                                }}
                            />
                            {aiPrompt && !isGenerating && (
                                <button
                                    className="ai-clear-btn"
                                    onClick={() => setAiPrompt("")}
                                    title="Clear text"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Duration / Minutes Box (Redesigned with large visible number, no preset chips) */}
                    <div className="ai-duration-box">
                        <label className="ai-input-label">
                            <FaClock /> Duration (Minutes)
                        </label>
                        <div className="ai-duration-input-wrapper">
                            <input
                                type="number"
                                min="1"
                                max="300"
                                className="ai-duration-number-input"
                                value={aiMinutes}
                                disabled={isGenerating}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setAiMinutes(val === "" ? "" : Math.max(1, Math.min(300, Number(val))));
                                }}
                                placeholder="45"
                            />
                            <span className="ai-duration-unit-badge">Minutes</span>
                        </div>
                        <span className="ai-estimate-tag">
                            ⏱️ Continuous individual songs (~3-4m each)
                        </span>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="ai-actions-row">
                    {!isGenerating ? (
                        <>
                            <button
                                className="ai-generate-main-btn"
                                onClick={() => startAiGeneration()}
                            >
                                <FaPlay style={{ fontSize: 13 }} />
                                <span>✨ Generate & Play Immediately</span>
                            </button>

                            <button
                                className="ai-autovibe-btn"
                                onClick={handleAutoVibeClick}
                                title="Reads your last played singer & song to generate matching hits and duets"
                            >
                                <FaMagic />
                                <span>🪄 Auto-Vibe (Last Song & Singer)</span>
                            </button>
                        </>
                    ) : (
                        <div className="ai-generating-action-bar">
                            <div className="ai-generating-status-live">
                                <FaSpinner className="ai-spin-icon" />
                                <span>Curating your {aiMinutes}-minute playlist in background...</span>
                            </div>
                            <button
                                className="ai-cancel-btn"
                                onClick={handleCancelGeneration}
                            >
                                <FaTimes /> Cancel
                            </button>
                        </div>
                    )}
                </div>

                {/* Live Progress & Track Status HUD */}
                {(isGenerating || aiPlaylist.length > 0) && (
                    <div className="ai-progress-hud">
                        <div className="ai-hud-top-row">
                            <div className="ai-hud-status-text">
                                <span className="ai-hud-pulse-dot" />
                                {progressInfo.status || "Curating your playlist..."}
                            </div>
                            <span className="ai-hud-track-count">
                                ⏱️ {formatDuration(totalAccumulatedSec)} / {aiMinutes}m target • {aiPlaylist.length} tracks
                            </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="ai-progress-bar-bg">
                            <div
                                className="ai-progress-bar-fill"
                                style={{
                                    width: `${Math.min(100, Math.round((totalAccumulatedSec / ((Number(aiMinutes) || 45) * 60)) * 100))}%`
                                }}
                            />
                        </div>

                        {/* Now Playing Banner */}
                        {firstTrackPlaying && (
                            <div className="ai-now-playing-banner">
                                <div className="ai-np-left">
                                    <img
                                        src={firstTrackPlaying.cover}
                                        alt={firstTrackPlaying.title}
                                        className="ai-np-thumb"
                                    />
                                    <div className="ai-np-info">
                                        <span className="ai-np-label">
                                            🎧 Now Playing (Track 1) • {firstTrackPlaying.durationFormatted}
                                        </span>
                                        <strong className="ai-np-title">{firstTrackPlaying.title}</strong>
                                        <p className="ai-np-artist">{firstTrackPlaying.artist}</p>
                                    </div>
                                </div>
                                <div className="ai-np-right">
                                    <div className="ai-live-wave">
                                        <span />
                                        <span />
                                        <span />
                                    </div>
                                    <span className="ai-np-sync-tag">Syncing with Queue</span>
                                </div>
                            </div>
                        )}

                        {/* Save Playlist & Tracklist Header */}
                        {aiPlaylist.length > 0 && (
                            <div className="ai-hud-footer">
                                <div className="ai-hud-left">
                                    <button
                                        className="ai-toggle-list-btn"
                                        onClick={() => setShowAiTrackList(!showAiTrackList)}
                                    >
                                        <FaListUl />
                                        <span>{showAiTrackList ? "Hide Tracklist" : `View ${aiPlaylist.length} Individual Songs`}</span>
                                    </button>
                                </div>

                                <div className="ai-hud-right">
                                    <button
                                        className="ai-clear-btn"
                                        onClick={handleClearAiMix}
                                        title="Clear current AI mix"
                                    >
                                        ✕ Clear Mix
                                    </button>
                                    <button
                                        className={`ai-save-playlist-btn ${playlistSaved ? "saved" : ""}`}
                                        onClick={handleSavePlaylist}
                                        disabled={playlistSaved}
                                    >
                                        {playlistSaved ? (
                                            <>
                                                <FaCheck /> Saved to Your Playlists!
                                            </>
                                        ) : (
                                            <>
                                                <FaBookmark /> Save as Playlist
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Generated Tracklist Stream */}
                        {showAiTrackList && aiPlaylist.length > 0 && (
                            <div className="ai-tracks-stream-grid">
                                {aiPlaylist.map((song, idx) => {
                                    const isPlayingThis = currentSong?.videoId === song.videoId;
                                    return (
                                        <div
                                            key={song.videoId || idx}
                                            className={`ai-track-row ${isPlayingThis ? "is-active" : ""}`}
                                            onClick={() => handlePlayAiTrack(idx)}
                                        >
                                            <span className="ai-track-idx">#{idx + 1}</span>
                                            <img
                                                src={song.cover}
                                                alt={song.title}
                                                className="ai-track-thumb"
                                            />
                                            <div className="ai-track-details">
                                                <h4 className="ai-track-title" title={song.title}>
                                                    {song.title}
                                                </h4>
                                                <p className="ai-track-artist">
                                                    {song.artist}
                                                    <span className="ai-track-dur-badge">
                                                        ⏱️ {song.durationFormatted || "3:30"}
                                                    </span>
                                                </p>
                                            </div>
                                            <button
                                                className="ai-track-play-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handlePlayAiTrack(idx);
                                                }}
                                                title="Play this track and queue rest"
                                            >
                                                <FaPlay style={{ fontSize: 11 }} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* =================================================== */}
            {/* 🔍 MANUAL SEARCH SECTION                            */}
            {/* =================================================== */}
            <div className="manual-search-divider">
                <span>Or Search Tracks Manually</span>
            </div>

            <div className="search-input-wrapper">
                <input
                    className="search-input"
                    placeholder="Search your favourite songs..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
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
                    <p className="search-hint-text">
                        Try searching songs, artists, or genres directly
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
                        onPlay={sendSong}
                        onQueue={(s) => addToQueue(s, profile?.username || "You")}
                    />
                ))}
            </div>
        </div>
    );
}

export default Search;
