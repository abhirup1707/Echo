// Procedural Game Sound Effects using Web Audio API (Zero Latency, Offline Ready)

let audioCtx = null;

function getCtx() {
    if (!audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
            audioCtx = new AudioContextClass();
        }
    }
    if (audioCtx && audioCtx.state === "suspended") {
        audioCtx.resume().catch(() => {});
    }
    return audioCtx;
}

// ==========================================
// 🎴 UNO SOUNDS
// ==========================================
export const unoSounds = {
    // Quick, snappy card play sound
    cardPlay: () => {
        try {
            const ctx = getCtx();
            if (!ctx) return;
            const now = ctx.currentTime;

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(420, now);
            osc.frequency.exponentialRampToValueAtTime(140, now + 0.08);

            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.1);
        } catch (e) {
            console.warn(e);
        }
    },

    // Card drawn from pile
    cardDraw: () => {
        try {
            const ctx = getCtx();
            if (!ctx) return;
            const now = ctx.currentTime;

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "triangle";
            osc.frequency.setValueAtTime(280, now);
            osc.frequency.exponentialRampToValueAtTime(520, now + 0.09);

            gain.gain.setValueAtTime(0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.11);
        } catch (e) {
            console.warn(e);
        }
    },

    // Shimmering mystical sweep for Wild & Wild +4
    wildCard: () => {
        try {
            const ctx = getCtx();
            if (!ctx) return;
            const now = ctx.currentTime;

            const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5]; // C5, E5, G5, C6, E6
            notes.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                const noteTime = now + idx * 0.05;

                osc.type = "sine";
                osc.frequency.setValueAtTime(freq, noteTime);

                gain.gain.setValueAtTime(0, noteTime);
                gain.gain.linearRampToValueAtTime(0.14, noteTime + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.22);

                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(noteTime);
                osc.stop(noteTime + 0.24);
            });
        } catch (e) {
            console.warn(e);
        }
    },

    // Urgent alert horn when UNO is called
    unoCall: () => {
        try {
            const ctx = getCtx();
            if (!ctx) return;
            const now = ctx.currentTime;

            [600, 850].forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                const startTime = now + i * 0.11;

                osc.type = "sawtooth";
                osc.frequency.setValueAtTime(freq, startTime);

                gain.gain.setValueAtTime(0, startTime);
                gain.gain.linearRampToValueAtTime(0.15, startTime + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.18);

                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(startTime);
                osc.stop(startTime + 0.2);
            });
        } catch (e) {
            console.warn(e);
        }
    },

    // Hand swap whoosh sound
    swapHands: () => {
        try {
            const ctx = getCtx();
            if (!ctx) return;
            const now = ctx.currentTime;

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.exponentialRampToValueAtTime(900, now + 0.15);
            osc.frequency.exponentialRampToValueAtTime(250, now + 0.3);

            gain.gain.setValueAtTime(0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.33);
        } catch (e) {
            console.warn(e);
        }
    },

    // Skip / Reverse / Action card
    actionCard: () => {
        try {
            const ctx = getCtx();
            if (!ctx) return;
            const now = ctx.currentTime;

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "square";
            osc.frequency.setValueAtTime(480, now);
            osc.frequency.exponentialRampToValueAtTime(750, now + 0.06);

            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.13);
        } catch (e) {
            console.warn(e);
        }
    },

    // Victory fanfare
    victory: () => {
        playFanfare();
    }
};

// ==========================================
// 🎲 LUDO SOUNDS
// ==========================================
export const ludoSounds = {
    // Rapid dice rattle shake
    diceRoll: () => {
        try {
            const ctx = getCtx();
            if (!ctx) return;
            const now = ctx.currentTime;

            const clicks = 6;
            for (let i = 0; i < clicks; i++) {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                const clickTime = now + (i * 0.045);
                const randomPitch = 600 + Math.random() * 400;

                osc.type = "triangle";
                osc.frequency.setValueAtTime(randomPitch, clickTime);

                gain.gain.setValueAtTime(0.14, clickTime);
                gain.gain.exponentialRampToValueAtTime(0.001, clickTime + 0.035);

                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(clickTime);
                osc.stop(clickTime + 0.04);
            }
        } catch (e) {
            console.warn(e);
        }
    },

    // Wooden token hop step
    tokenStep: () => {
        try {
            const ctx = getCtx();
            if (!ctx) return;
            const now = ctx.currentTime;

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(320, now);
            osc.frequency.exponentialRampToValueAtTime(160, now + 0.05);

            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.07);
        } catch (e) {
            console.warn(e);
        }
    },

    // Punchy knock-out impact when capturing opponent token
    tokenCapture: () => {
        try {
            const ctx = getCtx();
            if (!ctx) return;
            const now = ctx.currentTime;

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(450, now);
            osc.frequency.exponentialRampToValueAtTime(60, now + 0.18);

            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.22);
        } catch (e) {
            console.warn(e);
        }
    },

    // Magical chime when token reaches safe star
    starSafe: () => {
        try {
            const ctx = getCtx();
            if (!ctx) return;
            const now = ctx.currentTime;

            [1046.5, 1318.51].forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                const t = now + idx * 0.08;

                osc.type = "sine";
                osc.frequency.setValueAtTime(freq, t);

                gain.gain.setValueAtTime(0.15, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(t);
                osc.stop(t + 0.26);
            });
        } catch (e) {
            console.warn(e);
        }
    },

    // Token safely reaches Home arena
    homeReach: () => {
        try {
            const ctx = getCtx();
            if (!ctx) return;
            const now = ctx.currentTime;

            [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                const t = now + i * 0.06;

                osc.type = "triangle";
                osc.frequency.setValueAtTime(f, t);

                gain.gain.setValueAtTime(0.16, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(t);
                osc.stop(t + 0.22);
            });
        } catch (e) {
            console.warn(e);
        }
    },

    // Victory fanfare
    victory: () => {
        playFanfare();
    }
};

