import { getCurrentUser, logout, refreshSession } from "./auth.js";

function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

export async function initNav() {
  await refreshSession();

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
      ${
        u
          ? `${link("account.html", "Account")}
      <span class="site-nav__spacer"></span>
      <span class="site-nav__user">${escapeHtml(u.username)}</span>
      <button type="button" class="btn btn--ghost site-nav__btn" id="navLogout">Log out</button>`
          : `<span class="site-nav__spacer"></span>
      <a class="btn btn--ghost site-nav__btn" href="login.html">Log in</a>
      <a class="btn btn--ghost site-nav__btn" href="register.html">Register</a>`
      }
    </div>
  `;

  document.getElementById("navLogout")?.addEventListener("click", async () => {
    await logout();
    window.location.href = "login.html";
  });
}
