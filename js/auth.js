import { api } from "./api.js";

/** @type {{ id: number, username: string, createdAt?: string } | null} */
let cachedUser = null;

export function getCurrentUser() {
  return cachedUser;
}

export function setCachedUser(user) {
  cachedUser = user;
}

/**
 * @returns {Promise<{ id: number, username: string, createdAt?: string } | null>}
 */
export async function refreshSession() {
  try {
    const data = await api("/api/auth/me");
    cachedUser = data.user || null;
  } catch {
    cachedUser = null;
  }
  return cachedUser;
}

export async function logout() {
  try {
    await api("/api/auth/logout", { method: "POST", body: "{}" });
  } catch {
    /* still clear local */
  }
  cachedUser = null;
}

/**
 * @param {string} [loginPath]
 */
export function requireLogin(loginPath = "login.html") {
  if (cachedUser) return;
  const next = encodeURIComponent(
    `${location.pathname}${location.search}${location.hash}`
  );
  window.location.href = `${loginPath}?next=${next}`;
}
