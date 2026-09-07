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
    if (/(\b\d+\s*hours?\b|\bfull\s*album\b|\bjukebox\b|\bhour\s*mix\b)/i.test(title)) {
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

    // Penalty: Teasers, trailers, behind the scenes, movie clips, interviews
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