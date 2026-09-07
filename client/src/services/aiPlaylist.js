import {
    searchSongs,
    getVideoDetails,
    isSongUnder10Minutes,
    formatDuration,
    getAudioVersionScore
} from "./youtube";

/**
 * Normalizes a song title to extract its clean core name for deduplication.
 * Strips artist names, handles, (Official Video), [4K], | separators, and redundant suffixes.
 */
export function getCleanCoreTitle(title = "", artist = "") {
    if (!title) return "";
    let clean = title.toLowerCase();

    // Remove artist name words if present in title
    if (artist) {
        const cleanArt = artist.toLowerCase().replace(/[^a-z0-9]/g, " ").trim();
        cleanArt.split(/\s+/).forEach(word => {
            if (word.length > 2) {
                clean = clean.replaceAll(word, " ");
            }
        });
    }

    clean = clean
        .replace(/@\w+/g, "")          // Remove @handles like @DarshanRavalDZ
        .replace(/\(.*?\)/g, "")       // Remove (Official Video), (Lyrics), (Audio), etc.
        .replace(/\[.*?\]/g, "")       // Remove [Lyrics], [4K], etc.
        .replace(/\|.*$/g, "")         // Remove anything after |
        .replace(/\s*-\s*.*$/g, "")    // Remove secondary titles after dash if formatted
        .replace(/\b(official\s*(video|audio|music\s*video|lyric\s*video|hd)?|lyrics?|full\s*audio|full\s*song|video\s*song|audio\s*song|live\s*version|live\s*in\s*[\w\s]+|acoustic|unplugged|remix|hd|4k|song|audio|video|teaser|ft|feat|featuring)\b/gi, "")
        .replace(/[^a-z0-9]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    return clean;
}

/**
 * Checks if a song title has already been added to the playlist.
 */
export function isSongAlreadyInPlaylist(title, artist, existingTitles) {
    const core = getCleanCoreTitle(title, artist);
    if (!core || core.length < 2) return false;

    for (const existing of existingTitles) {
        if (!existing || existing.length < 2) continue;
        // Exact match
        if (core === existing) return true;
        // Substring / containment match if length >= 4 (e.g. "only mine" vs "only mine live")
        if (core.length >= 4 && existing.length >= 4) {
            if (core.includes(existing) || existing.includes(core)) {
                return true;
            }
        }
    }
    return false;
}

/**
 * Formulates an Auto-Vibe prompt from the previous song.
 */
export function generateAutoVibePrompt(lastSong) {
    if (!lastSong || (!lastSong.title && !lastSong.artist)) {
        return {
            prompt: "Trending viral hits",
            artist: "",
            title: "",
            isDefault: true
        };
    }

    let cleanArtist = (lastSong.artist || "")
        .replace(/\s*-\s*Topic/i, "")
        .replace(/\s*VEVO/i, "")
        .replace(/\s*Official/i, "")
        .replace(/\s*Channel/i, "")
        .replace(/\(.*?\)/g, "")
        .trim();

    let cleanTitle = (lastSong.title || "")
        .replace(/\(.*?\)/g, "")
        .replace(/\[.*?\]/g, "")
        .replace(/official\s*video/i, "")
        .replace(/official\s*audio/i, "")
        .replace(/lyric\s*video/i, "")
        .replace(/4k/i, "")
        .trim();

    if (!cleanArtist) {
        cleanArtist = cleanTitle.split("-")[0]?.trim() || "Popular Artist";
    }

    return {
        prompt: cleanArtist,
        artist: cleanArtist,
        title: cleanTitle,
        isDefault: false
    };
}

/**
 * Main AI Playlist Generator:
 * - Searches for songs matching the user's prompt (e.g. "darshan raval", "the weeknd", "phonk").
 * - Filters for songs UNDER 10 MINUTES (and at least 60s), rejecting 85-min and 1-hour compilations.
 * - STRICTLY PREVENTS DUPLICATES: Checks both video IDs and normalized core titles.
 * - EXCLUDES CURRENT/LAST SONG: If the user is already listening to "Only Mine", it will not repeat!
 * - Resolves Track 1 within 1-2 seconds and triggers instant playback.
 * - Aligns tracks continuously until the user's requested time duration is filled!
 */
export async function generatePlaylist({
    prompt,
    minutes = 45,
    lastSong = null,
    onFirstTrackReady = () => {},
    onTrackAdded = () => {},
    onProgress = () => {},
    onComplete = () => {},
    onError = () => {}
}) {
    let isCancelled = false;
    const existingVideoIds = new Set();
    const existingTitles = new Set();
    const generatedPlaylist = [];

    // Register current/last song so it is NEVER added as a duplicate in the playlist!
    if (lastSong) {
        if (lastSong.videoId) existingVideoIds.add(lastSong.videoId);
        const lastCore = getCleanCoreTitle(lastSong.title, lastSong.artist);
        if (lastCore) existingTitles.add(lastCore);
    }

    const targetMinutes = Math.max(1, Number(minutes) || 30);
    const targetSeconds = targetMinutes * 60;
    let accumulatedSeconds = 0;

    let userPrompt = (prompt || "").trim();
    if (!userPrompt) {
        const vibe = generateAutoVibePrompt(lastSong);
        userPrompt = vibe.artist || vibe.prompt || "trending music";
    }

    onProgress({
        status: `Finding unique songs for "${userPrompt}" under 10 mins...`,
        current: 0,
        accumulatedSeconds: 0,
        targetSeconds,
        percent: 5
    });

    // Variations of search queries prioritizing AUDIO versions (rejecting cinematic video intros)
    const searchVariations = [
        `${userPrompt} official audio`,
        `${userPrompt} audio`,
        `${userPrompt} lyrical audio`,
        `${userPrompt} songs audio`,
        `${userPrompt} hits audio`,
        `${userPrompt} audio tracks`,
        userPrompt
    ];

    try {
        let isFirstTrackDispatched = false;

        for (const query of searchVariations) {
            if (isCancelled) break;
            if (accumulatedSeconds >= targetSeconds) break;

            onProgress({
                status: `Curating unique songs (${formatDuration(accumulatedSeconds)} / ${targetMinutes}m)...`,
                current: generatedPlaylist.length,
                accumulatedSeconds,
                targetSeconds,
                percent: Math.min(95, Math.round((accumulatedSeconds / targetSeconds) * 100))
            });

            // Fetch candidate videos for the query (preferAudio=true)
            const items = await searchSongs(query, 25, true);
            if (!Array.isArray(items) || items.length === 0) continue;

            // Prioritize audio releases, Topic master tracks, and lyric videos first
            const prioritizedItems = [...items].sort((a, b) => {
                const scoreA = getAudioVersionScore(a?.snippet?.title, a?.snippet?.channelTitle);
                const scoreB = getAudioVersionScore(b?.snippet?.title, b?.snippet?.channelTitle);
                return scoreB - scoreA;
            });

            // Filter for new video IDs
            const newCandidateIds = prioritizedItems
                .map(item => item?.id?.videoId)
                .filter(id => id && !existingVideoIds.has(id));

            if (newCandidateIds.length === 0) continue;

            // Fetch duration details for all candidate videos in 1 batch
            const detailsMap = await getVideoDetails(newCandidateIds);

            for (const item of prioritizedItems) {
                if (isCancelled) break;
                if (accumulatedSeconds >= targetSeconds) break;

                const vid = item?.id?.videoId;
                if (!vid || existingVideoIds.has(vid)) continue;

                const details = detailsMap[vid];
                const title = details?.title || item.snippet?.title || "";
                const durSec = details?.durationSeconds || 0;

                // STRICT CHECK 1: Song MUST be under 10 minutes (<= 600s) and at least 60s!
                if (!isSongUnder10Minutes(durSec, title)) {
                    console.log(`[Echo Filter] Skipped video over 10 mins: "${title}" (${durSec}s)`);
                    continue;
                }

                // STRICT CHECK 2: Deduplication by title (no repeats of the same song!)
                if (isSongAlreadyInPlaylist(title, item.snippet?.channelTitle, existingTitles)) {
                    console.log(`[Echo Filter] Skipped duplicate song title: "${title}"`);
                    continue;
                }

                // Register in sets to prevent repeats
                const coreTitle = getCleanCoreTitle(title, item.snippet?.channelTitle);
                if (coreTitle) existingTitles.add(coreTitle);
                existingVideoIds.add(vid);

                const songDur = durSec > 0 ? durSec : 220;
                accumulatedSeconds += songDur;

                const track = {
                    videoId: vid,
                    title: item.snippet?.title || "Unknown Track",
                    artist: item.snippet?.channelTitle || "Unknown Artist",
                    cover: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url || "/assets/images/default-cover.png",
                    durationSeconds: songDur,
                    durationFormatted: details?.formattedDuration || formatDuration(songDur),
                    searchQuery: query
                };

                generatedPlaylist.push(track);

                // If this is the first track, trigger playback immediately!
                if (!isFirstTrackDispatched) {
                    isFirstTrackDispatched = true;
                    onFirstTrackReady(track);
                }

                const isFirst = generatedPlaylist.length === 1;
                onTrackAdded(track, {
                    current: generatedPlaylist.length,
                    accumulatedSeconds,
                    targetSeconds,
                    percent: Math.min(100, Math.round((accumulatedSeconds / targetSeconds) * 100))
                }, isFirst);

                // Short delay between processing to allow UI updates and prevent rate limits
                await new Promise(r => setTimeout(r, 70));
            }
        }

        if (!isCancelled) {
            onProgress({
                status: `🎉 Complete! ${generatedPlaylist.length} unique songs (${formatDuration(accumulatedSeconds)} total)`,
                current: generatedPlaylist.length,
                accumulatedSeconds,
                targetSeconds,
                percent: 100
            });
            onComplete(generatedPlaylist);
        }

    } catch (err) {
        console.error("AI Playlist generation error:", err);
        if (!isCancelled) {
            onError(err);
        }
    }

    return {
        abort: () => {
            isCancelled = true;
        }
    };
}
