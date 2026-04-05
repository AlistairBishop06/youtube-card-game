import { initNav } from "./nav.js";
import { api } from "./api.js";
import { refreshSession, getCurrentUser } from "./auth.js";

const form = document.getElementById("registerForm");
const userEl = document.getElementById("username");
const passEl = document.getElementById("password");
const pass2El = document.getElementById("password2");
const err = document.getElementById("registerError");

await initNav();
await refreshSession();
if (getCurrentUser()) {
  window.location.href = "pull.html";
}

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  err.hidden = true;
  const username = String(userEl?.value || "").trim();
  const password = String(passEl?.value || "");
  const password2 = String(pass2El?.value || "");
  if (password !== password2) {
    err.textContent = "Passwords do not match.";
    err.hidden = false;
    return;
  }
  try {
    await api("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    window.location.href = "pull.html";
  } catch (ex) {
    err.textContent = ex instanceof Error ? ex.message : String(ex);
    err.hidden = false;
  }
});
