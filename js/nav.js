import { getCurrentUser, clearSession } from "./auth.js";

function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

export function initNav() {
  const el = document.getElementById("siteNav");
  if (!el) return;

  const u = getCurrentUser();
  const here = location.pathname.split("/").pop() || "index.html";

  const link = (href, label) => {
    const active = here === href ? ' aria-current="page"' : "";
    return `<a class="site-nav__link" href="${href}"${active}>${label}</a>`;
  };

  el.innerHTML = `
    <div class="site-nav__inner">
      ${link("index.html", "Home")}
      ${link("pull.html", "Pull")}
      ${link("inventory.html", "Inventory")}
      <span class="site-nav__spacer"></span>
      ${
        u
          ? `<span class="site-nav__user">${escapeHtml(u)}</span>
             <button type="button" class="btn btn--ghost site-nav__btn" id="navLogout">Log out</button>`
          : `<a class="btn btn--ghost site-nav__btn" href="login.html">Log in</a>`
      }
    </div>
  `;

  document.getElementById("navLogout")?.addEventListener("click", () => {
    clearSession();
    window.location.href = "login.html";
  });
}
