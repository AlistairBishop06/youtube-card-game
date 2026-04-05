import { refreshSession, requireLogin, logout, getCurrentUser } from "./auth.js";
import { initNav } from "./nav.js";
import { api } from "./api.js";

await initNav();
await refreshSession();
requireLogin();

const u = getCurrentUser();
const meta = document.getElementById("accountMeta");
if (meta && u) {
  meta.textContent = `Signed in as ${u.username}${u.createdAt ? ` · since ${u.createdAt}` : ""}`;
}

const errUser = document.getElementById("errUsername");
const errPass = document.getElementById("errPassword");
const errDel = document.getElementById("errDelete");
const okUser = document.getElementById("okUsername");
const okPass = document.getElementById("okPassword");

document.getElementById("formUsername")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  errUser.hidden = true;
  okUser.hidden = true;
  const newUsername = String(
    document.getElementById("newUsername")?.value || ""
  ).trim();
  const password = String(document.getElementById("pwUser")?.value || "");
  try {
    await api("/api/users/me/username", {
      method: "PATCH",
      body: JSON.stringify({ newUsername, password }),
    });
    okUser.hidden = false;
    await refreshSession();
    if (meta && getCurrentUser()) {
      meta.textContent = `Signed in as ${getCurrentUser().username}`;
    }
    await initNav();
  } catch (ex) {
    errUser.textContent = ex instanceof Error ? ex.message : String(ex);
    errUser.hidden = false;
  }
});

document.getElementById("formPassword")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  errPass.hidden = true;
  okPass.hidden = true;
  const currentPassword = String(
    document.getElementById("currentPassword")?.value || ""
  );
  const newPassword = String(document.getElementById("newPassword")?.value || "");
  const newPassword2 = String(
    document.getElementById("newPassword2")?.value || ""
  );
  if (newPassword !== newPassword2) {
    errPass.textContent = "New passwords do not match.";
    errPass.hidden = false;
    return;
  }
  try {
    await api("/api/users/me/password", {
      method: "PATCH",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    okPass.hidden = false;
    const c = document.getElementById("currentPassword");
    const n = document.getElementById("newPassword");
    const n2 = document.getElementById("newPassword2");
    if (c) c.value = "";
    if (n) n.value = "";
    if (n2) n2.value = "";
  } catch (ex) {
    errPass.textContent = ex instanceof Error ? ex.message : String(ex);
    errPass.hidden = false;
  }
});

document.getElementById("btnExport")?.addEventListener("click", () => {
  window.location.href = "api/inventory/export";
});

document.getElementById("formDelete")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  errDel.hidden = true;
  const password = String(document.getElementById("pwDelete")?.value || "");
  if (!confirm("Delete your account and all cards? This cannot be undone.")) {
    return;
  }
  try {
    await api("/api/users/me", {
      method: "DELETE",
      body: JSON.stringify({ password }),
    });
    await logout();
    window.location.href = "index.html";
  } catch (ex) {
    errDel.textContent = ex instanceof Error ? ex.message : String(ex);
    errDel.hidden = false;
  }
});
