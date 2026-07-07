import { useContext } from "react";
import { useLocation } from "react-router-dom";
import { SessionContext } from "../../context/SessionContext";
import "./FloatingVideoPlayer.css";

function FloatingVideoPlayer() {

   const {

    currentVideo,

    setCurrentVideo

} = useContext(SessionContext);
    const location = useLocation();

const isVideosPage = location.pathname === "/videos";

    if (!currentVideo) return null;

    return (

        <div className={isVideosPage ? "video-large" : "video-mini"}>

            <button

className="close-video"

onClick={() => setCurrentVideo(null)}

>

✕

</button>

            <iframe

                src={`https://www.youtube.com/embed/${currentVideo.videoId}?autoplay=1&rel=0`}

                title={currentVideo.title}

                allow="autoplay; encrypted-media"

                allowFullScreen

            />

            <div className={isVideosPage ? "floating-info" : "mini-info"}>

                <h3>{currentVideo.title}</h3>

                <p>{currentVideo.channel}</p>

            </div>

        </div>

    );

}

export default FloatingVideoPlayer;