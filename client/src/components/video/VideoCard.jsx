import { useContext } from "react";
import { SessionContext } from "../../context/SessionContext";
import "./VideoCard.css";


function VideoCard({ video }) {

const { sendVideo } = useContext(SessionContext);
const { roomCode } = useContext(SessionContext);
    return (

        <div className="video-card">

            <img

                src={video.cover}

                alt={video.title}

            />

            <div className="video-info">

                <h3>

                    {video.title}

                </h3>

                <p>

                    {video.channel}

                </p>

            </div>

<button

className="watch-btn"

onClick={() => sendVideo(video)}

>

▶ Watch Together

</button>

        </div>

    );

}

export default VideoCard;