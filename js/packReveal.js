const OPEN_THRESHOLD = 0.88;

/**
 * Full-size pack overlay + tear; card sits underneath and emerges when opened.
 * @param {HTMLElement} stageHost
 * @param {HTMLElement} cardEl
 * @param {() => void} onDone
 */
export function mountPackReveal(stageHost, cardEl, onDone) {
  stageHost.classList.add("reveal-stage");
  stageHost.innerHTML = "";

  const inner = document.createElement("div");
  inner.className = "reveal-stage__inner";

  inner.appendChild(cardEl);

  const overlay = document.createElement("div");
  overlay.className = "pack-overlay";
  overlay.setAttribute("aria-label", "Sealed booster pack");
  overlay.innerHTML = `
    <div class="pack-overlay__foil" aria-hidden="true"></div>
    <div class="pack-overlay__crimp pack-overlay__crimp--top" aria-hidden="true"></div>
    <div class="pack-overlay__body">
      <div class="pack-overlay__brand">VIDEO GACHA</div>
      <p class="pack-overlay__series">Trading Card Booster</p>
      <div class="pack-overlay__window" aria-hidden="true">
        <span class="pack-overlay__icon">▶</span>
      </div>
      <p class="pack-overlay__fine">1 digital video card</p>
    </div>
    <div class="pack-overlay__tear-wrap">
      <p class="pack-overlay__tear-label">Tear strip</p>
      <div class="pack-overlay__tear" role="slider" tabindex="0" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-label="Drag to slice the pack open">
        <div class="pack-overlay__tear-line" aria-hidden="true"></div>
        <div class="pack-overlay__tear-glow" aria-hidden="true"></div>
        <div class="pack-overlay__scissors" aria-hidden="true">✂</div>
      </div>
    </div>
    <div class="pack-overlay__crimp pack-overlay__crimp--bottom" aria-hidden="true"></div>
  `;

  inner.appendChild(overlay);
  stageHost.appendChild(inner);

  overlay.style.setProperty("--p", "0");

  const tear = overlay.querySelector(".pack-overlay__tear");

  let dragging = false;
  let opened = false;

  function setProgress(p) {
    const v = Math.max(0, Math.min(1, p));
    overlay.style.setProperty("--p", String(v));
    tear?.setAttribute("aria-valuenow", String(Math.round(v * 100)));
    if (v >= OPEN_THRESHOLD && !opened) open();
  }

  function updateFromClientX(clientX) {
    if (!tear) return;
    const rect = tear.getBoundingClientRect();
    setProgress((clientX - rect.left) / rect.width);
  }

  function open() {
    if (opened) return;
    opened = true;
    stageHost.classList.add("reveal-stage--opening");
    if (tear) tear.style.pointerEvents = "none";
    window.setTimeout(() => {
      stageHost.classList.add("reveal-stage--open");
      window.setTimeout(() => {
        overlay.remove();
        stageHost.classList.remove("reveal-stage--opening");
        onDone();
      }, 900);
    }, 140);
  }

  tear?.addEventListener("pointerdown", (e) => {
    if (opened) return;
    dragging = true;
    tear.setPointerCapture(e.pointerId);
    tear.classList.add("pack-overlay__tear--drag");
    updateFromClientX(e.clientX);
  });

  tear?.addEventListener("pointermove", (e) => {
    if (!dragging || opened) return;
    updateFromClientX(e.clientX);
  });

  function endDrag(e) {
    if (!dragging) return;
    dragging = false;
    tear?.classList.remove("pack-overlay__tear--drag");
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
      getComputedStyle(overlay).getPropertyValue("--p").trim() || "0"
    );
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      setProgress(cur + step);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      setProgress(cur - step);
    }
  });
}
