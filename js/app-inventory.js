import { loadCollection, totalCardCount } from "./storage.js";
import { RARITY_META } from "./rarity.js";
import { requireLogin } from "./auth.js";
import { initNav } from "./nav.js";
import { buildCardElement, wireModal } from "./cardUi.js";

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
  const unique = collection.length;
  const total = totalCardCount(collection);
  el.statTotal.textContent = String(total);
  el.statUnique.textContent = String(unique);
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

function init() {
  initNav();
  collection = loadCollection().cards;
  updateStats();
  renderCollection();
}

init();
