import { useContext, useState } from "react";
import { ProfileContext } from "../context/ProfileContext";
import UserAvatar from "../components/common/UserAvatar";
import AvatarModal from "../components/profile/AvatarModal";
import { getAvatar } from "../utils/avatars";
import { FaCamera, FaUserEdit, FaTrashAlt, FaCheck, FaSlidersH, FaVolumeUp } from "react-icons/fa";
import "./Settings.css";

function Settings() {
    const { profile, setProfile, updateAvatar } = useContext(ProfileContext);
    const [newName, setNewName] = useState(profile.username);
    const [savedNotice, setSavedNotice] = useState(false);
    const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
    const [hdAudio, setHdAudio] = useState(true);
    const [smoothTransition, setSmoothTransition] = useState(true);

    const activeAvatar = getAvatar(profile.avatar);

    function saveName() {
        if (!newName.trim()) return;
        setProfile({
            ...profile,
            username: newName.trim()
        });
        setSavedNotice(true);
        setTimeout(() => setSavedNotice(false), 2500);
    }

    function resetProfile() {
        const confirmReset = window.confirm(
            "This will erase your local profile, custom avatar, and session statistics. Continue?"
        );
        if (!confirmReset) return;
        localStorage.removeItem("echo-profile");
        window.location.reload();
    }

    return (
        <div className="settings-page">
            <div className="settings-header">
                <span className="settings-badge">PREFERENCES & ACCOUNT</span>
                <h1>App Settings</h1>
                <p className="settings-subtitle">
                    Personalize your identity, playback preferences, and audio profile.
                </p>
            </div>

            {/* Profile Avatar Card */}
            <div className="settings-card avatar-settings-card">
                <div className="avatar-settings-preview">
                    <UserAvatar
                        avatar={profile.avatar}
                        username={profile.username}
                        size={88}
                    />
                    <button
                        className="avatar-camera-btn"
                        onClick={() => setIsAvatarModalOpen(true)}
                        title="Change Avatar"
                    >
                        <FaCamera />
                    </button>
                </div>
                <div className="avatar-settings-info">
                    <h2>Profile Avatar</h2>
                    <p>
                        {profile.avatar
                            ? activeAvatar
                                ? `Active preset: ${activeAvatar.name}`
                                : "Custom photo from your device camera/album"
                            : "Default initial monogram avatar"}
                    </p>
                    <div className="avatar-settings-actions">
                        <button
                            className="settings-action-btn primary"
                            onClick={() => setIsAvatarModalOpen(true)}
                        >
                            <FaCamera style={{ marginRight: 6 }} /> Choose Avatar or Photo
                        </button>
                        {profile.avatar && (
                            <button
                                className="settings-action-btn secondary"
                                onClick={() => updateAvatar("")}
                            >
                                Reset to Initial
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Display Name Card */}
            <div className="settings-card">
                <div className="settings-card-header">
                    <FaUserEdit className="settings-icon" />
                    <div>
                        <h2>Display Name</h2>
                        <p>Change how your name appears in rooms, voice calls, and session chat.</p>
                    </div>
                </div>

                <div className="settings-input-group">
                    <input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Enter your name"
                        maxLength={24}
                    />
                    <button className="settings-save-btn" onClick={saveName}>
                        {savedNotice ? (
                            <>
                                <FaCheck style={{ marginRight: 6 }} /> Saved!
                            </>
                        ) : (
                            "Save Name"
                        )}
                    </button>
                </div>
            </div>

            {/* Playback & Audio Card */}
            <div className="settings-card">
                <div className="settings-card-header">
                    <FaSlidersH className="settings-icon" />
                    <div>
                        <h2>Audio Engine & Stream Quality</h2>
                        <p>Fine-tune real-time audio playback and stream buffering.</p>
                    </div>
                </div>

                <div className="settings-toggle-row">
                    <div>
                        <strong>HD Audio Quality (Lossless 320kbps)</strong>
                        <p>Prioritizes high-bitrate audio streams when bandwidth permits.</p>
                    </div>
                    <label className="settings-switch">
                        <input
                            type="checkbox"
                            checked={hdAudio}
                            onChange={(e) => setHdAudio(e.target.checked)}
                        />
                        <span className="slider"></span>
                    </label>
                </div>

                <div className="settings-toggle-row">
                    <div>
                        <strong>Smooth Crossfade & Buffer Shield</strong>
                        <p>Preloads upcoming queue songs to avoid gaps between tracks.</p>
                    </div>
                    <label className="settings-switch">
                        <input
                            type="checkbox"
                            checked={smoothTransition}
                            onChange={(e) => setSmoothTransition(e.target.checked)}
                        />
                        <span className="slider"></span>
                    </label>
                </div>
            </div>

            {/* Danger Zone */}
            <div className="settings-card danger">
                <div className="settings-card-header">
                    <FaTrashAlt className="settings-icon danger-icon" />
                    <div>
                        <h2>Developer & Reset Options</h2>
                        <p>Erase your saved local profile, avatar, and room history from this browser.</p>
                    </div>
                </div>

                <button className="reset-btn" onClick={resetProfile}>
                    <FaTrashAlt style={{ marginRight: 8 }} /> Reset Local Profile
                </button>
            </div>

            {/* Avatar Modal */}
            {isAvatarModalOpen && (
                <AvatarModal
                    isOpen={isAvatarModalOpen}
                    currentAvatar={profile.avatar}
                    username={profile.username}
                    onClose={() => setIsAvatarModalOpen(false)}
                    onSave={(newAvatar) => updateAvatar(newAvatar)}
                />
            )}
        </div>
    );
}

export default Settings;