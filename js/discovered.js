const LOCAL_KEY = "videoGachaDiscoveredLocal";

/** @type {Set<string>} */
let merged = new Set();
let ready = false;

function loadLocalIds() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.map(String) : [];
  } catch {
    return [];
  }
}

function saveLocalIds(ids) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify([...ids]));
}

/**
 * Load bundled `data/discovered.json` plus browser-local discoveries.
 */
export async function initDiscovered() {
  merged = new Set();
  try {
    const res = await fetch("data/discovered.json", { cache: "no-store" });
    if (res.ok) {
      const j = await res.json();
      const fromFile = j.videoIds ?? j.ids ?? [];
      if (Array.isArray(fromFile)) {
        for (const id of fromFile) merged.add(String(id));
      }
    }
  } catch {
    /* offline or missing file */
  }
  for (const id of loadLocalIds()) merged.add(id);
  ready = true;
}

export function discoveriesReady() {
  return ready;
}

/** @param {string} videoId */
export function isDiscovered(videoId) {
  return merged.has(String(videoId));
}

/**
 * If this video was never in the registry, add it and return true (first discovery).
 * @param {string} videoId
 */
export function registerDiscovery(videoId) {
  const id = String(videoId);
  if (merged.has(id)) return false;
  merged.add(id);
  const locals = loadLocalIds();
  if (!locals.includes(id)) {
    locals.push(id);
    saveLocalIds(locals);
  }
  return true;
}
