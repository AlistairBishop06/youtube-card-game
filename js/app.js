import { pullRandomVideo } from "./youtube.js";
import {
  loadCollection,
  saveCollection,
  totalCardCount,
} from "./storage.js";
import { RARITY_META } from "./rarity.js";
import { getStatRows } from "./cardStats.js";
import { formatCompactNumber } from "./formatters.js";

/** @type {import("./storage.js").CollectedCard[]} */
let collection = [];

const OPEN_THRESHOLD = 0.88;

const el = {
  pullBtn: document.getElementById("pullBtn"),
  loading: document.getElementById("loading"),
  revealHost: document.getElementById("revealHost"),
  errorBox: document.getElementById("errorBox"),
  collectionGrid: document.getElementById("collectionGrid"),
  statTotal: document.getElementById("statTotal"),
  statUnique: document.getElementById("statUnique"),
  modal: document.getElementById("modal"),
  modalBody: document.getElementById("modalBody"),
};

function setError(msg) {
  el.errorBox.textContent = msg || "";
  el.errorBox.hidden = !msg;
}

function updateStats() {
  const unique = collection.length;
  const total = totalCardCount(collection);
  el.statTotal.textContent = String(total);
  el.statUnique.textContent = String(unique);
}

function sortCollection() {
  collection.sort((a, b) => {
    const ro = (r) => RARITY_META[r]?.order ?? 0;
    if (ro(b.rarity) !== ro(a.rarity)) return ro(b.rarity) - ro(a.rarity);
    return (b.viewCount || 0) - (a.viewCount || 0);
  });
}

function upsertCard(pulled) {
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
  };
  collection.push(card);
  return { card, isDuplicate: false };
}

function videoUrl(id) {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;
}

function embedUrl(id) {
  return `https://www.youtube.com/embed/${encodeURIComponent(id)}?rel=0`;
}

function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

/**
 * @param {HTMLElement} cardRoot .gacha-card
 * @param {HTMLElement} surface .gacha-card__surface
 */
function attachTilt(cardRoot, surface) {
  const maxDeg = 11;
  let raf = 0;
  let lx = 0,
    ly = 0,
    tx = 0,
    ty = 0;

  function frame() {
    raf = 0;
    tx += (lx - tx) * 0.18;
    ty += (ly - ty) * 0.18;
    surface.style.transform = `rotateY(${tx}deg) rotateX(${ty}deg)`;
    if (Math.abs(lx - tx) > 0.01 || Math.abs(ly - ty) > 0.01) {
      raf = requestAnimationFrame(frame);
    }
  }

  function onMove(e) {
    const r = cardRoot.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width - 0.5) * 2;
    const y = ((e.clientY - r.top) / r.height - 0.5) * 2;
    lx = x * maxDeg;
    ly = -y * maxDeg;
    if (!raf) raf = requestAnimationFrame(frame);
  }

  function onLeave() {
    lx = 0;
    ly = 0;
    if (!raf) raf = requestAnimationFrame(frame);
  }

  cardRoot.addEventListener("mousemove", onMove);
  cardRoot.addEventListener("mouseleave", onLeave);
}

/**
 * @param {import("./storage.js").CollectedCard} card
 * @param {{ compact?: boolean }} opts
 */
