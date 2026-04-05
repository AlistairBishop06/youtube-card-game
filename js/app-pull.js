import { pullRandomVideo } from "./youtube.js";
import { refreshSession, requireLogin } from "./auth.js";
import { initNav } from "./nav.js";
import { buildCardElement, wireModal } from "./cardUi.js";
import { mountPackReveal } from "./packReveal.js";
import { api } from "./api.js";

await initNav();
await refreshSession();
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

function applyStats(stats) {
  if (!stats) return;
  el.statTotal.textContent = String(stats.total ?? 0);
  el.statUnique.textContent = String(stats.unique ?? 0);
}

async function loadStats() {
  try {
    const data = await api("/api/inventory");
    collection = data.cards || [];
    applyStats(data.stats);
  } catch {
    el.statTotal.textContent = "0";
    el.statUnique.textContent = "0";
  }
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

  try {
    const pulled = await pullRandomVideo();
    const data = await api("/api/inventory/pull", {
      method: "POST",
      body: JSON.stringify({
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
      }),
    });

    const card = data.card;
    const isDuplicate = data.isDuplicate;
    const firstDiscovery = data.firstDiscovery;
    applyStats(data.stats);

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
    if (String(e.message || e).includes("401")) {
      setError("Session expired — log in again.");
    } else {
      setError(e instanceof Error ? e.message : String(e));
    }
  } finally {
    setLoading(false);
    el.pullBtn.disabled = false;
  }
}

await loadStats();
el.pullBtn.addEventListener("click", handlePull);
