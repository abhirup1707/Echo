import { useContext, useState } from "react";
import { ProfileContext } from "../context/ProfileContext";
import UserAvatar from "../components/common/UserAvatar";
import AvatarModal from "../components/profile/AvatarModal";
import "./Profile.css";

function Profile() {
    const { profile, updateAvatar } = useContext(ProfileContext);
    const [showAvatarModal, setShowAvatarModal] = useState(false);

    return (
        <div className="profile-page">
            <div className="profile-header">
                {/* Avatar with Interactive Edit Overlay */}
                <div
                    className="profile-avatar-container"
                    onClick={() => setShowAvatarModal(true)}
                    title="Click to change profile avatar"
                >
                    <UserAvatar
                        avatar={profile.avatar}
                        username={profile.username}
                        size={116}
                        className="profile-main-avatar"
                    />
                    <div className="profile-avatar-edit-badge">
                        <span>📸 Edit</span>
                    </div>
                </div>

                <h1>{profile.username || "Guest User"}</h1>
                <div className="profile-badge-row">
                    <span className="profile-role-pill">⭐ Echo Pro Member</span>
                    <span className="profile-status-pill">● Online</span>
                </div>
                <button
                    className="profile-change-avatar-btn"
                    onClick={() => setShowAvatarModal(true)}
                >
                    🎨 Change Avatar & Photo
                </button>
            </div>

            {/* Quick Stats */}
            <div className="profile-stats">
                <div className="stat-box">
                    <h2>{profile.songsPlayed}</h2>
                    <span>🎵 Songs Played</span>
                </div>

                <div className="stat-box">
                    <h2>{profile.songsQueued}</h2>
                    <span>➕ Songs Queued</span>
                </div>

                <div className="stat-box">
                    <h2>{profile.sessionsJoined}</h2>
                    <span>🎧 Sessions Joined</span>
                </div>
            </div>

            {/* Favorite Artist */}
            <div className="profile-card">
                <div className="profile-card-header">
                    <h2>⭐ Favorite Artist</h2>
                    <span className="profile-card-tag">Music DNA</span>
                </div>
                <p className="favorite-artist-text">
                    {profile.favoriteArtist || "Stream your first songs together to discover your top artist!"}
                </p>
            </div>

            {/* Recently Played */}
            <div className="profile-card">
                <div className="profile-card-header">
                    <h2>🕒 Recently Played</h2>
                    <span className="profile-card-tag">History</span>
                </div>

                {profile.recentSongs && profile.recentSongs.length === 0 ? (
                    <p style={{ color: "#94a3b8", margin: 0 }}>No songs played in this session yet.</p>
                ) : (
                    <div className="recent-songs-list">
                        {(profile.recentSongs || []).map(song => (
                            <div key={song.videoId || song.title} className="recent-song">
                                <img src={song.cover} alt={song.title} />
                                <div className="recent-song-info">
                                    <strong>{song.title}</strong>
                                    <p>{song.artist}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Last Session Room */}
            <div className="profile-card">
                <div className="profile-card-header">
                    <h2>🎧 Last Session</h2>
                    <span className="profile-card-tag">Rooms</span>
                </div>
                <p style={{ color: "#e2e8f0", fontWeight: 600, margin: 0 }}>
                    {profile.lastRoom ? `Room Code: ${profile.lastRoom}` : "No session joined yet"}
                </p>
            </div>

            {/* Avatar Selector Modal */}
            {showAvatarModal && (
                <AvatarModal
                    currentAvatar={profile.avatar}
                    username={profile.username}
                    onClose={() => setShowAvatarModal(false)}
                    onSave={(newAvatar) => updateAvatar(newAvatar)}
                />
            )}
        </div>
    );
}

export default Profile;