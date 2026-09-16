import { useContext } from "react";
import "./Sidebar.css";

import {
    FaHome,
    FaSearch,
    FaVideo,
    FaTv,
    FaUsers,
    FaUserCircle,
    FaCog,
    FaGamepad
} from "react-icons/fa";
import { Link, useLocation } from "react-router-dom";
import { SessionContext } from "../../context/SessionContext";
import { StreamContext } from "../../context/StreamContext";

function Sidebar() {
    const location = useLocation();
    const { hasUnreadChat } = useContext(SessionContext);
    const { activeStream } = useContext(StreamContext);
    const activeGamePath = sessionStorage.getItem("echo_active_game") || "/games";

    const menu = [
        {
            name: "Home",
            path: "/",
            icon: <FaHome />
        },
        {
            name: "Music",
            path: "/search",
            icon: <FaSearch />
        },
        {
            name: "Videos",
            path: "/videos",
            icon: <FaVideo />
        },
        {
            name: "Watch Party",
            path: "/stream",
            icon: <FaTv />,
            hasDot: Boolean(activeStream)
        },
        {
            name: "Session",
            path: "/room",
            icon: <FaUsers />,
            hasDot: hasUnreadChat
        },
        {
            name: "Mini Games",
            path: activeGamePath,
            basePath: "/games",
            icon: <FaGamepad />
        },
        {
            name: "Profile",
            path: "/profile",
            icon: <FaUserCircle />
        },
        {
            name: "Settings",
            path: "/settings",
            icon: <FaCog />
        }
    ];

    return (
        <div className="sidebar">
            <div className="logo">
                🎵 Echo
                <span>Listen Together</span>
            </div>

            <div className="sidebar-menu">
                {menu.map(item => {
                    const isActive = item.basePath
                        ? location.pathname.startsWith(item.basePath)
                        : location.pathname === item.path;

                    return (
                        <Link
                            key={item.name}
                            to={item.path}
                            className={isActive ? "active-link" : ""}
                        >
                            <div className="sidebar-icon-wrap">
                                {item.icon}
                                {item.hasDot && <span className="sidebar-unread-dot" title="New chat message" />}
                            </div>
                            <span>{item.name}</span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}

export default Sidebar;