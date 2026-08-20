import { useContext } from "react";
import { ProfileContext } from "../../context/ProfileContext";
import "./Navbar.css";

function Navbar() {
  const { profile } = useContext(ProfileContext);
  const initial = profile.username ? profile.username.charAt(0).toUpperCase() : "?";

  return (
    <div className="navbar">
      <div className="nav-title">
        🎵 Echo Music
      </div>

      <div className="profile">
        {initial}
      </div>
    </div>
  );
}

export default Navbar;