// ==========================================
// ♟️ CHESS SOUNDS
// ==========================================
export const chessSounds = {
    // Solid wooden piece placement clack
    move: () => {
        try {
            const ctx = getCtx();
            if (!ctx) return;
            const now = ctx.currentTime;

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "triangle";
            osc.frequency.setValueAtTime(220, now);
            osc.frequency.exponentialRampToValueAtTime(90, now + 0.07);

            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.09);
        } catch (e) {
            console.warn(e);
        }
    },

    // Solid double-impact piece capture
    capture: () => {
        try {
            const ctx = getCtx();
            if (!ctx) return;
            const now = ctx.currentTime;

            [0, 0.03].forEach((offset, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                const t = now + offset;

                osc.type = idx === 0 ? "sawtooth" : "triangle";
                osc.frequency.setValueAtTime(idx === 0 ? 300 : 150, t);
                osc.frequency.exponentialRampToValueAtTime(70, t + 0.08);

                gain.gain.setValueAtTime(0.28, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(t);
                osc.stop(t + 0.1);
            });
        } catch (e) {
            console.warn(e);
        }
    },

    // Alert chime when king is in check
    check: () => {
        try {
            const ctx = getCtx();
            if (!ctx) return;
            const now = ctx.currentTime;

            [740, 620].forEach((f, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                const t = now + i * 0.12;

                osc.type = "sine";
                osc.frequency.setValueAtTime(f, t);

                gain.gain.setValueAtTime(0.2, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(t);
                osc.stop(t + 0.22);
            });
        } catch (e) {
            console.warn(e);
        }
    },

    // Checkmate fanfare
    checkmate: () => {
        playFanfare();
    }
};

// ==========================================
// 🎨 SCRIBBLE SOUNDS
// ==========================================
export const scribbleSounds = {
    // Happy double ding when guessing word correctly
    correctGuess: () => {
        try {
            const ctx = getCtx();
            if (!ctx) return;
            const now = ctx.currentTime;

            [880, 1174.66].forEach((f, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                const t = now + i * 0.1;

                osc.type = "sine";
                osc.frequency.setValueAtTime(f, t);

                gain.gain.setValueAtTime(0.25, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(t);
                osc.stop(t + 0.38);
            });
        } catch (e) {
            console.warn(e);
        }
    },

    // New round starting
    roundStart: () => {
        try {
            const ctx = getCtx();
            if (!ctx) return;
            const now = ctx.currentTime;

            [523.25, 659.25, 783.99].forEach((f, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                const t = now + i * 0.08;

                osc.type = "sine";
                osc.frequency.setValueAtTime(f, t);

                gain.gain.setValueAtTime(0.18, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(t);
                osc.stop(t + 0.22);
            });
        } catch (e) {
            console.warn(e);
        }
    },

    // Final game victory
    victory: () => {
        playFanfare();
    }
};

// ==========================================
// ⭕ TIC TAC TOE SOUNDS
// ==========================================
export const tttSounds = {
    // Placement click
    place: () => {
        try {
            const ctx = getCtx();
            if (!ctx) return;
            const now = ctx.currentTime;

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(520, now);
            osc.frequency.exponentialRampToValueAtTime(260, now + 0.05);

            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.07);
        } catch (e) {
            console.warn(e);
        }
    },

    // Win sound
    win: () => {
        try {
            const ctx = getCtx();
            if (!ctx) return;
            const now = ctx.currentTime;

            [523.25, 659.25, 1046.5].forEach((f, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                const t = now + i * 0.1;

                osc.type = "triangle";
                osc.frequency.setValueAtTime(f, t);

                gain.gain.setValueAtTime(0.2, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(t);
                osc.stop(t + 0.32);
            });
        } catch (e) {
            console.warn(e);
        }
    },

    // Draw sound
    draw: () => {
        try {
            const ctx = getCtx();
            if (!ctx) return;
            const now = ctx.currentTime;

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(320, now);
            osc.frequency.exponentialRampToValueAtTime(200, now + 0.25);

            gain.gain.setValueAtTime(0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.3);
        } catch (e) {
            console.warn(e);
        }
    }
};

// Shared triumphant fanfare
function playFanfare() {
    try {
        const ctx = getCtx();
        if (!ctx) return;
        const now = ctx.currentTime;

        const chordProgression = [
            { t: 0.0, notes: [523.25, 659.25, 783.99], dur: 0.18 }, // C major
            { t: 0.2, notes: [587.33, 739.99, 880.0], dur: 0.18 },  // D major
            { t: 0.4, notes: [659.25, 783.99, 987.77], dur: 0.18 },  // E minor
            { t: 0.62, notes: [523.25, 659.25, 783.99, 1046.5], dur: 0.6 } // High C major sustained
        ];

        chordProgression.forEach(chord => {
            chord.notes.forEach(f => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                const noteTime = now + chord.t;

                osc.type = "triangle";
                osc.frequency.setValueAtTime(f, noteTime);

                gain.gain.setValueAtTime(0, noteTime);
                gain.gain.linearRampToValueAtTime(0.12, noteTime + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + chord.dur);

                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(noteTime);
                osc.stop(noteTime + chord.dur + 0.02);
            });
        });
    } catch (e) {
        console.warn(e);
    }
}
