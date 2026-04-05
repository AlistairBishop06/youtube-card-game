const STORAGE_KEY = "videoGachaCollection_v2";

/**
 * @typedef {Object} CollectedCard
 * @property {string} videoId
 * @property {string} title
 * @property {string} channelTitle
 * @property {string} thumbnailUrl
 * @property {number} viewCount
 * @property {number} likeCount
 * @property {number} commentCount
 * @property {string} publishedAt ISO date from YouTube
 * @property {number} durationSeconds
 * @property {"common"|"rare"|"epic"|"legendary"} rarity
 * @property {string} pulledAt ISO timestamp of first pull
 * @property {number} quantity stack count (duplicates)
 */

function tryMigrateV1() {
  try {
    const old = localStorage.getItem("videoGachaCollection_v1");
    if (!old) return [];
    const data = JSON.parse(old);
    const cards = (data.cards || []).map(normalizeCard);
    if (cards.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ cards }));
      localStorage.removeItem("videoGachaCollection_v1");
    }
    return cards;
  } catch {
    return [];
  }
}

/**
 * @returns {{ cards: CollectedCard[] }}
 */
export function loadCollection() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const migrated = tryMigrateV1();
      return { cards: migrated };
    }
    const data = JSON.parse(raw);
    if (!data.cards || !Array.isArray(data.cards)) return { cards: [] };
    return { cards: data.cards.map(normalizeCard) };
  } catch {
    return { cards: [] };
  }
}

/**
 * @param {Partial<CollectedCard>} c
 * @returns {CollectedCard}
 */
export function normalizeCard(c) {
  return {
    videoId: String(c.videoId || ""),
    title: c.title || "Untitled",
    channelTitle: c.channelTitle || "",
    thumbnailUrl: c.thumbnailUrl || "",
    viewCount: Number(c.viewCount) || 0,
    likeCount: Number(c.likeCount) || 0,
    commentCount: Number(c.commentCount) || 0,
    publishedAt: c.publishedAt || "",
    durationSeconds: Number(c.durationSeconds) || 0,
    rarity: c.rarity || "common",
    pulledAt: c.pulledAt || new Date().toISOString(),
    quantity: Math.max(1, Number(c.quantity) || 1),
  };
}

/**
 * @param {CollectedCard[]} cards
 */
export function saveCollection(cards) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ cards }));
}

/**
 * Sum of all quantities (total pulls stored).
 * @param {CollectedCard[]} cards
 */
export function totalCardCount(cards) {
  return cards.reduce((sum, c) => sum + (c.quantity || 1), 0);
}