function buildCardElement(card, opts = {}) {
  const { compact = false } = opts;
  const wrap = document.createElement("article");
  wrap.className = `gacha-card rarity-${card.rarity}${compact ? " gacha-card--compact" : ""}`;
  wrap.dataset.videoId = card.videoId;

  const tilt = document.createElement("div");
  tilt.className = "gacha-card__tilt";

  const surface = document.createElement("div");
  surface.className = "gacha-card__surface";

  const dup =
    (card.quantity || 1) > 1
      ? `<span class="gacha-card__dup" aria-label="Duplicate count">×${card.quantity}</span>`
      : "";

  const head = document.createElement("header");
  head.className = "gacha-card__head";
  head.innerHTML = `
    <div class="gacha-card__head-top">
      <h3 class="gacha-card__title">${escapeHtml(card.title)}</h3>
      ${dup}
    </div>
    <p class="gacha-card__channel">${escapeHtml(card.channelTitle)}</p>
    <span class="gacha-card__badge">${escapeHtml(RARITY_META[card.rarity]?.label || card.rarity)}</span>
  `;

  const videoWrap = document.createElement("div");
  videoWrap.className = "gacha-card__video";
  const iframe = document.createElement("iframe");
  iframe.className = "gacha-card__iframe";
  iframe.src = embedUrl(card.videoId);
  iframe.title = "YouTube video player";
  iframe.allow =
    "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
  iframe.setAttribute("allowfullscreen", "");
  iframe.loading = "lazy";
  iframe.referrerPolicy = "strict-origin-when-cross-origin";
  videoWrap.appendChild(iframe);

  const statsEl = document.createElement("div");
  statsEl.className = "gacha-card__stats";
  const rows = getStatRows(card);
  for (const row of rows) {
    const rowEl = document.createElement("div");
    rowEl.className = "gacha-card__stat";
    rowEl.innerHTML = `
      <div class="gacha-card__stat-head">
        <span class="gacha-card__stat-label">${escapeHtml(row.label)}</span>
        <span class="gacha-card__stat-value">${escapeHtml(row.display)}</span>
      </div>
      <div class="gacha-card__stat-track" aria-hidden="true">
        <span class="gacha-card__stat-fill" style="width:${row.bar}%"></span>
      </div>
    `;
    statsEl.appendChild(rowEl);
  }

  surface.append(head, videoWrap, statsEl);
  tilt.appendChild(surface);
  wrap.appendChild(tilt);

  attachTilt(wrap, surface);

  wrap.addEventListener("click", (e) => {
    if (e.target.closest("iframe")) return;
    openModal(card);
  });

  return wrap;
}

/**
 * @param {() => void} onOpened
 */
function createPackElement(onOpened) {
  const root = document.createElement("div");
  root.className = "pack";
  root.style.setProperty("--p", "0");

  root.innerHTML = `
    <div class="pack__shell">
      <div class="pack__shine"></div>
      <div class="pack__emblem" aria-hidden="true">▶</div>
      <p class="pack__label">Mystery Pack</p>
      <p class="pack__hint">Sealed — slice it open to reveal your card</p>
      <div class="pack__tear" role="slider" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-label="Cut open the pack by dragging along the line" tabindex="0">
        <div class="pack__tear-line" aria-hidden="true"></div>
        <div class="pack__tear-glow" aria-hidden="true"></div>
        <div class="pack__scissors" aria-hidden="true">✂</div>
      </div>
      <p class="pack__guide">Click and drag along the dotted line to cut</p>
    </div>
  `;

  const tear = root.querySelector(".pack__tear");

  let dragging = false;
  let opened = false;

  function setProgress(p) {
    const v = Math.max(0, Math.min(1, p));
    root.style.setProperty("--p", String(v));
    tear?.setAttribute("aria-valuenow", String(Math.round(v * 100)));
    if (v >= OPEN_THRESHOLD && !opened) open();
  }

  /** @param {number} clientX */
  function updateFromClientX(clientX) {
    if (!tear) return;
    const rect = tear.getBoundingClientRect();
    setProgress((clientX - rect.left) / rect.width);
  }

  function open() {
    if (opened) return;
    opened = true;
    root.classList.add("pack--opening");
    tear.style.pointerEvents = "none";
    window.setTimeout(() => {
      root.classList.add("pack--open");
      window.setTimeout(() => {
        onOpened();
        root.remove();
      }, 480);
    }, 120);
  }

  tear?.addEventListener("pointerdown", (e) => {
    if (opened) return;
    dragging = true;
    tear.setPointerCapture(e.pointerId);
    tear.classList.add("pack__tear--drag");
    updateFromClientX(e.clientX);
  });

  tear?.addEventListener("pointermove", (e) => {
    if (!dragging || opened) return;
    updateFromClientX(e.clientX);
  });

  function endDrag(e) {
    if (!dragging) return;
    dragging = false;
    tear?.classList.remove("pack__tear--drag");
    try {
      tear?.releasePointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
  }

  tear?.addEventListener("pointerup", endDrag);
  tear?.addEventListener("pointercancel", endDrag);

  tear?.addEventListener("keydown", (e) => {
    if (opened) return;
    const step = e.shiftKey ? 0.1 : 0.04;
    const cur = parseFloat(
      getComputedStyle(root).getPropertyValue("--p").trim() || "0"
    );
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      setProgress(cur + step);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      setProgress(cur - step);
    }
  });

  return root;
}

