import { refreshSession, getCurrentUser } from "./auth.js";
import { initNav } from "./nav.js";
import { api } from "./api.js";

const ALLOWED_NEXT = new Set([
  "pull.html",
  "inventory.html",
  "index.html",
  "account.html",
]);

function safeNext(raw) {
  if (!raw || typeof raw !== "string") return "pull.html";
  if (raw.includes("..") || raw.includes("//")) return "pull.html";
  const leaf = raw.split("#")[0].split("/").pop()?.split("?")[0] || "";
  if (!ALLOWED_NEXT.has(leaf)) return "pull.html";
  return leaf;
}

const form = document.getElementById("loginForm");
const userEl = document.getElementById("username");
const passEl = document.getElementById("password");
const err = document.getElementById("loginError");

await initNav();

await refreshSession();
if (getCurrentUser()) {
  const params = new URLSearchParams(location.search);
  window.location.href = safeNext(params.get("next"));
}

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  err.hidden = true;
  const username = String(userEl?.value || "").trim();
  const password = String(passEl?.value || "");
  if (!username || !password) {
    err.textContent = "Enter username and password.";
    err.hidden = false;
    return;
  }
  try {
    const data = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    const params = new URLSearchParams(location.search);
    window.location.href = safeNext(params.get("next"));
  } catch (ex) {
    err.textContent = ex instanceof Error ? ex.message : String(ex);
    err.hidden = false;
  }
});
