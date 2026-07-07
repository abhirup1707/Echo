import {

FaHome,

FaSearch,

FaVideo,

FaUsers,

FaUser,

FaCog

} from "react-icons/fa";

import { NavLink } from "react-router-dom";

import "./MobileNav.css";

export default function MobileNav(){

return(

<div className="mobile-nav">

<NavLink to="/">

<FaHome/>

</NavLink>

<NavLink to="/search">

<FaSearch/>

</NavLink>


<NavLink to="/videos">

<FaVideo/>

</NavLink>

<NavLink to="/room">

<FaUsers/>

</NavLink>

<NavLink to="/profile">

<FaUser/>

</NavLink>

<NavLink to="/settings">

    <FaCog/>

</NavLink>

</div>

);

}