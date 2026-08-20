import { useState, useEffect, useContext } from "react";
import { searchSongs } from "../services/youtube";
import { SessionContext } from "../context/SessionContext";
import { ProfileContext } from "../context/ProfileContext";
import "./Search.css";

import SongCard from "../components/music/SongCard";

function Search() {

  const [query, setQuery] = useState("");
const { profile } = useContext(ProfileContext);
  const [songs, setSongs] = useState([]);

  const {
    sendSong,
    addToQueue,
    username
} = useContext(SessionContext);

  async function handleSearch() {

    if(query.trim()===""){

      setSongs([]);

      return;

    }

    const results=await searchSongs(query);

    setSongs(results);

  }

  useEffect(()=>{

    const timer=setTimeout(()=>{

      handleSearch();

    },500);

    return()=>clearTimeout(timer);

  },[query]);

  return(

    <div className="search-page">

      <h1 className="search-title">

        Search Music

      </h1>

      <input

      className="search-input"

      placeholder="Search your favourite songs..."

      value={query}

      onChange={(e)=>setQuery(e.target.value)}

      />

      <div className="results-grid">

        {

          songs.map(song=>(

<SongCard

    key={song.id.videoId}

    song={{

        title: song.snippet.title,

        artist: song.snippet.channelTitle,

        cover: song.snippet.thumbnails.high.url,

        videoId: song.id.videoId

    }}

    onPlay={sendSong}

    onQueue={(song) => addToQueue(song, profile.username)}

/>

          ))

        }

      </div>

    </div>

  )

}

export default Search;
