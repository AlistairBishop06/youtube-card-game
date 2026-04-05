import { DatabaseSync } from "node:sqlite";
import { readFileSync, existsSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const dataDir = join(rootDir, "data");

if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

export const dbFilePath = process.env.SQLITE_PATH || join(dataDir, "gacha.db");
export const db = new DatabaseSync(dbFilePath);

db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

export function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      video_id TEXT NOT NULL,
      title TEXT NOT NULL,
      channel_title TEXT NOT NULL,
      thumbnail_url TEXT NOT NULL,
      view_count INTEGER NOT NULL DEFAULT 0,
      like_count INTEGER NOT NULL DEFAULT 0,
      comment_count INTEGER NOT NULL DEFAULT 0,
      published_at TEXT NOT NULL DEFAULT '',
      duration_seconds INTEGER NOT NULL DEFAULT 0,
      rarity TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      first_discovery INTEGER NOT NULL DEFAULT 0,
      pulled_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, video_id)
    );

    CREATE INDEX IF NOT EXISTS idx_user_cards_user ON user_cards(user_id);

    CREATE TABLE IF NOT EXISTS global_discoveries (
      video_id TEXT PRIMARY KEY,
      discovered_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  seedDiscoveriesFromFile();
}

function seedDiscoveriesFromFile() {
  const path = join(dataDir, "discovered.json");
  if (!existsSync(path)) return;
  try {
    const j = JSON.parse(readFileSync(path, "utf8"));
    const ids = j.videoIds ?? j.ids ?? [];
    if (!Array.isArray(ids)) return;
    const ins = db.prepare(
      "INSERT OR IGNORE INTO global_discoveries (video_id) VALUES (?)"
    );
    db.exec("BEGIN");
    try {
      for (const id of ids) {
        if (id) ins.run(String(id));
      }
      db.exec("COMMIT");
    } catch {
      db.exec("ROLLBACK");
    }
  } catch {
    /* ignore */
  }
}

/** @param {Record<string, unknown> | null | undefined} row */
export function rowToCard(row) {
  if (!row) return null;
  return {
    videoId: row.video_id,
    title: row.title,
    channelTitle: row.channel_title,
    thumbnailUrl: row.thumbnail_url,
    viewCount: row.view_count,
    likeCount: row.like_count,
    commentCount: row.comment_count,
    publishedAt: row.published_at || "",
    durationSeconds: row.duration_seconds,
    rarity: row.rarity,
    quantity: row.quantity,
    firstDiscovery: Boolean(row.first_discovery),
    pulledAt: row.pulled_at,
  };
}
