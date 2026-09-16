import { useEffect, useState } from "react";
import "./SplashScreen.css";

export default function SplashScreen({ onFinish }) {
    const [exiting, setExiting] = useState(false);

    useEffect(() => {
        // Trigger fade out at 2.65s
        const exitTimer = setTimeout(() => {
            setExiting(true);
        }, 2650);

        // Completely finish and unmount at 3.1s (total duration ~3s)
        const finishTimer = setTimeout(() => {
            if (onFinish) onFinish();
        }, 3100);

        return () => {
            clearTimeout(exitTimer);
            clearTimeout(finishTimer);
        };
    }, [onFinish]);

    function handleSkip() {
        setExiting(true);
        setTimeout(() => {
            if (onFinish) onFinish();
        }, 250);
    }

    return (
        <div
            className={`splash-container ${exiting ? "splash-exiting" : ""}`}
            onClick={handleSkip}
            title="Click anywhere to skip"
        >
            {/* Ambient Background Glow */}
            <div className="splash-ambient-glow" />

            {/* Central Animated Stage */}
            <div className="splash-stage">
                {/* Sonar / Echo Sound Wave Rings */}
                <div className="splash-sound-rings">
                    <span className="splash-ring ring-1" />
                    <span className="splash-ring ring-2" />
                    <span className="splash-ring ring-3" />
                </div>

                {/* Animated App Icon Wrapper */}
                <div className="splash-icon-card">
                    {/* Gloss Light-Sweep Sheen */}
                    <div className="splash-icon-sheen" />

                    {/* SVG Representation of the Echo Purple AirPod Icon */}
                    <svg
                        className="splash-icon-svg"
                        viewBox="0 0 48 48"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <defs>
                            <linearGradient id="splash-bg" x1="0" y1="0" x2="48" y2="48">
                                <stop offset="0%" stopColor="#7c3aed" />
                                <stop offset="50%" stopColor="#9333ea" />
                                <stop offset="100%" stopColor="#a855f7" />
                            </linearGradient>

                            <linearGradient id="splash-note" x1="12" y1="8" x2="36" y2="40">
                                <stop offset="0%" stopColor="#ffffff" />
                                <stop offset="60%" stopColor="#f3e8ff" />
                                <stop offset="100%" stopColor="#d8b4fe" />
                            </linearGradient>

                            <filter id="splash-glow" x="-20%" y="-20%" width="140%" height="140%">
                                <feGaussianBlur stdDeviation="1.5" result="blur" />
                                <feComposite in="SourceGraphic" in2="blur" operator="over" />
                            </filter>
                        </defs>

                        {/* Squircle App Icon Base */}
                        <rect
                            width="48"
                            height="48"
                            rx="11"
                            fill="url(#splash-bg)"
                        />

                        {/* Top Inner Gloss Highlight */}
                        <rect
                            x="1"
                            y="1"
                            width="46"
                            height="46"
                            rx="10"
                            fill="none"
                            stroke="rgba(255, 255, 255, 0.28)"
                            strokeWidth="0.8"
                        />

                        {/* Earbud / AirPod & Music Note Graphic */}
                        <g
                            transform="translate(10, 6)"
                            fill="url(#splash-note)"
                            filter="url(#splash-glow)"
                            className="splash-earbud-graphic"
                        >
                            {/* In-Ear Driver / Speaker Head */}
                            <ellipse
                                cx="9"
                                cy="30"
                                rx="8"
                                ry="5.5"
                                transform="rotate(-15 9 30)"
                                className="splash-bud-head"
                            />

                            {/* Stem */}
                            <rect
                                x="15"
                                y="4"
                                width="3.5"
                                height="27"
                                rx="1.5"
                                transform="rotate(-15 15 4)"
                                className="splash-bud-stem"
                            />

                            {/* Sound Hook / Acoustic Port */}
                            <path
                                d="M15 4 C15 4, 28 2, 28 10 C28 16, 18 14, 15 12"
                                fill="url(#splash-note)"
                                className="splash-bud-hook"
                            />

                            {/* Sound Vibration Waves Emitting from Earbud Head */}
                            <path
                                d="M2 25 C0 27, 0 33, 2 35"
                                stroke="#ffffff"
                                strokeWidth="1.2"
                                strokeLinecap="round"
                                fill="none"
                                className="splash-audio-arc arc-1"
                            />
                            <path
                                d="M-2 22 C-5 26, -5 34, -2 38"
                                stroke="#ffffff"
                                strokeWidth="1.2"
                                strokeLinecap="round"
                                fill="none"
                                className="splash-audio-arc arc-2"
                            />
                        </g>
                    </svg>
                </div>

                {/* Brand Name & Tagline */}
                <div className="splash-text-group">
                    <div className="splash-brand-wrap">
                        <h1 className="splash-brand-name">
                            <span className="splash-letter letter-1">E</span>
                            <span className="splash-letter letter-2">C</span>
                            <span className="splash-letter letter-3">H</span>
                            <span className="splash-letter letter-4">O</span>
                        </h1>
                    </div>

                    <div className="splash-tagline">
                        <span className="splash-tagline-dot" />
                        <span>Listen & Watch Together</span>
                        <span className="splash-tagline-dot" />
                    </div>
                </div>

                {/* Sleek Neon Loading Progress Bar */}
                <div className="splash-progress-track">
                    <div className="splash-progress-bar" />
                </div>
            </div>

            {/* Tap to skip hint */}
            <div className="splash-skip-hint">
                <span>Tap anywhere to enter</span>
            </div>
        </div>
    );
}
