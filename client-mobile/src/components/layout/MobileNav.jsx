import { useContext } from "react";
import {
    FaHome,
    FaSearch,
    FaVideo,
    FaTv,
    FaUsers,
    FaUser,
    FaCog,
    FaGamepad
} from "react-icons/fa";
import { NavLink } from "react-router-dom";
import { SessionContext } from "../../context/SessionContext";
import { StreamContext } from "../../context/StreamContext";
import "./MobileNav.css";

export default function MobileNav() {
    const { hasUnreadChat } = useContext(SessionContext);
    const { activeStream } = useContext(StreamContext);
    const activeGamePath = sessionStorage.getItem("echo_active_game") || "/games";

    return (
        <div className="mobile-nav">
            <NavLink to="/">
                <FaHome />
            </NavLink>

            <NavLink to="/search">
                <FaSearch />
            </NavLink>

            <NavLink to="/videos">
                <FaVideo />
            </NavLink>

            <NavLink to="/stream" title="Watch Party">
                <div className="mobile-icon-wrap">
                    <FaTv />
                    {Boolean(activeStream) && <span className="mobile-unread-dot" />}
                </div>
            </NavLink>

            <NavLink to={activeGamePath}>
                <FaGamepad />
            </NavLink>

            <NavLink to="/room">
                <div className="mobile-icon-wrap">
                    <FaUsers />
                    {hasUnreadChat && <span className="mobile-unread-dot" />}
                </div>
            </NavLink>

            <NavLink to="/profile">
                <FaUser />
            </NavLink>

            <NavLink to="/settings">
                <FaCog />
            </NavLink>
        </div>
    );
}