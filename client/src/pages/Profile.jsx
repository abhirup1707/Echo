import { useContext } from "react";
import { ProfileContext } from "../context/ProfileContext";
import "./Profile.css";

function Profile() {

    const { profile } = useContext(ProfileContext);

    const initials = profile.username
        .split(" ")
        .map(word => word[0])
        .join("")
        .toUpperCase();

    return (

        <div className="profile-page">

            <div className="profile-header">

                <div className="profile-avatar">

                    {initials}

                </div>

                <h1>{profile.username}</h1>

                <p>🎵 Listen Together</p>

            </div>

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

            <div className="profile-card">

                <h2>⭐ Favorite Artist</h2>

                <p>

                    {profile.favoriteArtist || "No data yet"}

                </p>

            </div>

            <div className="profile-card">

                <h2>🕒 Recently Played</h2>

                {

                    profile.recentSongs.length === 0

                    ?

                    <p>No songs played yet.</p>

                    :

                    profile.recentSongs.map(song=>(

                        <div
                            key={song.videoId}
                            className="recent-song"
                        >

                            <img
                                src={song.cover}
                                alt=""
                            />

                            <div>

                                <strong>

                                    {song.title}

                                </strong>

                                <p>

                                    {song.artist}

                                </p>

                            </div>

                        </div>

                    ))

                }

            </div>

            <div className="profile-card">

                <h2>🎧 Last Session</h2>

                <p>

                    {profile.lastRoom || "No session joined yet"}

                </p>

            </div>

        </div>

    );

}

export default Profile;