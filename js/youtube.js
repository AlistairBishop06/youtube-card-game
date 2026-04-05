import { YOUTUBE_API_KEY } from "./config.js";
import { rarityFromViews } from "./rarity.js";
import { parseIsoDuration } from "./formatters.js";

const BASE = "https://www.googleapis.com/youtube/v3";

/** Seeds for varied search queries */
const QUERY_SEEDS = [
  "lofi music",
  "cooking tutorial",
  "documentary nature",
  "retro gaming",
  "science explained",
  "travel vlog",
  "woodworking",
  "astronomy",
  "comedy sketch",
  "wildlife",
  "history",
  "art timelapse",
  "motorcycle",
  "ocean",
  "space news",
  "indie game",
  "piano cover",
  "street food",
  "animation short",
  "tech review",
];

function randomInt(max) {
  return Math.floor(Math.random() * max);
}

function pickRandomQuery() {
  return QUERY_SEEDS[randomInt(QUERY_SEEDS.length)];
}

/**
 * @param {string} url
 */
async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`YouTube API error ${res.status}: ${err.slice(0, 200)}`);
  }
  return res.json();
}

/**
 * Fetch video details: snippet, statistics, contentDetails.
 * @param {string[]} ids
 */
async function fetchVideoDetails(ids) {
  if (!ids.length) return [];
  const params = new URLSearchParams({
    part: "snippet,statistics,contentDetails",
    id: ids.join(","),
    key: YOUTUBE_API_KEY,
  });
  const data = await fetchJson(`${BASE}/videos?${params}`);
  return data.items || [];
}

/**
 * @returns {Promise<{
 *   videoId: string,
 *   title: string,
 *   channelTitle: string,
 *   thumbnailUrl: string,
 *   viewCount: number,
 *   likeCount: number,
 *   commentCount: number,
 *   publishedAt: string,
 *   durationSeconds: number,
 *   rarity: "common"|"rare"|"epic"|"legendary"
 * }>}
 */
export async function pullRandomVideo() {
  if (!YOUTUBE_API_KEY || !String(YOUTUBE_API_KEY).trim()) {
    throw new Error(
      "Set YOUTUBE_API_KEY in js/config.js (YouTube Data API v3 browser key)."
    );
  }

  const maxAttempts = 6;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const q = pickRandomQuery();
    const params = new URLSearchParams({
      part: "snippet",
      type: "video",
      maxResults: "50",
      q,
      key: YOUTUBE_API_KEY,
    });
    const searchData = await fetchJson(`${BASE}/search?${params}`);
    const rawItems = searchData.items || [];
    if (!rawItems.length) continue;

    const shuffled = [...rawItems].sort(() => Math.random() - 0.5);
    const ids = shuffled
      .map((item) => item.id?.videoId)
      .filter(Boolean)
      .slice(0, 25);

    const details = await fetchVideoDetails(ids);
    if (!details.length) continue;

    const pick = details[randomInt(details.length)];
    const vid = pick.id;
    const sn = pick.snippet;
    const stats = pick.statistics;
    const cd = pick.contentDetails;
    const thumbs = sn.thumbnails || {};
    const thumb =
      thumbs.maxres?.url ||
      thumbs.high?.url ||
      thumbs.medium?.url ||
      thumbs.default?.url ||
      "";

    const viewCount = parseInt(stats?.viewCount || "0", 10);
    const likeCount = parseInt(stats?.likeCount || "0", 10);
    const commentCount = parseInt(stats?.commentCount || "0", 10);
    const publishedAt = sn.publishedAt || "";
    const durationSeconds = parseIsoDuration(cd?.duration || "");

    return {
      videoId: vid,
      title: sn.title || "Untitled",
      channelTitle: sn.channelTitle || "Unknown channel",
      thumbnailUrl: thumb,
      viewCount,
      likeCount,
      commentCount,
      publishedAt,
      durationSeconds,
      rarity: rarityFromViews(viewCount),
    };
  }

  throw new Error("Could not find a video — try again or check API quota.");
}
