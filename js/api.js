/**
 * @param {string} path
 * @param {RequestInit} [opts]
 */
export async function api(path, opts = {}) {
  const headers = { ...opts.headers };
  if (
    opts.body &&
    typeof opts.body === "string" &&
    !headers["Content-Type"]
  ) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(path, {
    credentials: "include",
    ...opts,
    headers,
  });
  const ct = res.headers.get("content-type") || "";
  let data = null;
  if (ct.includes("application/json")) {
    data = await res.json().catch(() => ({}));
  }
  if (!res.ok) {
    const msg =
      (data && (data.error || data.message)) || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}
