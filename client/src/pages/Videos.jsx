import { useContext, useEffect, useRef, useState } from "react";
import { searchVideos } from "../services/youtube";
import { SessionContext } from "../context/SessionContext";
import VideoCard from "../components/video/VideoCard";
import MoviePlayer from "../components/video/MoviePlayer";
import axios from "axios";

import "../components/video/Videos.css";

function Videos() {

    const fileInputRef = useRef(null);

    const [query, setQuery] = useState("");

    const [videos, setVideos] = useState([]);

    const { roomCode } = useContext(SessionContext);

    const [uploadProgress, setUploadProgress] = useState(0);

    const [uploadedSize, setUploadedSize] = useState("");

const [totalSize, setTotalSize] = useState("");

const [uploadSpeed, setUploadSpeed] = useState("");

const [remainingTime, setRemainingTime] = useState("");

const [uploading, setUploading] = useState(false);

const [uploadStatus, setUploadStatus] = useState("");

    async function loadVideos() {

        if (query.trim() === "") {

            setVideos([]);

            return;

        }

        const result = await searchVideos(query);

        setVideos(result);

    }

async function uploadMovie(file) {

    if (!roomCode) {

        alert("Join a room first.");

        return;

    }

    const formData = new FormData();

    formData.append("movie", file);

    const startTime = Date.now();

    try {

        setUploading(true);
        setUploadProgress(0);
        setUploadStatus("Uploading...");

        const response = await axios.post(

            `${import.meta.env.VITE_API_URL}/upload/${roomCode}`,

            formData,

            {

                headers: {

                    "Content-Type": "multipart/form-data"

                },

                onUploadProgress: (progressEvent) => {

                    const loaded = progressEvent.loaded;

                    const total = progressEvent.total || 1;

                    const percent = Math.round((loaded * 100) / total);

                    setUploadProgress(percent);

                    const loadedMB = (loaded / 1024 / 1024).toFixed(1);

                    const totalMB = (total / 1024 / 1024).toFixed(1);

                    setUploadedSize(loadedMB);

                    setTotalSize(totalMB);

                    const elapsed = (Date.now() - startTime) / 1000;

                    const speed = loaded / elapsed;

                    const speedMB = (speed / 1024 / 1024).toFixed(2);

                    setUploadSpeed(speedMB);

                    const remainingBytes = total - loaded;

                    const secondsLeft = speed > 0
                        ? Math.ceil(remainingBytes / speed)
                        : 0;

                    setRemainingTime(secondsLeft);

                }

            }

        );

        console.log(response.data);

        setUploadProgress(100);

        setUploadStatus("Preparing Movie...");

        setTimeout(() => {

            setUploadStatus("Movie Ready ✅");

        }, 700);

        setTimeout(() => {

            setUploading(false);

            setUploadProgress(0);

            setUploadStatus("");

        }, 1500);

        fileInputRef.current.value = "";

    }

    catch (err) {

        console.error(err);

        setUploading(false);

        setUploadStatus("Upload Failed");

    }

}

    useEffect(() => {

        const timer = setTimeout(loadVideos, 500);

        return () => clearTimeout(timer);

    }, [query]);

    return (

        <div className="videos-page">

            <h1>
                🎬 Watch Together
            </h1>

            <input

                className="video-search"

                placeholder="Search YouTube videos..."

                value={query}

                onChange={(e) => setQuery(e.target.value)}

            />

            <div className="video-grid">

                {

                    videos.map(video => (

                        <VideoCard

                            key={video.id.videoId}

                            video={{

                                title: video.snippet.title,

                                channel: video.snippet.channelTitle,

                                cover: video.snippet.thumbnails.high.url,

                                videoId: video.id.videoId

                            }}

                        />

                    ))

                }

            </div>

            <div className="upload-section">

                <h2>

                    📂 Upload Movie

                </h2>

                <p>

                    Upload a movie from your device and everyone inside the room can watch it together.

                </p>

                <button

                    className="upload-btn"

                    onClick={() => fileInputRef.current.click()}

                >

                    🎬 Choose Movie

                </button>

                {

uploading && (

<div className="upload-progress">

<div className="progress-header">

<div>

<strong>{uploadStatus}</strong>

</div>

<div>

{uploadProgress}%

</div>

</div>

<div className="progress-bar">

<div

className="progress-fill"

style={{

width:`${uploadProgress}%`

}}

></div>

</div>

<div className="upload-details">

<p>

📦 {uploadedSize} MB / {totalSize} MB

</p>

<p>

⚡ {uploadSpeed} MB/s

</p>

<p>

⏳ {remainingTime} sec remaining

</p>

</div>

<div className="progress-bar">

<div

className="progress-fill"

style={{

width: `${uploadProgress}%`

}}

></div>

</div>

</div>

)

}

                <input

                    ref={fileInputRef}

                    type="file"

                    hidden

                    accept="video/*"

                    onChange={(e) => {

                        if (e.target.files.length) {

                            uploadMovie(

                                e.target.files[0]

                            );

                        }

                    }}

                />

            </div>

            <div className="movie-player">

                <MoviePlayer />

            </div>

        </div>

    );

}

export default Videos;