function openModal(card) {
  el.modalBody.innerHTML = "";

  const wrap = document.createElement("div");
  wrap.className = "modal-card";

  const iframe = document.createElement("iframe");
  iframe.className = "modal-card__iframe";
  iframe.src = embedUrl(card.videoId);
  iframe.title = "YouTube video player";
  iframe.allow =
    "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
  iframe.setAttribute("allowfullscreen", "");

  const title = document.createElement("h2");
  title.className = "modal__title";
  title.textContent = card.title;

  const ch = document.createElement("p");
  ch.className = "modal__channel";
  ch.textContent = card.channelTitle;

  const rarity = document.createElement("p");
  rarity.className = `modal__rarity rarity-${card.rarity}`;
  rarity.textContent = RARITY_META[card.rarity]?.label || card.rarity;

  const meta = document.createElement("p");
  meta.className = "modal__views";
  meta.textContent = `${formatCompactNumber(card.viewCount)} views · ${card.videoId}`;

  const stats = document.createElement("div");
  stats.className = "modal-card__stats";
  for (const row of getStatRows(card)) {
    const rowEl = document.createElement("div");
    rowEl.className = "modal-card__stat";
    rowEl.innerHTML = `
      <span class="modal-card__stat-label">${escapeHtml(row.label)}</span>
      <span class="modal-card__stat-value">${escapeHtml(row.display)}</span>
      <div class="modal-card__stat-track"><span style="width:${row.bar}%"></span></div>
    `;
    stats.appendChild(rowEl);
  }

  const actions = document.createElement("div");
  actions.className = "modal__actions";
  const a = document.createElement("a");
  a.className = "btn btn--primary";
  a.href = videoUrl(card.videoId);
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.textContent = "Open on YouTube";

  const copy = document.createElement("button");
  copy.type = "button";
  copy.className = "btn btn--ghost";
  copy.textContent = "Copy link";
  copy.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(videoUrl(card.videoId));
      copy.textContent = "Copied!";
      window.setTimeout(() => {
        copy.textContent = "Copy link";
      }, 1500);
    } catch {
      copy.textContent = "Copy failed";
    }
  });

  actions.append(a, copy);

  wrap.append(iframe, title, ch, rarity, meta, stats);
  if ((card.quantity || 1) > 1) {
    const dup = document.createElement("p");
    dup.className = "modal__dup";
    dup.textContent = `Duplicates stacked: ×${card.quantity}`;
    wrap.appendChild(dup);
  }
  wrap.appendChild(actions);

  el.modalBody.appendChild(wrap);

  el.modal.hidden = false;
  el.modal.setAttribute("aria-hidden", "false");
}

function closeModal() {
  el.modal.hidden = true;
  el.modal.setAttribute("aria-hidden", "true");
}

function renderCollection() {
  el.collectionGrid.innerHTML = "";
  if (!collection.length) {
    const p = document.createElement("p");
    p.className = "empty-hint";
    p.textContent = "No cards yet — pull your first pack above.";
    el.collectionGrid.appendChild(p);
    return;
  }
  sortCollection();
  for (const card of collection) {
    el.collectionGrid.appendChild(buildCardElement(card, { compact: true }));
  }
}

async function handlePull() {
  setError("");
  el.pullBtn.disabled = true;
  el.loading.hidden = false;
  el.revealHost.innerHTML = "";

  try {
    const pulled = await pullRandomVideo();
    const { card, isDuplicate } = upsertCard(pulled);
    sortCollection();
    saveCollection(collection);
    updateStats();

    el.loading.hidden = true;

    const pack = createPackElement(() => {
      const node = buildCardElement(card, { compact: false });
      node.classList.add("gacha-card--enter");
      el.revealHost.appendChild(node);

      const dupNote = document.createElement("p");
      dupNote.className = "reveal-note";
      dupNote.textContent = isDuplicate
        ? "Duplicate! Stack count increased."
        : "New card added to your collection.";
      el.revealHost.appendChild(dupNote);

      renderCollection();
    });
    el.revealHost.appendChild(pack);
  } catch (e) {
    setError(e instanceof Error ? e.message : String(e));
  } finally {
    el.loading.hidden = true;
    el.pullBtn.disabled = false;
  }
}

function init() {
  collection = loadCollection().cards;
  updateStats();
  renderCollection();

  el.pullBtn.addEventListener("click", handlePull);

  el.modal.addEventListener("click", (ev) => {
    if (ev.target === el.modal) closeModal();
  });
  document.getElementById("modalClose")?.addEventListener("click", closeModal);
  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape" && !el.modal.hidden) closeModal();
  });
}

init();
