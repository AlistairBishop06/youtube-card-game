import { YOUTUBE_API_KEY } from "./config.js";
import { rarityFromViews } from "./rarity.js";
import { parseIsoDuration } from "./formatters.js";

const BASE = "https://www.googleapis.com/youtube/v3";

/** Valid YouTube guide category IDs (sample across niches) */
const VIDEO_CATEGORIES = [
  "1", "2", "10", "15", "17", "18", "19", "20", "21", "22", "23", "24", "25",
  "26", "27", "28", "29", "30", "31", "32", "33", "34", "35", "36", "37", "38",
  "39", "40", "41", "42", "43", "44",
];

function randomInt(max) {
  return Math.floor(Math.random() * max);
}

function randomItem(arr) {
  return arr[randomInt(arr.length)];
}

/** RFC 3339 time N hours before now */
function isoHoursAgo(hours) {
  const d = new Date(Date.now() - hours * 3600 * 1000);
  return d.toISOString();
}

/** Random calendar window in the past (surfaces old / obscure uploads) */
function randomHistoricalWindow() {
  const now = Date.now();
  const minPast = 2 * 86400000; // 2d ago
  const maxPast = 15 * 365.25 * 86400000; // ~15y
  const start = now - (minPast + Math.random() * (maxPast - minPast));
  const windowMs = (5 + Math.random() * 40) * 86400000; // 5–45 day slice
  return {
    publishedAfter: new Date(start).toISOString(),
    publishedBefore: new Date(start + windowMs).toISOString(),
  };
}

/** Very recent window: last minutes to ~4 days (0-view uploads often here) */
function randomFreshWindow() {
  const minutes = 15 + randomInt(6000); // 15 min – ~4 days
  return isoHoursAgo(minutes / 60);
}

/**
 * Minimal / noisy queries — avoids only “trending topic” style seeds.
 * YouTube Search cannot enumerate “all videos”; this biases toward long-tail + new.
 */
function randomSearchQuery() {
  const asciiLo = () => String.fromCharCode(97 + randomInt(26));
  const digit = () => String.fromCharCode(48 + randomInt(10));
  const hex = () =>
    Array.from(crypto.getRandomValues(new Uint8Array(2)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

  const strategies = [
    () => asciiLo(),
    () => digit(),
    () => asciiLo() + asciiLo(),
    () => asciiLo() + digit(),
    () => `${asciiLo()} ${digit()}`, // space breaks token a bit
    () => hex(),
    () => `_${hex()}`,
    () => randomItem(["vid", "vlog", "ep", "pt", "raw", "cap", "test", "a"]),
    () => randomItem(["the", "and", "or", "of", "i", "no", "ok", "hi"]),
    () => randomItem(["asmr", "minecraft", "shorts", "clip", "full", "live"]),
    () => String.fromCharCode(0x3040 + randomInt(80)), // hiragana block sample
  ];
  return randomItem(strategies)();
}

function randomOrder() {
  /** `viewCount` / `videoCount` skew popular; use rarely for spice */
  const common = ["date", "relevance", "title", "rating"];
  const r = Math.random();
  if (r < 0.72) return randomItem(common);
  if (r < 0.9) return "viewCount";
  return "videoCount";
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
 * One search.list call (optionally with pageToken).
 * @param {URLSearchParams} params
 * @param {string} [pageToken]
 */
async function searchPage(params, pageToken) {
  const u = new URL(`${BASE}/search`);
  params.forEach((v, k) => u.searchParams.set(k, v));
  if (pageToken) u.searchParams.set("pageToken", pageToken);
  const data = await fetchJson(u.toString());
  return {
    items: data.items || [],
    nextPageToken: data.nextPageToken || "",
  };
}

/** @returns {Promise<object | null>} */
async function oneDiscoveryAttempt() {
  const q = randomSearchQuery();
  const order = randomOrder();

  const params = new URLSearchParams({
    part: "snippet",
    type: "video",
    maxResults: "50",
    key: YOUTUBE_API_KEY,
    order,
    q,
  });

  const roll = Math.random();

  if (roll < 0.34) {
    params.set("order", "date");
    params.set("publishedAfter", randomFreshWindow());
  } else if (roll < 0.58) {
    const w = randomHistoricalWindow();
    params.set("order", "date");
    params.set("publishedAfter", w.publishedAfter);
    params.set("publishedBefore", w.publishedBefore);
  } else if (roll < 0.72) {
    params.set("videoCategoryId", randomItem(VIDEO_CATEGORIES));
    if (Math.random() < 0.65) params.set("order", "date");
  } else if (roll < 0.82) {
    params.set("order", "date");
    params.set("publishedAfter", isoHoursAgo(24 * (1 + randomInt(14))));
  }

  const maxPages = 1 + randomInt(3);
  const collected = [];
  let pageToken = "";

  for (let p = 0; p < maxPages; p++) {
    const { items, nextPageToken } = await searchPage(params, pageToken);
    for (const it of items) collected.push(it);
    pageToken = nextPageToken;
    if (!pageToken || !items.length) break;
  }

  if (!collected.length) return null;

  const byId = new Map();
  for (const it of collected) {
    const id = it.id?.videoId;
    if (id) byId.set(id, it);
  }
  const unique = [...byId.values()];
  if (!unique.length) return null;

  let pool = unique;
  if (unique.length > 6 && Math.random() < 0.62) {
    const quarter = Math.max(1, Math.floor(unique.length * 0.22));
    const start = randomInt(Math.max(1, unique.length - quarter));
    pool = unique.slice(start);
  }

  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const ids = shuffled
    .map((item) => item.id?.videoId)
    .filter(Boolean)
    .slice(0, 25);

  const details = await fetchVideoDetails(ids);
  if (!details.length) return null;

  const pick = randomItem(details);
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

  const maxAttempts = 14;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const found = await oneDiscoveryAttempt();
      if (found) return found;
    } catch {
      /* try next random strategy */
    }
  }

  throw new Error(
    "Could not find a video — try again (search is random; some rolls return empty)."
  );
}
