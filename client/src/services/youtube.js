const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;

const BASE_URL = "https://www.googleapis.com/youtube/v3/search";
const VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos";

export const YOUTUBE_API_KEY = API_KEY;

/**
 * Parses ISO 8601 duration (e.g. "PT3M45S", "PT1H25M") into total seconds.
 */
export function parseDurationToSeconds(isoStr) {
    if (!isoStr) return 0;
    const match = isoStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    const hours = parseInt(match[1] || 0, 10);
    const mins = parseInt(match[2] || 0, 10);
    const secs = parseInt(match[3] || 0, 10);
    return hours * 3600 + mins * 60 + secs;
}

/**
 * Formats seconds into "M:SS" (e.g. 225s -> "3:45").
 */
export function formatDuration(seconds) {
    if (!seconds || isNaN(seconds) || seconds <= 0) return "3:30";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

/**
 * Validates that a song is an individual track under 10 minutes (600 seconds)
 * and at least 60 seconds long, filtering out 1-hour/85-min full albums and compilations.
 */
export function isSongUnder10Minutes(durationSeconds = 0, title = "") {
    if (durationSeconds > 0) {
        if (durationSeconds > 600) return false; // Over 10 minutes (rejects 85-min mixes, full albums)
        if (durationSeconds < 60) return false;  // Under 1 minute (rejects shorts/memes)
        return true;
    }
    // Fallback title check for obvious hour mixes if duration isn't returned
    if (/(\b\d+\s*hours?\b|\bfull\s*album\b|\bjukebox\b|\bhour\s*mix\b|\ball\s*songs\b|\bnon\s*stop\b)/i.test(title)) {
        return false;
    }
    return true;
}

/**
 * Fetches exact video details (duration, clean title, thumbnail) for an array of video IDs.
 */
export async function getVideoDetails(videoIds) {
    if (!videoIds || videoIds.length === 0) return {};
    try {
        const idParam = Array.isArray(videoIds) ? videoIds.join(",") : videoIds;
        const response = await fetch(
            `${VIDEOS_URL}?part=contentDetails,snippet&id=${encodeURIComponent(idParam)}&key=${API_KEY}`
        );
        const data = await response.json();
        const map = {};
        if (data.items) {
            for (const item of data.items) {
                const sec = parseDurationToSeconds(item?.contentDetails?.duration);
                map[item.id] = {
                    durationSeconds: sec,
                    formattedDuration: formatDuration(sec),
                    title: item.snippet?.title || "",
                    artist: item.snippet?.channelTitle || "",
                    cover: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url || ""
                };
            }
        }
        return map;
    } catch (e) {
        console.warn("getVideoDetails error:", e);
        return {};
    }
}

/**
 * Scores a YouTube video result to prioritize clean AUDIO versions
 * (Official Audio, Topic channels, Lyric Videos, Visualizers)
 * over cinematic "Official Music Video" clips with long intros or dialogue.
 */
export function getAudioVersionScore(title = "", channelTitle = "") {
    let score = 0;
    const lowerTitle = (title || "").toLowerCase();
    const lowerChannel = (channelTitle || "").toLowerCase();

    // High preference: Official Topic channels (YouTube Music pure studio master tracks)
    if (lowerChannel.endsWith(" - topic")) score += 40;

    // High preference: Audio keywords in title
    if (/\b(official\s+audio|audio\s+song|pure\s+audio)\b/i.test(lowerTitle)) score += 35;
    else if (/\b(audio)\b/i.test(lowerTitle)) score += 25;

    // Strong preference: Lyric videos or visualizers (pure studio track with text)
    if (/\b(lyric\s+video|lyrics|lyrical|visualizer)\b/i.test(lowerTitle)) score += 20;

    // Penalty: Official Video / Music Video (often contains 30-60s intro acting, dialogue, cut scenes)
    if (/\b(official\s+music\s+video|official\s+video)\b/i.test(lowerTitle)) score -= 15;

    // Heavy penalty: Gimmicky 8k/16k re-encodes, teasers, trailers, movie scenes
    if (/\b(8k|16k)\b/i.test(lowerTitle)) score -= 80;
    if (/\b(teaser|trailer|making\s+of|behind\s+the\s+scenes|movie\s+scene|short\s+film|interview)\b/i.test(lowerTitle)) score -= 50;

    return score;
}

// MUSIC SEARCH
export async function searchSongs(query, maxResults = 25, preferAudio = true) {
    try {
        let searchQuery = query;
        // If searching general music without explicit "video" keyword, append "audio" to help YouTube return audio releases
        if (preferAudio && !/\b(video|official video|mv)\b/i.test(query) && !/\b(audio|lyrics|lyric)\b/i.test(query)) {
            searchQuery = `${query} audio`;
        }

        const response = await fetch(
            `${BASE_URL}?part=snippet&type=video&videoCategoryId=10&maxResults=${maxResults}&q=${encodeURIComponent(searchQuery)}&key=${API_KEY}`
        );
        const data = await response.json();
        let items = data.items || [];

        // Fallback to original query if "audio" yielded no results
        if (items.length === 0 && searchQuery !== query) {
            const fallbackRes = await fetch(
                `${BASE_URL}?part=snippet&type=video&videoCategoryId=10&maxResults=${maxResults}&q=${encodeURIComponent(query)}&key=${API_KEY}`
            );
            const fallbackData = await fallbackRes.json();
            items = fallbackData.items || [];
        }

        // Sort items so pure audio versions, Topic releases, and lyrical versions appear first
        if (preferAudio && items.length > 0) {
            return [...items].sort((a, b) => {
                const scoreA = getAudioVersionScore(a?.snippet?.title, a?.snippet?.channelTitle);
                const scoreB = getAudioVersionScore(b?.snippet?.title, b?.snippet?.channelTitle);
                return scoreB - scoreA;
            });
        }

        return items;
    } catch (e) {
        console.warn("searchSongs error:", e);
        return [];
    }
}

// VIDEO SEARCH
export async function searchVideos(query) {
    try {
        const response = await fetch(
            `${BASE_URL}?part=snippet&type=video&maxResults=12&q=${encodeURIComponent(query)}&key=${API_KEY}`
        );
        const data = await response.json();
        return data.items || [];
    } catch (e) {
        console.warn("searchVideos error:", e);
        return [];
    }
}

/**
 * Cleans a song title by stripping 8k/16k/4k tags, bracketed labels, and common video fluff.
 */
export function cleanSongTitle(rawTitle = "") {
    if (!rawTitle) return "";
    return rawTitle
        .replace(/\b(8k|16k|4k|1080p|720p|60fps|ultra\s*hd|uhd|hd|hq)\b/gi, "")
        .replace(/\[.*?\]|\(.*?\)|<.*?>|\{.*?\}/g, "")
        .replace(/\b(official\s*(music\s*)?video|official\s*audio|lyric\s*video|lyrical\s*video|lyrics|lyric|full\s*(video\s*)?song|full\s*audio|audio\s*song|pure\s*audio|remastered|remaster|video\s*song|video|audio|song|track)\b/gi, "")
        .replace(/\s+/g, " ")
        .trim();
}

/**
 * Normalizes a song title to its core alphanumeric representation for strict duplicate comparison.
 */
export function normalizeSongTitle(title = "") {
    if (!title) return "";
    return title
        .toLowerCase()
        .replace(/\b(\d{1,2}k|\d{3,4}p|\d{2}fps|ultra\s*hd|uhd|hd|hq)\b/gi, "")
        .replace(/\[.*?\]|\(.*?\)|<.*?>|\{.*?\}/g, "")
        .replace(/\b(official\s*(music\s*)?video|official\s*audio|lyric\s*video|lyrical\s*video|lyrics|lyric|full\s*(video\s*)?song|full\s*audio|audio\s*song|pure\s*audio|remastered|remaster|video\s*song|video|audio|song|track|soundtrack|ost|theme|slowed|reverb|bass\s*boosted|visualizer)\b/gi, "")
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

/**
 * Compares two titles to detect if they represent the same music track or duplicate re-upload
 * (e.g. 8k, 16k, lyrical, remastered, or different channel uploads of the same song).
 */
export function isSameSong(titleA = "", titleB = "") {
    if (!titleA || !titleB) return false;
    const normA = normalizeSongTitle(titleA);
    const normB = normalizeSongTitle(titleB);
    if (!normA || !normB) return false;

    // Direct normalized match
    if (normA === normB) return true;

    // Compact alphanumeric string match (e.g. "tumhiho" vs "tum hi ho")
    const compA = normA.replace(/\s+/g, "");
    const compB = normB.replace(/\s+/g, "");
    if (compA === compB) return true;

    // Containment check for meaningful length (>= 4 characters)
    const COMMON_GENERIC_WORDS = new Set(["love", "baby", "girl", "life", "time", "night", "dance", "party", "happy"]);
    if (compA.length >= 4 && compB.length >= 4) {
        if (!COMMON_GENERIC_WORDS.has(compA) && !COMMON_GENERIC_WORDS.has(compB)) {
            if (compA.includes(compB) || compB.includes(compA)) {
                return true;
            }
        }
    }

    // Word token overlap check
    const wordsA = normA.split(/\s+/).filter(w => w.length >= 3);
    const wordsB = normB.split(/\s+/).filter(w => w.length >= 3);
    if (wordsA.length > 0 && wordsB.length > 0) {
        const setA = new Set(wordsA);
        const setB = new Set(wordsB);
        let intersection = 0;
        for (const w of setA) {
            if (setB.has(w)) intersection++;
        }
        const minSize = Math.min(setA.size, setB.size);
        if (minSize > 0 && intersection / minSize >= 0.7) {
            return true;
        }
    }

    return false;
}

/**
 * Extracts clean artist and song title metadata from a song object,
 * distinguishing actual artists from generic record labels (e.g. T-Series, Sony Music).
 */
export function extractSongMetadata(song) {
    const rawTitle = song?.title || "";
    const rawArtist = song?.artist || "";

    const LABEL_REGEX = /^(t-series|tseries|sony\s*music|zee\s*music|yrf|speed\s*records|tips\s*official|saregama|eros\s*now|universal\s*music|def\s*jam|warner\s*music|ultra\s*bollywood|geet\s*mp3|white\s*hill|aditya\s*music|lahari\s*music|think\s*music|voila\s*digi)/i;

    let cleanChannel = rawArtist
        .replace(/- topic/i, "")
        .replace(/vevo/i, "")
        .replace(/official/i, "")
        .replace(/channel/i, "")
        .trim();

    const isChannelLabel = !cleanChannel || LABEL_REGEX.test(cleanChannel) || /records|music|entertainment/i.test(cleanChannel);

    const noBrackets = rawTitle
        .replace(/\b(8k|16k|4k|1080p|720p|60fps|ultra\s*hd|uhd|hd)\b/gi, "")
        .replace(/\[.*?\]|\(.*?\)|<.*?>|\{.*?\}/g, "")
        .trim();

    // Check "Artist - Title" format
    if (noBrackets.includes(" - ")) {
        const parts = noBrackets.split(" - ").map(p => p.trim());
        if (parts.length >= 2) {
            const part0 = parts[0];
            const part1 = parts[1].split(/[\|\/]/)[0].trim();
            return {
                cleanArtist: !isChannelLabel ? cleanChannel : part0,
                cleanTitle: part1 || noBrackets,
                coreTitle: cleanSongTitle(part1 || noBrackets)
            };
        }
    }

    // Check "Title | Movie | Artist" format
    if (noBrackets.includes("|")) {
        const parts = noBrackets.split("|").map(p => p.trim());
        const titlePart = parts[0].split(" - ")[0].trim();
        let foundArtist = !isChannelLabel ? cleanChannel : "";
        if (!foundArtist && parts.length > 1) {
            for (let i = 1; i < parts.length; i++) {
                const seg = parts[i];
                if (seg.length > 2 && !/(video|song|movie|audio|full|starring|director)/i.test(seg)) {
                    foundArtist = seg;
                    break;
                }
            }
        }
        return {
            cleanArtist: foundArtist || cleanChannel || "",
            cleanTitle: titlePart,
            coreTitle: cleanSongTitle(titlePart)
        };
    }

    return {
        cleanArtist: !isChannelLabel ? cleanChannel : "",
        cleanTitle: cleanSongTitle(noBrackets),
        coreTitle: cleanSongTitle(noBrackets)
    };
}

/**
 * Searches for related, different songs for a given track:
 * - Avoids queueing the currently playing song or video
 * - Avoids queueing 8k, 16k, lyrical or duplicate re-uploads of the same song
 * - Avoids queueing songs from the previous queue or session history
 */
export async function getRelatedSongs(song, excludeVideoIds = [], count = 2, excludeTitles = []) {
    if (!song) return [];

    const excludeSet = new Set((excludeVideoIds || []).map(id => String(id)));
    if (song.videoId) excludeSet.add(String(song.videoId));

    const meta = extractSongMetadata(song);
    const { cleanArtist, cleanTitle, coreTitle } = meta;

    const candidates = [];
    const addedIds = new Set();
    const candidateTitles = [];

    // Combine all titles that must be excluded (current song + previous queue songs + session history)
    const allExcludeTitles = [];
    if (song.title) allExcludeTitles.push(song.title);
    if (coreTitle && coreTitle !== song.title) allExcludeTitles.push(coreTitle);
    if (excludeTitles && Array.isArray(excludeTitles)) {
        for (const t of excludeTitles) {
            if (t) allExcludeTitles.push(t);
        }
    }

    function shouldRejectTitle(candTitle) {
        if (!candTitle) return true;

        // Strictly reject gimmicky 8K / 16K re-encodes
        if (/\b(8k|16k)\b/i.test(candTitle)) return true;

        // Reject full albums, jukeboxes, non-stop hour mixes
        if (/(\b\d+\s*hours?\b|\bfull\s*album\b|\bjukebox\b|\bhour\s*mix\b|\ball\s*songs\b|\bnon\s*stop\b)/i.test(candTitle)) return true;

        // Reject if candidate is the SAME song as current track
        if (isSameSong(candTitle, song.title)) return true;
        if (coreTitle && isSameSong(candTitle, coreTitle)) return true;

        // Reject if candidate matches ANY previous queue song or session history
        for (const prevTitle of allExcludeTitles) {
            if (isSameSong(candTitle, prevTitle)) return true;
        }

        // Reject if candidate matches an already accepted candidate in this batch
        for (const addedTitle of candidateTitles) {
            if (isSameSong(candTitle, addedTitle)) return true;
        }

        return false;
    }

    // Strategies to discover genuinely DIFFERENT, related songs by the artist or vibe:
    const queries = [];
    if (cleanArtist && cleanArtist !== "Hit Songs") {
        queries.push(`${cleanArtist} top songs hit audio`);
        queries.push(`${cleanArtist} similar songs playlist audio`);
    }
    if (coreTitle) {
        queries.push(`${coreTitle} similar songs audio`);
    }
    if (queries.length === 0) {
        queries.push(`${cleanTitle} radio audio`);
        queries.push(`${cleanTitle} similar tracks audio`);
    }

    // Run searches and collect fresh, non-duplicate candidates
    for (const q of queries) {
        if (candidates.length >= count) break;
        const items = await searchSongs(q, 15, true);

        for (const item of items) {
            const vid = item?.id?.videoId;
            const itemTitle = item?.snippet?.title || "";

            if (!vid) continue;
            if (excludeSet.has(vid) || addedIds.has(vid)) continue;
            if (shouldRejectTitle(itemTitle)) continue;

            addedIds.add(vid);
            excludeSet.add(vid);
            candidateTitles.push(itemTitle);

            candidates.push({
                title: itemTitle,
                artist: item.snippet.channelTitle?.replace(/- topic/i, "").trim() || cleanArtist || "Echo Artist",
                cover: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url || "",
                videoId: vid,
                durationFormatted: "3:30",
                durationSeconds: 210,
                isAutoQueue: true
            });

            if (candidates.length >= count) break;
        }
    }

    return candidates.slice(0, count);
}