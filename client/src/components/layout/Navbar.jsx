import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { ProfileContext } from "../../context/ProfileContext";
import { SessionContext } from "../../context/SessionContext";
import UserAvatar from "../common/UserAvatar";
import "./Navbar.css";

function Navbar() {
  const navigate = useNavigate();
  const { profile } = useContext(ProfileContext);
  const { roomCode } = useContext(SessionContext);
  const initial = profile.username ? profile.username.charAt(0).toUpperCase() : "?";

  return (
    <div className="navbar">
      <div
        className="nav-title"
        onClick={() => navigate("/")}
        title="Go to Home"
      >
        🎵 Echo Music
      </div>

      <div className="nav-right">
        {roomCode && (
          <div
            className="nav-room-pill"
            onClick={() => navigate("/room")}
            title="Current Echo Room Session"
          >
            <span className="nav-room-dot" />
            <span>Room: {roomCode}</span>
          </div>
        )}

        <div
          className="profile-nav-btn"
          onClick={() => navigate("/profile")}
          title={`Signed in as ${profile.username || "Guest"} - Click to view profile`}
        >
          <UserAvatar
            avatar={profile.avatar}
            username={profile.username}
            size={36}
          />
        </div>
      </div>
    </div>
  );
}

export default Navbar;