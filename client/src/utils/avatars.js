export const AVATAR_PRESETS = [
    {
        id: "preset-dj",
        name: "Cyber DJ",
        icon: "🎧",
        gradient: "linear-gradient(135deg, #ec4899, #8b5cf6)",
        accent: "#ec4899"
    },
    {
        id: "preset-astro",
        name: "Astro Pilot",
        icon: "🚀",
        gradient: "linear-gradient(135deg, #3b82f6, #06b6d4)",
        accent: "#3b82f6"
    },
    {
        id: "preset-synth",
        name: "Neon Synth",
        icon: "⚡",
        gradient: "linear-gradient(135deg, #f59e0b, #ef4444)",
        accent: "#f59e0b"
    },
    {
        id: "preset-cat",
        name: "Lo-Fi Cat",
        icon: "🐱",
        gradient: "linear-gradient(135deg, #10b981, #3b82f6)",
        accent: "#10b981"
    },
    {
        id: "preset-royal",
        name: "Golden Crown",
        icon: "👑",
        gradient: "linear-gradient(135deg, #eab308, #b45309)",
        accent: "#eab308"
    },
    {
        id: "preset-gamer",
        name: "Retro Gamer",
        icon: "🎮",
        gradient: "linear-gradient(135deg, #6366f1, #d946ef)",
        accent: "#6366f1"
    },
    {
        id: "preset-fox",
        name: "Spirit Fox",
        icon: "🦊",
        gradient: "linear-gradient(135deg, #f97316, #e11d48)",
        accent: "#f97316"
    },
    {
        id: "preset-mystic",
        name: "Mystic Orb",
        icon: "🔮",
        gradient: "linear-gradient(135deg, #8b5cf6, #3b82f6)",
        accent: "#8b5cf6"
    },
    {
        id: "preset-rock",
        name: "Rock Legend",
        icon: "🎸",
        gradient: "linear-gradient(135deg, #ef4444, #831843)",
        accent: "#ef4444"
    },
    {
        id: "preset-fire",
        name: "Phoenix",
        icon: "🔥",
        gradient: "linear-gradient(135deg, #ff5722, #ff9800)",
        accent: "#ff5722"
    },
    {
        id: "preset-alien",
        name: "Starlight",
        icon: "👾",
        gradient: "linear-gradient(135deg, #14b8a6, #6366f1)",
        accent: "#14b8a6"
    },
    {
        id: "preset-echo",
        name: "Midnight Echo",
        icon: "🌙",
        gradient: "linear-gradient(135deg, #1e1b4b, #4338ca)",
        accent: "#4338ca"
    }
];

export function getPresetById(id) {
    return AVATAR_PRESETS.find(p => p.id === id) || null;
}

export function getAvatar(id) {
    return getPresetById(id);
}
