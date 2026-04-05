import { RARITY_META } from "./rarity.js";
import { refreshSession, requireLogin } from "./auth.js";
import { initNav } from "./nav.js";
import { buildCardElement, wireModal } from "./cardUi.js";
import { api } from "./api.js";

await initNav();
await refreshSession();
requireLogin();

/** @type {import("./storage.js").CollectedCard[]} */
let collection = [];

const el = {
  collectionGrid: document.getElementById("collectionGrid"),
  statTotal: document.getElementById("statTotal"),
  statUnique: document.getElementById("statUnique"),
  modal: document.getElementById("modal"),
  modalBody: document.getElementById("modalBody"),
  modalClose: document.getElementById("modalClose"),
};

const modal = wireModal({
  modal: el.modal,
  modalBody: el.modalBody,
  closeBtn: el.modalClose,
});

function sortCollection() {
  collection.sort((a, b) => {
    const ro = (r) => RARITY_META[r]?.order ?? 0;
    if (ro(b.rarity) !== ro(a.rarity)) return ro(b.rarity) - ro(a.rarity);
    return (b.viewCount || 0) - (a.viewCount || 0);
  });
}

function updateStats() {
  let total = 0;
  for (const c of collection) total += c.quantity || 1;
  el.statTotal.textContent = String(total);
  el.statUnique.textContent = String(collection.length);
}

function renderCollection() {
  el.collectionGrid.innerHTML = "";
  if (!collection.length) {
    const p = document.createElement("p");
    p.className = "empty-hint";
    p.innerHTML =
      'No cards yet — <a href="pull.html">open packs on the Pull page</a>.';
    el.collectionGrid.appendChild(p);
    return;
  }
  sortCollection();
  for (const card of collection) {
    el.collectionGrid.appendChild(
      buildCardElement(card, {
        compact: true,
        onOpen: (c) => modal.openModal(c),
      })
    );
  }
}

async function load() {
  try {
    const data = await api("/api/inventory");
    collection = data.cards || [];
    if (data.stats) {
      el.statTotal.textContent = String(data.stats.total ?? 0);
      el.statUnique.textContent = String(data.stats.unique ?? 0);
    } else {
      updateStats();
    }
    renderCollection();
  } catch {
    el.collectionGrid.innerHTML =
      '<p class="empty-hint">Could not load inventory. Are you logged in?</p>';
  }
}

load();
