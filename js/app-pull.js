import { pullRandomVideo } from "./youtube.js";
import {
  loadCollection,
  saveCollection,
  totalCardCount,
} from "./storage.js";
import { requireLogin } from "./auth.js";
import { initNav } from "./nav.js";
import { initDiscovered, registerDiscovery } from "./discovered.js";
import { buildCardElement, wireModal } from "./cardUi.js";
import { mountPackReveal } from "./packReveal.js";

requireLogin();

/** @type {import("./storage.js").CollectedCard[]} */
let collection = [];

const el = {
  pullBtn: document.getElementById("pullBtn"),
  loading: document.getElementById("loading"),
  revealHost: document.getElementById("revealHost"),
  errorBox: document.getElementById("errorBox"),
  statTotal: document.getElementById("statTotal"),
  statUnique: document.getElementById("statUnique"),
  modal: document.getElementById("modal"),
  modalBody: document.getElementById("modalBody"),
  modalClose: document.getElementById("modalClose"),
};

function setError(msg) {
  el.errorBox.textContent = msg || "";
  el.errorBox.hidden = !msg;
}

function setLoading(on) {
  el.loading.hidden = !on;
  el.loading.setAttribute("aria-hidden", on ? "false" : "true");
}

function updateStats() {
  const unique = collection.length;
  const total = totalCardCount(collection);
  el.statTotal.textContent = String(total);
  el.statUnique.textContent = String(unique);
}

/**
 * @param {Awaited<ReturnType<typeof pullRandomVideo>>} pulled
 * @returns {{ card: import("./storage.js").CollectedCard, isDuplicate: boolean }}
 */
function upsertCard(pulled, firstDiscovery) {
  const existing = collection.find((c) => c.videoId === pulled.videoId);
  if (existing) {
    existing.quantity = (existing.quantity || 1) + 1;
    existing.rarity = pulled.rarity;
    existing.viewCount = pulled.viewCount;
    existing.likeCount = pulled.likeCount;
    existing.commentCount = pulled.commentCount;
    existing.publishedAt = pulled.publishedAt;
    existing.durationSeconds = pulled.durationSeconds;
    existing.title = pulled.title;
    existing.channelTitle = pulled.channelTitle;
    existing.thumbnailUrl = pulled.thumbnailUrl;
    return { card: existing, isDuplicate: true };
  }
  const card = {
    videoId: pulled.videoId,
    title: pulled.title,
    channelTitle: pulled.channelTitle,
    thumbnailUrl: pulled.thumbnailUrl,
    viewCount: pulled.viewCount,
    likeCount: pulled.likeCount,
    commentCount: pulled.commentCount,
    publishedAt: pulled.publishedAt,
    durationSeconds: pulled.durationSeconds,
    rarity: pulled.rarity,
    pulledAt: new Date().toISOString(),
    quantity: 1,
    firstDiscovery,
  };
  collection.push(card);
  return { card, isDuplicate: false };
}

const modal = wireModal({
  modal: el.modal,
  modalBody: el.modalBody,
  closeBtn: el.modalClose,
});

async function handlePull() {
  setError("");
  el.pullBtn.disabled = true;
  setLoading(true);
  el.revealHost.innerHTML = "";
  el.revealHost.classList.remove("reveal-stage--open", "reveal-stage--opening");

  try {
    const pulled = await pullRandomVideo();
    const firstDiscovery = registerDiscovery(pulled.videoId);
    const { card, isDuplicate } = upsertCard(pulled, firstDiscovery);
    saveCollection(collection);
    updateStats();

    setLoading(false);

    const cardEl = buildCardElement(card, {
      packReveal: true,
      onOpen: (c) => modal.openModal(c),
    });

    mountPackReveal(el.revealHost, cardEl, () => {
      const dupNote = document.createElement("p");
      dupNote.className = "reveal-note";
      if (isDuplicate) {
        dupNote.textContent = "Duplicate! Stack count increased.";
      } else if (firstDiscovery) {
        dupNote.textContent =
          "First discovery! Prismatic card — registered in discovered videos.";
      } else {
        dupNote.textContent = "New card added to your inventory.";
      }
      el.revealHost.appendChild(dupNote);
    });
  } catch (e) {
    setError(e instanceof Error ? e.message : String(e));
  } finally {
    setLoading(false);
    el.pullBtn.disabled = false;
  }
}

async function boot() {
  initNav();
  await initDiscovered();
  collection = loadCollection().cards;
  updateStats();
  el.pullBtn.addEventListener("click", handlePull);
}

boot();
