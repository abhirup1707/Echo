/**
 * Background Audio & Media Session Controller for Echo
 * 
 * Enables:
 * 1. Continuous playback when tab is in background, minimized, or phone screen is locked.
 * 2. System lock-screen / notification controls via Media Session API (Android, iOS, Windows).
 * 3. Screen WakeLock management during active playback.
 */

// 1-second inaudible PCM WAV loop
const SILENT_WAV_BASE64 =
    "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";

let silentAudioEl = null;
let wakeLockSentinel = null;

function getSilentAudioElement() {
    if (typeof window === "undefined") return null;
    if (!silentAudioEl) {
        silentAudioEl = new Audio(SILENT_WAV_BASE64);
        silentAudioEl.loop = true;
        // Inaudible but non-zero volume so browser engines don't cull it as a silent stream
        silentAudioEl.volume = 0.01;
    }
    return silentAudioEl;
}

/**
 * Starts the silent HTML5 audio loop to register an active OS audio stream.
 */
export function startBackgroundAudio() {
    try {
        const audio = getSilentAudioElement();
        if (audio && audio.paused) {
            audio.play().catch(() => {
                // User interaction may be required; handled on first click
            });
        }
        requestWakeLock();
    } catch (e) {
        console.warn("Could not start background audio:", e);
    }
}

/**
 * Pauses the silent audio loop when music is paused or stopped.
 */
export function stopBackgroundAudio() {
    try {
        if (silentAudioEl && !silentAudioEl.paused) {
            silentAudioEl.pause();
        }
        releaseWakeLock();
    } catch (e) {
        console.warn("Could not stop background audio:", e);
    }
}

/**
 * Updates the OS Lock Screen and Notification media overlay.
 */
export function updateMediaSession({
    title,
    artist,
    cover,
    isPlaying,
    duration,
    currentTime,
    onPlay,
    onPause,
    onNext,
    onPrev,
    onSeek,
    onStop
}) {
    if (typeof window === "undefined" || !("mediaSession" in navigator)) return;

    try {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: title || "Echo Music",
            artist: artist || "Echo Session",
            album: "Echo Watch & Play",
            artwork: cover
                ? [
                      { src: cover, sizes: "96x96", type: "image/jpeg" },
                      { src: cover, sizes: "128x128", type: "image/jpeg" },
                      { src: cover, sizes: "192x192", type: "image/jpeg" },
                      { src: cover, sizes: "256x256", type: "image/jpeg" },
                      { src: cover, sizes: "512x512", type: "image/jpeg" }
                  ]
                : [
                      { src: "/favicon.svg", sizes: "192x192", type: "image/svg+xml" }
                  ]
        });

        navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";

        // Register hardware / lockscreen action handlers
        if (onPlay) {
            navigator.mediaSession.setActionHandler("play", () => {
                onPlay();
                startBackgroundAudio();
            });
        }

        if (onPause) {
            navigator.mediaSession.setActionHandler("pause", () => {
                onPause();
                stopBackgroundAudio();
            });
        }

        if (onNext) {
            navigator.mediaSession.setActionHandler("nexttrack", onNext);
        }

        if (onPrev) {
            navigator.mediaSession.setActionHandler("previoustrack", onPrev);
        }

        if (onSeek) {
            navigator.mediaSession.setActionHandler("seekto", (details) => {
                if (details.seekTime !== undefined) {
                    onSeek(details.seekTime);
                }
            });
        }

        if (onStop) {
            navigator.mediaSession.setActionHandler("stop", () => {
                onStop();
                stopBackgroundAudio();
            });
        }

        // Update seek position state if valid
        if (
            duration &&
            duration > 0 &&
            typeof currentTime === "number" &&
            !isNaN(currentTime)
        ) {
            try {
                navigator.mediaSession.setPositionState({
                    duration: Math.max(duration, 1),
                    playbackRate: 1,
                    position: Math.min(Math.max(currentTime, 0), duration)
                });
            } catch (posErr) {
                // Ignore position state format errors on older browsers
            }
        }
    } catch (err) {
        console.warn("MediaSession update error:", err);
    }
}

/**
 * Screen WakeLock API to keep device active when wanted
 */
export async function requestWakeLock() {
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    try {
        if (!wakeLockSentinel) {
            wakeLockSentinel = await navigator.wakeLock.request("screen");
            wakeLockSentinel.addEventListener("release", () => {
                wakeLockSentinel = null;
            });
        }
    } catch (e) {
        // WakeLock request can fail if battery saver is on or tab not visible
    }
}

export function releaseWakeLock() {
    try {
        if (wakeLockSentinel) {
            wakeLockSentinel.release();
            wakeLockSentinel = null;
        }
    } catch (e) {}
}
