const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;

const BASE_URL = "https://www.googleapis.com/youtube/v3/search";

export async function searchSongs(query) {
  const response = await fetch(
    `${BASE_URL}?part=snippet&type=video&videoCategoryId=10&maxResults=10&q=${encodeURIComponent(query)}&key=${API_KEY}`
  );

  const data = await response.json();

  return data.items;
}