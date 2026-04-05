import { RARITY_META } from "./rarity.js";
import { getStatRows } from "./cardStats.js";
import { formatCompactNumber } from "./formatters.js";

export function videoUrl(id) {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;
}

export function embedUrl(id) {
  return `https://www.youtube.com/embed/${encodeURIComponent(id)}?rel=0`;
}

function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

/**
 * @param {HTMLElement} cardRoot
 * @param {HTMLElement} surface
 */
export function attachTilt(cardRoot, surface) {
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
 * @param {{ compact?: boolean, packReveal?: boolean, onOpen?: (c: import("./storage.js").CollectedCard) => void }} opts
 */
export function buildCardElement(card, opts = {}) {
  const { compact = false, packReveal = false, onOpen } = opts;
  const wrap = document.createElement("article");
  let cls = `gacha-card rarity-${card.rarity}${compact ? " gacha-card--compact" : ""}`;
  if (card.firstDiscovery) cls += " gacha-card--first-discovery";
  wrap.className = cls;
  wrap.dataset.videoId = card.videoId;

  const emerge = document.createElement("div");

  const tilt = document.createElement("div");
  tilt.className = "gacha-card__tilt";

  const surface = document.createElement("div");
  surface.className = "gacha-card__surface";

  const dup =
    (card.quantity || 1) > 1
      ? `<span class="gacha-card__dup" aria-label="Duplicate count">×${card.quantity}</span>`
      : "";

  const firstBadge = card.firstDiscovery
    ? `<span class="gacha-card__first" title="First registered pull of this video">First discovery</span>`
    : "";

  const head = document.createElement("header");
  head.className = "gacha-card__head";
  head.innerHTML = `
    <div class="gacha-card__head-top">
      <h3 class="gacha-card__title">${escapeHtml(card.title)}</h3>
      ${dup}
    </div>
    <p class="gacha-card__channel">${escapeHtml(card.channelTitle)}</p>
    <div class="gacha-card__badges-row">
      <span class="gacha-card__badge">${escapeHtml(RARITY_META[card.rarity]?.label || card.rarity)}</span>
      ${firstBadge}
    </div>
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
  emerge.className = packReveal
    ? "gacha-card__emerge"
    : "gacha-card__emerge gacha-card__emerge--static";
  emerge.appendChild(tilt);
  wrap.appendChild(emerge);

  attachTilt(wrap, surface);

  wrap.addEventListener("click", (e) => {
    if (e.target.closest("iframe")) return;
    onOpen?.(card);
  });

  return wrap;
}

/**
 * @param {{ modal: HTMLElement, modalBody: HTMLElement, closeBtn: HTMLElement | null }} els
 */
export function wireModal(els) {
  const { modal, modalBody, closeBtn } = els;

  function closeModal() {
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
  }

  /**
   * @param {import("./storage.js").CollectedCard} card
   */
  function openModal(card) {
    modalBody.innerHTML = "";

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

    wrap.append(iframe, title, ch, rarity);
    if (card.firstDiscovery) {
      const fd = document.createElement("p");
      fd.className = "modal__first-discovery";
      fd.textContent = "First discovery — prismatic card";
      wrap.appendChild(fd);
    }
    wrap.append(meta, stats);
    if ((card.quantity || 1) > 1) {
      const dup = document.createElement("p");
      dup.className = "modal__dup";
      dup.textContent = `Duplicates stacked: ×${card.quantity}`;
      wrap.appendChild(dup);
    }
    wrap.appendChild(actions);

    modalBody.appendChild(wrap);

    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
  }

  modal.addEventListener("click", (ev) => {
    if (ev.target === modal) closeModal();
  });
  closeBtn?.addEventListener("click", closeModal);
  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape" && !modal.hidden) closeModal();
  });

  return { openModal, closeModal };
}
