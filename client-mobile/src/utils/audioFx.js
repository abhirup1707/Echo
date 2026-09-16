// Room Join & Leave Sound Effects using Web Audio API (Zero Latency, Procedural)

let audioCtx = null;

function getAudioContext() {
    if (!audioCtx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
            audioCtx = new AudioCtx();
        }
    }
    if (audioCtx && audioCtx.state === "suspended") {
        audioCtx.resume().catch(() => {});
    }
    return audioCtx;
}

/**
 * Play a bright, upbeat two-tone chime when a peer joins the room
 */
export function playJoinSound() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;

        const now = ctx.currentTime;

        // Note 1: D5 (587.33 Hz)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = "sine";
        osc1.frequency.setValueAtTime(587.33, now);

        gain1.gain.setValueAtTime(0, now);
        gain1.gain.linearRampToValueAtTime(0.18, now + 0.02);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

        osc1.connect(gain1);
        gain1.connect(ctx.destination);

        osc1.start(now);
        osc1.stop(now + 0.23);

        // Note 2: A5 (880.00 Hz)
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(880.0, now + 0.12);

        gain2.gain.setValueAtTime(0, now + 0.12);
        gain2.gain.linearRampToValueAtTime(0.22, now + 0.14);
        gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

        osc2.connect(gain2);
        gain2.connect(ctx.destination);

        osc2.start(now + 0.12);
        osc2.stop(now + 0.46);
    } catch (err) {
        console.warn("Could not play join sound:", err);
    }
}

/**
 * Play a gentle, descending two-tone chime when a peer leaves the room
 */
export function playLeaveSound() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;

        const now = ctx.currentTime;

        // Note 1: E5 (659.25 Hz)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = "triangle";
        osc1.frequency.setValueAtTime(659.25, now);

        gain1.gain.setValueAtTime(0, now);
        gain1.gain.linearRampToValueAtTime(0.15, now + 0.02);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

        osc1.connect(gain1);
        gain1.connect(ctx.destination);

        osc1.start(now);
        osc1.stop(now + 0.23);

        // Note 2: C5 (523.25 Hz)
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(440.0, now + 0.12);

        gain2.gain.setValueAtTime(0, now + 0.12);
        gain2.gain.linearRampToValueAtTime(0.16, now + 0.14);
        gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

        osc2.connect(gain2);
        gain2.connect(ctx.destination);

        osc2.start(now + 0.12);
        osc2.stop(now + 0.46);
    } catch (err) {
        console.warn("Could not play leave sound:", err);
    }
}
