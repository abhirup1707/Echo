import { useContext, useEffect, useRef, useState } from "react";
import { searchVideos } from "../services/youtube";
import { SessionContext } from "../context/SessionContext";
import VideoCard from "../components/video/VideoCard";
import MoviePlayer from "../components/video/MoviePlayer";

import "../components/video/Videos.css";

function Videos() {

    const fileInputRef = useRef(null);

    const [query, setQuery] = useState("");

    const [videos, setVideos] = useState([]);

    const { roomCode } = useContext(SessionContext);

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

        const response = await fetch(

            `${import.meta.env.VITE_API_URL}/upload/${roomCode}`,

            {

                method: "POST",

                body: formData

            }

        );

        const data = await response.json();

        console.log(data);

        // Allow selecting the same movie again later
        fileInputRef.current.value = "";

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