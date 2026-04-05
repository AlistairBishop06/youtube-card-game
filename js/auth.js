const SESSION_KEY = "videoGachaSession";

/**
 * @returns {string | null}
 */
export function getCurrentUser() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const j = JSON.parse(raw);
    const u = j?.username;
    return typeof u === "string" && u.trim() ? u.trim() : null;
  } catch {
    return null;
  }
}

/**
 * @param {string} username
 */
export function setSession(username) {
  const u = String(username || "").trim();
  if (!u) return;
  localStorage.setItem(SESSION_KEY, JSON.stringify({ username: u }));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

/**
 * @param {string} [loginPath]
 */
export function requireLogin(loginPath = "login.html") {
  if (getCurrentUser()) return;
  const next = encodeURIComponent(
    `${location.pathname}${location.search}${location.hash}`
  );
  window.location.href = `${loginPath}?next=${next}`;
}
