import { useContext, useState, useMemo } from "react";
import { ProfileContext } from "../context/ProfileContext";
import UserAvatar from "../components/common/UserAvatar";
import AvatarModal from "../components/profile/AvatarModal";
import "./Welcome.css";

function Welcome() {
    const [name, setName] = useState("");
    const [selectedAvatar, setSelectedAvatar] = useState("");
    const [showAvatarModal, setShowAvatarModal] = useState(false);
    const { profile, setProfile } = useContext(ProfileContext);

    // Detect if user opened an invite link (/join/:roomCode)
    const inviteRoomCode = useMemo(() => {
        const path = window.location.pathname;
        const match = path.match(/\/join\/([a-zA-Z0-9_-]+)/i);
        if (match && match[1]) return match[1].toUpperCase();

        const params = new URLSearchParams(window.location.search);
        const queryCode = params.get("join") || params.get("room") || params.get("code");
        if (queryCode) return queryCode.toUpperCase();

        return (sessionStorage.getItem("echo_auto_join_room") || "").toUpperCase();
    }, []);

    function continueApp() {
        if (!name.trim()) return;

        if (inviteRoomCode) {
            sessionStorage.setItem("echo_auto_join_room", inviteRoomCode);
            sessionStorage.setItem("echoRoomCode", inviteRoomCode);
        }

        setProfile({
            ...profile,
            username: name.trim(),
            avatar: selectedAvatar || ""
        });
    }

    function handleKeyDown(e) {
        if (e.key === "Enter") {
            continueApp();
        }
    }

    return (
        <div className="welcome-container">
            <div className="welcome-glow-1" />
            <div className="welcome-glow-2" />

            <div className="welcome-card">
                {inviteRoomCode ? (
                    <div className="welcome-invite-badge">
                        <span className="welcome-invite-dot" />
                        <span>Invited to Room <strong>#{inviteRoomCode}</strong></span>
                    </div>
                ) : (
                    <div className="welcome-logo-badge">
                        <span>🎧</span> Echo Music & Watch Party
                    </div>
                )}

                <h1 className="welcome-title">
                    {inviteRoomCode ? "Join Session" : "Welcome"}
                </h1>
                <p className="welcome-subtitle">
                    {inviteRoomCode
                        ? `Enter your name below to join Room #${inviteRoomCode} and hang out with your friends!`
                        : "Listen to music, watch videos, and play games together with friends in real-time."
                    }
                </p>

                {/* Avatar Preview & Selection */}
                <div
                    className="welcome-avatar-wrap"
                    onClick={() => setShowAvatarModal(true)}
                    title="Choose an avatar or upload photo"
                >
                    <div className="welcome-avatar-circle">
                        <UserAvatar
                            avatar={selectedAvatar}
                            username={name || "You"}
                            size={92}
                        />
                    </div>
                    <span className="welcome-avatar-hint">
                        {selectedAvatar ? "✓ Avatar Selected • Tap to change" : "+ Pick Avatar / Photo"}
                    </span>
                </div>

                {/* Name Input */}
                <div className="welcome-input-wrap">
                    <label className="welcome-input-label">Your Username</label>
                    <input
                        className="welcome-input"
                        placeholder="e.g. Alex, NeonVibe, Melody..."
                        value={name}
                        autoFocus
                        maxLength={25}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />
                </div>

                {/* Submit Button */}
                <button
                    className="welcome-btn"
                    disabled={!name.trim()}
                    onClick={continueApp}
                >
                    {inviteRoomCode ? `🚀 Join Room #${inviteRoomCode}` : "🚀 Enter Echo"}
                </button>
            </div>

            {/* Avatar Modal */}
            {showAvatarModal && (
                <AvatarModal
                    currentAvatar={selectedAvatar}
                    username={name || "Guest"}
                    onClose={() => setShowAvatarModal(false)}
                    onSave={(avatar) => setSelectedAvatar(avatar)}
                />
            )}
        </div>
    );
}

export default Welcome;