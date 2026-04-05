import { setSession, getCurrentUser } from "./auth.js";
import { initNav } from "./nav.js";

const ALLOWED_NEXT = new Set(["pull.html", "inventory.html", "index.html"]);

function safeNext(raw) {
  if (!raw || typeof raw !== "string") return "pull.html";
  if (raw.includes("..") || raw.includes("//")) return "pull.html";
  const noHash = raw.split("#")[0];
  const leaf = noHash.split("/").pop()?.split("?")[0] || "";
  if (!ALLOWED_NEXT.has(leaf)) return "pull.html";
  return leaf;
}

const form = document.getElementById("loginForm");
const input = document.getElementById("username");
const err = document.getElementById("loginError");

initNav();

if (getCurrentUser()) {
  const params = new URLSearchParams(location.search);
  window.location.href = safeNext(params.get("next"));
}

form?.addEventListener("submit", (e) => {
  e.preventDefault();
  err.hidden = true;
  const name = String(input?.value || "").trim();
  if (!name) {
    err.textContent = "Enter a display name.";
    err.hidden = false;
    return;
  }
  setSession(name);
  const params = new URLSearchParams(location.search);
  window.location.href = safeNext(params.get("next"));
});
