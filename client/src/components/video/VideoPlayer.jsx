import { useContext } from "react";
import { VideoContext } from "../../context/VideoContext";

function VideoPlayer(){

    const {

        currentVideo,

        isWatching,

        closeVideo

    }=useContext(VideoContext);

    if(!isWatching) return null;

    return(

        <div className="video-overlay">

            <button

            onClick={closeVideo}

            >

                ✕

            </button>

            <iframe

                width="100%"

                height="100%"

                src={`https://www.youtube.com/embed/${currentVideo.videoId}?autoplay=1`}

                allow="autoplay; encrypted-media"

                allowFullScreen

            />

        </div>

    );

}

export default VideoPlayer;