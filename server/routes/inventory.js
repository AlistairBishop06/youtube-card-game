import { Router } from "express";
import { db, rowToCard } from "../db.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();
router.use(requireAuth);

function statsForUser(userId) {
  const rows = db
    .prepare(
      `SELECT COUNT(*) AS unique_count, COALESCE(SUM(quantity), 0) AS total_qty
       FROM user_cards WHERE user_id = ?`
    )
    .get(userId);
  return {
    unique: rows?.unique_count ?? 0,
    total: rows?.total_qty ?? 0,
  };
}

router.get("/", (req, res) => {
  const rows = db
    .prepare(
      `SELECT video_id, title, channel_title, thumbnail_url, view_count, like_count,
              comment_count, published_at, duration_seconds, rarity, quantity,
              first_discovery, pulled_at
       FROM user_cards WHERE user_id = ? ORDER BY pulled_at DESC`
    )
    .all(req.session.userId);
  const cards = rows.map(rowToCard);
  res.json({ cards, stats: statsForUser(req.session.userId) });
});

router.get("/export", (req, res) => {
  const rows = db
    .prepare(
      `SELECT video_id, title, channel_title, thumbnail_url, view_count, like_count,
              comment_count, published_at, duration_seconds, rarity, quantity,
              first_discovery, pulled_at
       FROM user_cards WHERE user_id = ?`
    )
    .all(req.session.userId);
  const cards = rows.map(rowToCard);
  res.setHeader("Content-Type", "application/json");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="video-gacha-inventory.json"'
  );
  res.send(JSON.stringify({ exportedAt: new Date().toISOString(), cards }, null, 2));
});

/**
 * Register pull result: global discovery + per-user upsert.
 */
router.post("/pull", (req, res) => {
  const b = req.body || {};
  const videoId = String(b.videoId || "").trim();
  if (!videoId) {
    return res.status(400).json({ error: "videoId required." });
  }

  const title = String(b.title || "Untitled").slice(0, 500);
  const channelTitle = String(b.channelTitle || "").slice(0, 300);
  const thumbnailUrl = String(b.thumbnailUrl || "").slice(0, 2000);
  const viewCount = Math.max(0, parseInt(b.viewCount, 10) || 0);
  const likeCount = Math.max(0, parseInt(b.likeCount, 10) || 0);
  const commentCount = Math.max(0, parseInt(b.commentCount, 10) || 0);
  const publishedAt = String(b.publishedAt || "").slice(0, 40);
  const durationSeconds = Math.max(0, parseInt(b.durationSeconds, 10) || 0);
  const rarity = String(b.rarity || "common").slice(0, 20);
  const pulledAt = new Date().toISOString();

  const disc = db
    .prepare("SELECT 1 FROM global_discoveries WHERE video_id = ?")
    .get(videoId);
  let firstDiscovery = false;
  if (!disc) {
    db.prepare("INSERT INTO global_discoveries (video_id) VALUES (?)").run(videoId);
    firstDiscovery = true;
  }

  const existing = db
    .prepare(
      "SELECT id, quantity, first_discovery FROM user_cards WHERE user_id = ? AND video_id = ?"
    )
    .get(req.session.userId, videoId);

  if (existing) {
    db.prepare(
      `UPDATE user_cards SET
        quantity = quantity + 1,
        title = ?, channel_title = ?, thumbnail_url = ?,
        view_count = ?, like_count = ?, comment_count = ?,
        published_at = ?, duration_seconds = ?, rarity = ?
       WHERE user_id = ? AND video_id = ?`
    ).run(
      title,
      channelTitle,
      thumbnailUrl,
      viewCount,
      likeCount,
      commentCount,
      publishedAt,
      durationSeconds,
      rarity,
      req.session.userId,
      videoId
    );
    const row = db
      .prepare(
        `SELECT video_id, title, channel_title, thumbnail_url, view_count, like_count,
                comment_count, published_at, duration_seconds, rarity, quantity,
                first_discovery, pulled_at
         FROM user_cards WHERE user_id = ? AND video_id = ?`
      )
      .get(req.session.userId, videoId);
    return res.json({
      card: rowToCard(row),
      isDuplicate: true,
      firstDiscovery: false,
      stats: statsForUser(req.session.userId),
    });
  }

  db.prepare(
    `INSERT INTO user_cards (
      user_id, video_id, title, channel_title, thumbnail_url,
      view_count, like_count, comment_count, published_at, duration_seconds,
      rarity, quantity, first_discovery, pulled_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
  ).run(
    req.session.userId,
    videoId,
    title,
    channelTitle,
    thumbnailUrl,
    viewCount,
    likeCount,
    commentCount,
    publishedAt,
    durationSeconds,
    rarity,
    firstDiscovery ? 1 : 0,
    pulledAt
  );

  const row = db
    .prepare(
      `SELECT video_id, title, channel_title, thumbnail_url, view_count, like_count,
              comment_count, published_at, duration_seconds, rarity, quantity,
              first_discovery, pulled_at
       FROM user_cards WHERE user_id = ? AND video_id = ?`
    )
    .get(req.session.userId, videoId);

  res.json({
    card: rowToCard(row),
    isDuplicate: false,
    firstDiscovery,
    stats: statsForUser(req.session.userId),
  });
});

export default router;
