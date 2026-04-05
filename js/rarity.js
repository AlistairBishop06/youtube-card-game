/** View-count tiers for collectible rarity */
export const RARITY = {
  COMMON: "common",
  RARE: "rare",
  EPIC: "epic",
  LEGENDARY: "legendary",
};

/**
 * @param {number} viewCount
 * @returns {"common"|"rare"|"epic"|"legendary"}
 */
export function rarityFromViews(viewCount) {
  const v = Number(viewCount) || 0;
  if (v >= 1_000_000) return "legendary";
  if (v >= 100_000) return "epic";
  if (v >= 10_000) return "rare";
  return "common";
}

export const RARITY_META = {
  common: { label: "Common", order: 0 },
  rare: { label: "Rare", order: 1 },
  epic: { label: "Epic", order: 2 },
  legendary: { label: "Legendary", order: 3 },
};
