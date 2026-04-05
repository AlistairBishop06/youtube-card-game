import {
  formatCompactNumber,
  formatDurationSeconds,
  formatPublishedDate,
} from "./formatters.js";

/** Max values for bar fills (approximate scales for comparison) */
const BAR_CAP = {
  views: 50_000_000,
  likes: 5_000_000,
  comments: 2_000_000,
  ageDays: 5000,
  durationSec: 7200,
  engagement: 5_000_000,
};

/**
 * @param {import("./storage.js").CollectedCard} card
 * @returns {{ id: string, label: string, display: string, bar: number }[]}
 */
export function getStatRows(card) {
  const views = card.viewCount || 0;
  const likes = card.likeCount || 0;
  const comments = card.commentCount || 0;
  const dur = card.durationSeconds || 0;
  const pub = card.publishedAt ? new Date(card.publishedAt) : null;
  const ageDays =
    pub && !Number.isNaN(pub.getTime())
      ? Math.max(
          0,
          Math.floor((Date.now() - pub.getTime()) / (86400 * 1000))
        )
      : 0;
  const engagement = likes + comments;

  const rows = [
    {
      id: "views",
      label: "Views",
      display: formatCompactNumber(views),
      bar: clampBar(views, BAR_CAP.views),
    },
    {
      id: "likes",
      label: "Likes",
      display: formatCompactNumber(likes),
      bar: clampBar(likes, BAR_CAP.likes),
    },
    {
      id: "comments",
      label: "Comments",
      display: formatCompactNumber(comments),
      bar: clampBar(comments, BAR_CAP.comments),
    },
    {
      id: "published",
      label: "Released",
      display: formatPublishedDate(card.publishedAt),
      bar: clampBar(ageDays, BAR_CAP.ageDays),
    },
    {
      id: "duration",
      label: "Length",
      display: formatDurationSeconds(dur),
      bar: clampBar(dur, BAR_CAP.durationSec),
    },
    {
      id: "engagement",
      label: "Buzz",
      display: formatCompactNumber(engagement),
      bar: clampBar(engagement, BAR_CAP.engagement),
    },
  ];

  return rows;
}

function clampBar(value, cap) {
  if (!cap) return 0;
  return Math.min(100, (Math.max(0, value) / cap) * 100);
}
