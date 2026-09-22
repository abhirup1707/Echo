import { useState, useEffect, useContext, useRef } from "react";
import { formatDuration } from "../services/youtube";
import { generatePlaylist } from "../services/aiPlaylist";
import { SessionContext } from "../context/SessionContext";
import { ProfileContext } from "../context/ProfileContext";
import { MusicContext } from "../context/MusicContext";
import PlaylistContext from "../context/PlaylistContext";
import { startBackgroundAudio } from "../utils/backgroundAudio";
import {
    FaRobot,
    FaPlay,
    FaClock,
    FaTimes,
    FaCheck,
    FaBookmark,
    FaListUl,
    FaSpinner,
    FaFire,
    FaCompactDisc
} from "react-icons/fa";
import "./AIDJ.css";

function AIDJ() {
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

    // Cache state to preserve generated mix across page navigation
    const cached = (() => {
        try {
            const raw = sessionStorage.getItem("echo_ai_dj_cache");
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    })();

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

    // Save state into session storage
    useEffect(() => {
        try {
            const stateToSave = {
                aiPrompt,
                aiMinutes,
                progressInfo,
                aiPlaylist,
                firstTrackPlaying,
                playlistSaved,
                showAiTrackList
            };
            sessionStorage.setItem("echo_ai_dj_cache", JSON.stringify(stateToSave));
        } catch (e) {}
    }, [aiPrompt, aiMinutes, progressInfo, aiPlaylist, firstTrackPlaying, playlistSaved, showAiTrackList]);

    // Quick Mood Suggestions
    const quickVibes = [
        { label: "⚡ Gym Hype & Phonk", prompt: "Gym motivation phonk and high energy workout songs" },
        { label: "☕ Late Night Lofi Study", prompt: "Chill lofi hip hop study and relax beats" },
        { label: "🌌 Synthwave Night Drive", prompt: "80s cyberpunk synthwave night drive retro hits" },
        { label: "💖 Soulful Romantic Duets", prompt: "Soulful romantic love songs and acoustic duets" },
        { label: "🎸 2000s Nostalgic Rock", prompt: "2000s nostalgic alternative rock and pop rock hits" },
        { label: "🕺 Bollywood Party Bangers", prompt: "High energy upbeat Bollywood party dance hits" },
        { label: "🔥 EDM Festival Mainstage", prompt: "High energy progressive house and festival EDM bangers" },
        { label: "🌧️ Rainy Day Acoustic Chill", prompt: "Cozy acoustic indie folk and gentle acoustic guitar songs" }
    ];

    async function startAiGeneration(targetPrompt = null, targetMins = null) {
        if (isGenerating) return;

        // Audio unlock on user interaction
        try {
            startBackgroundAudio();
            setIsPlaying(true);
        } catch (e) {}

        const effectivePrompt = (targetPrompt !== null ? targetPrompt : aiPrompt).trim() || "Top trending global hits and party music";
        const effectiveMins = targetMins !== null ? targetMins : (Number(aiMinutes) || 45);

        if (!aiPrompt && targetPrompt === null) {
            setAiPrompt(effectivePrompt);
        }

        if (typeof clearQueue === "function") {
            clearQueue();
        }
        setIsGenerating(true);
        setAiPlaylist([]);
        setFirstTrackPlaying(null);
        setPlaylistSaved(false);
        setShowAiTrackList(true);
        setProgressInfo({
            status: "Connecting to AI DJ... Curating matching single songs...",
            current: 0,
            accumulatedSeconds: 0,
            targetSeconds: effectiveMins * 60,
            percent: 5
        });

        const generator = await generatePlaylist({
            prompt: effectivePrompt,
            minutes: effectiveMins,
            lastSong: currentSong || (recentSongs && recentSongs.length > 0 ? recentSongs[0] : null),
            onFirstTrackReady: (firstTrack) => {
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
                console.error("AI DJ generation error:", err);
                setIsGenerating(false);
                setProgressInfo(prev => ({
                    ...prev,
                    status: "⚠️ AI generator encountered an issue. Try another prompt!"
                }));
            }
        });

        activeGeneratorRef.current = generator;
    }

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

    function handleSavePlaylist() {
        if (!aiPlaylist || aiPlaylist.length === 0) return;
        const promptLabel = aiPrompt.slice(0, 26).trim() || "AI Mix";
        const plName = `✨ ${promptLabel} (${aiMinutes}m)`;
        createPlaylist(plName, aiPlaylist);
        setPlaylistSaved(true);
    }

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

    const totalAccumulatedSec = aiPlaylist.reduce((acc, t) => acc + (t.durationSeconds || 210), 0);

    return (
        <div className="aidj-page">
            {/* Ambient Background Glows */}
            <div className="aidj-ambient-glow aidj-glow-1" />
            <div className="aidj-ambient-glow aidj-glow-2" />

            {/* Header / Hero Section */}
            <div className="aidj-hero">
                <div className="aidj-hero-content">
                    <div className="aidj-hero-badge">
                        <span className="aidj-pulse-dot" />
                        <span>NEXT-GEN MUSIC INTELLIGENCE</span>
                    </div>
                    <h1 className="aidj-hero-title">
                        AI DJ <span className="aidj-title-gradient">Studio</span>
                    </h1>
                    <p className="aidj-hero-subtitle">
                        Describe your vibe and set your duration. <strong>Track 1 starts playing instantly</strong> while AI streams individual high-fidelity tracks to match your vibe and fill your queue.
                    </p>
                </div>

                <div className="aidj-turntable-card">
                    <div className={`aidj-vinyl ${isGenerating ? "spinning" : ""}`}>
                        <div className="aidj-vinyl-grooves" />
                        <div className="aidj-vinyl-center">
                            <FaCompactDisc />
                        </div>
                    </div>
                    <div className="aidj-equalizer">
                        <span /><span /><span /><span /><span />
                    </div>
                </div>
            </div>

            {/* Console Control Station */}
            <div className="aidj-console-card">
                <div className="aidj-card-glow-mesh" />

                {/* Quick Vibe Chips */}
                <div className="aidj-quick-vibes">
                    <span className="aidj-quick-label"><FaFire /> Popular Vibes:</span>
                    <div className="aidj-quick-chips-scroll">
                        {quickVibes.map((vibe, idx) => (
                            <button
                                key={idx}
                                className="aidj-vibe-chip"
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

                {/* Main Inputs Grid */}
                <div className="aidj-input-grid">
                    {/* Prompt Box */}
                    <div className="aidj-prompt-box">
                        <label className="aidj-input-label">
                            🎧 What vibe or artist do you want to experience?
                        </label>
                        <div className="aidj-input-wrap">
                            <input
                                className="aidj-text-input"
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
                                    className="aidj-clear-btn"
                                    onClick={() => setAiPrompt("")}
                                    title="Clear text"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Duration / Minutes Box */}
                    <div className="aidj-duration-box">
                        <label className="aidj-input-label">
                            <FaClock /> Desired Duration
                        </label>
                        <div className="aidj-duration-input-wrapper">
                            <input
                                type="number"
                                min="1"
                                max="300"
                                className="aidj-duration-number-input"
                                value={aiMinutes}
                                disabled={isGenerating}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setAiMinutes(val === "" ? "" : Math.max(1, Math.min(300, Number(val))));
                                }}
                                placeholder="45"
                            />
                            <span className="aidj-duration-unit-badge">Minutes</span>
                        </div>
                        <span className="aidj-estimate-tag">
                            ⏱️ Full individual tracks (~3-4m each)
                        </span>
                    </div>
                </div>

                {/* Action Row */}
                <div className="aidj-actions-row">
                    {!isGenerating ? (
                        <button
                            className="aidj-generate-main-btn"
                            onClick={() => startAiGeneration()}
                        >
                            <FaPlay style={{ fontSize: 13 }} />
                            <span>✨ Generate & Play Mix Now</span>
                        </button>
                    ) : (
                        <div className="aidj-generating-action-bar">
                            <div className="aidj-generating-status-live">
                                <FaSpinner className="aidj-spin-icon" />
                                <span>Curating your {aiMinutes}-minute playlist in background...</span>
                            </div>
                            <button
                                className="aidj-cancel-btn"
                                onClick={handleCancelGeneration}
                            >
                                <FaTimes /> Cancel
                            </button>
                        </div>
                    )}
                </div>

                {/* Live Progress & Track Status HUD */}
                {(isGenerating || aiPlaylist.length > 0) && (
                    <div className="aidj-progress-hud">
                        <div className="aidj-hud-top-row">
                            <div className="aidj-hud-status-text">
                                <span className="aidj-hud-pulse-dot" />
                                {progressInfo.status || "Curating your playlist..."}
                            </div>
                            <span className="aidj-hud-track-count">
                                ⏱️ {formatDuration(totalAccumulatedSec)} / {aiMinutes}m target • {aiPlaylist.length} tracks
                            </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="aidj-progress-bar-bg">
                            <div
                                className="aidj-progress-bar-fill"
                                style={{
                                    width: `${Math.min(100, Math.round((totalAccumulatedSec / ((Number(aiMinutes) || 45) * 60)) * 100))}%`
                                }}
                            />
                        </div>

                        {/* Now Playing Banner */}
                        {firstTrackPlaying && (
                            <div className="aidj-now-playing-banner">
                                <div className="aidj-np-left">
                                    <img
                                        src={firstTrackPlaying.cover}
                                        alt={firstTrackPlaying.title}
                                        className="aidj-np-thumb"
                                    />
                                    <div className="aidj-np-info">
                                        <span className="aidj-np-label">
                                            🎧 Now Playing (Track 1) • {firstTrackPlaying.durationFormatted}
                                        </span>
                                        <strong className="aidj-np-title">{firstTrackPlaying.title}</strong>
                                        <p className="aidj-np-artist">{firstTrackPlaying.artist}</p>
                                    </div>
                                </div>
                                <div className="aidj-np-right">
                                    <div className="aidj-live-wave">
                                        <span />
                                        <span />
                                        <span />
                                    </div>
                                    <span className="aidj-np-sync-tag">Live in Queue</span>
                                </div>
                            </div>
                        )}

                        {/* Save Playlist & Tracklist Header */}
                        {aiPlaylist.length > 0 && (
                            <div className="aidj-hud-footer">
                                <div className="aidj-hud-left">
                                    <button
                                        className="aidj-toggle-list-btn"
                                        onClick={() => setShowAiTrackList(!showAiTrackList)}
                                    >
                                        <FaListUl />
                                        <span>{showAiTrackList ? "Hide Tracklist" : `View ${aiPlaylist.length} Individual Songs`}</span>
                                    </button>
                                </div>

                                <div className="aidj-hud-right">
                                    <button
                                        className="aidj-clear-btn"
                                        onClick={handleClearAiMix}
                                        title="Clear current AI mix"
                                    >
                                        ✕ Clear Mix
                                    </button>
                                    <button
                                        className={`aidj-save-playlist-btn ${playlistSaved ? "saved" : ""}`}
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
                            <div className="aidj-tracks-stream-grid">
                                {aiPlaylist.map((song, idx) => {
                                    const isPlayingThis = currentSong?.videoId === song.videoId;
                                    return (
                                        <div
                                            key={song.videoId || idx}
                                            className={`aidj-track-row ${isPlayingThis ? "is-active" : ""}`}
                                            onClick={() => handlePlayAiTrack(idx)}
                                        >
                                            <span className="aidj-track-idx">#{idx + 1}</span>
                                            <img
                                                src={song.cover}
                                                alt={song.title}
                                                className="aidj-track-thumb"
                                            />
                                            <div className="aidj-track-details">
                                                <h4 className="aidj-track-title" title={song.title}>
                                                    {song.title}
                                                </h4>
                                                <p className="aidj-track-artist">
                                                    {song.artist}
                                                    <span className="aidj-track-dur-badge">
                                                        ⏱️ {song.durationFormatted || "3:30"}
                                                    </span>
                                                </p>
                                            </div>
                                            <button
                                                className="aidj-track-play-btn"
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
        </div>
    );
}

export default AIDJ;
