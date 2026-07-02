import "./Sidebar.css";

import {
    FaHome,
    FaSearch,
    FaBook,
    FaList,
    FaUsers,
    FaHeart,
    FaCog
} from "react-icons/fa";

import { Link } from "react-router-dom";

function Sidebar(){

    return(

        <div className="sidebar">

            <div className="logo">

                🎵 Echo

            </div>

            <Link to="/">
                <FaHome/> Home
            </Link>

            <Link to="/search">
                <FaSearch/> Search
            </Link>

            <Link to="/library">
                <FaBook/> Library
            </Link>

            <Link to="/playlist">
                <FaList/> Playlist
            </Link>

            <Link to="/room">
                <FaUsers/> Rooms
            </Link>

            <Link to="/profile">
                <FaHeart/> Profile
            </Link>

            <Link to="#">
                <FaCog/> Settings
            </Link>

        </div>

    )

}

export default Sidebar;