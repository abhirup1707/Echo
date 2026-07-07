import { useContext } from "react";
import { WebRTCContext } from "../../context/WebRTCContext";

function LocalVideoPlayer() {

const {
    localVideoRef,
    videoURL,
    setVideoURL,
    setVideoFile,
    setLocalStream
} = useContext(WebRTCContext);

    function chooseVideo(e){

        const file = e.target.files[0];

        if(!file) return;

        setVideoFile(file);

        const url = URL.createObjectURL(file);

        setVideoURL(url);

    }

function handleLoaded(){

    const stream = localVideoRef.current.captureStream();

    console.log("Video Stream:", stream);

    setLocalStream(stream);

}

    return(

        <div>

            <input

                type="file"

                accept="video/*"

                onChange={chooseVideo}

            />

            {

                videoURL &&

                <video

                    ref={localVideoRef}

                    src={videoURL}

                    controls

                    autoPlay

                    width="100%"

                    onLoadedData={handleLoaded}

                />

            }

        </div>

    );

}

export default LocalVideoPlayer;