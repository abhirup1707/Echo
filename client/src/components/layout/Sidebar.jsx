import "./Sidebar.css";

import {
    FaHome,
    FaSearch,
    FaVideo,
    FaUsers,
    FaUserCircle,
    FaCog
} from "react-icons/fa";

import { Link, useLocation } from "react-router-dom";

function Sidebar() {

    const location = useLocation();

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
        name: "Session",
        path: "/room",
        icon: <FaUsers />
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

                <span>

                    Listen Together

                </span>

            </div>

            <div className="sidebar-menu">

                {

                    menu.map(item => (

                        <Link

                            key={item.path}

                            to={item.path}

                            className={location.pathname === item.path ? "active-link" : ""}

                        >

                            {item.icon}

                            <span>

                                {item.name}

                            </span>

                        </Link>

                    ))

                }

            </div>

        </div>

    );

}

export default Sidebar;