/**
 * Background Audio & Media Session Controller for Echo
 * 
 * Enables:
 * 1. Continuous playback when tab is in background, minimized, or phone screen is locked.
 * 2. System lock-screen / notification controls via Media Session API (Android, iOS, Windows).
 * 3. Screen WakeLock management during active playback.
 */

let silentBlobUrl = null;
let silentAudioEl = null;
let wakeLockSentinel = null;
let audioCtx = null;

// Dynamically generate a genuine, valid 1-second 8-bit PCM silent WAV Blob
function getSilentWavUrl() {
    if (silentBlobUrl) return silentBlobUrl;
    try {
        const sampleRate = 8000;
        const numSamples = sampleRate; // 1 second
        const buffer = new ArrayBuffer(44 + numSamples);
        const view = new DataView(buffer);

        const writeStr = (offset, str) => {
            for (let i = 0; i < str.length; i++) {
                view.setUint8(offset + i, str.charCodeAt(i));
            }
        };

        writeStr(0, "RIFF");
        view.setUint32(4, 36 + numSamples, true);
        writeStr(8, "WAVE");
        writeStr(12, "fmt ");
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true); // PCM
        view.setUint16(22, 1, true); // Mono
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate, true);
        view.setUint16(32, 1, true);
        view.setUint16(34, 8, true); // 8-bit
        writeStr(36, "data");
        view.setUint32(40, numSamples, true);

        // 8-bit unsigned PCM silence is 128 (0x80)
        for (let i = 0; i < numSamples; i++) {
            view.setUint8(44 + i, 128);
        }

        const blob = new Blob([buffer], { type: "audio/wav" });
        silentBlobUrl = URL.createObjectURL(blob);
        return silentBlobUrl;
    } catch (e) {
        return null;
    }
}

function getSilentAudioElement() {
    if (typeof window === "undefined") return null;
    if (!silentAudioEl) {
        const url = getSilentWavUrl();
        if (url) {
            silentAudioEl = new Audio(url);
            silentAudioEl.loop = true;
            silentAudioEl.volume = 0.01;
        }
    }
    return silentAudioEl;
}

function ensureAudioContext() {
    if (typeof window === "undefined") return;
    try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        if (!audioCtx) {
            audioCtx = new AudioContextClass();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            gain.gain.value = 0.0001; // virtually inaudible
            osc.frequency.value = 220;
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
        }
        if (audioCtx.state === "suspended") {
            audioCtx.resume().catch(() => {});
        }
    } catch (e) {}
}

/**
 * Starts the silent HTML5 audio loop to register an active OS audio stream.
 */
export function startBackgroundAudio() {
    try {
        ensureAudioContext();
        const audio = getSilentAudioElement();
        if (audio && audio.paused) {
            audio.play().catch(() => {});
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
        if (audioCtx && audioCtx.state === "running") {
            audioCtx.suspend().catch(() => {});
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
