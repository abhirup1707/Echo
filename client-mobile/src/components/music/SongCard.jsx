import { FaPlay } from "react-icons/fa";
import "./SongCard.css";

function SongCard({
    song,
    onPlay,
    onQueue
}) {
  return (
    <div className="song-card">

      <img
        src={song.cover}
        alt={song.title}
        className="song-image"
      />

      <div className="song-info">

        <h3
          className="song-title"
          title={song.title}
        >
          {song.title}
        </h3>

        <p
          className="song-artist"
          title={song.artist}
        >
          {song.artist}
        </p>

      </div>

 <div className="song-actions">

    <button
        className="play-btn"
        onClick={() => onPlay(song)}
    >
        ▶
    </button>

    <button
        className="queue-song-btn"
        onClick={() => onQueue(song)}
    >
        ＋
    </button>

</div>

    </div>
  );
}

export default SongCard;