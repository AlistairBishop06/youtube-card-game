import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "../db.js";

const router = Router();

const USER_RE = /^[a-zA-Z0-9_]{3,32}$/;

function validatePassword(p) {
  return typeof p === "string" && p.length >= 8;
}

router.post("/register", (req, res) => {
  const { username, password } = req.body || {};
  const u = String(username || "").trim();
  if (!USER_RE.test(u)) {
    return res.status(400).json({
      error:
        "Username must be 3–32 characters: letters, numbers, and underscores only.",
    });
  }
  if (!validatePassword(password)) {
    return res.status(400).json({ error: "Password must be at least 8 characters." });
  }

  const password_hash = bcrypt.hashSync(password, 10);
  try {
    const result = db
      .prepare(
        "INSERT INTO users (username, password_hash) VALUES (?, ?)"
      )
      .run(u, password_hash);
    const id = Number(result.lastInsertRowid);
    req.session.userId = id;
    req.session.username = u;
    return res.json({ user: { id, username: u } });
  } catch (e) {
    if (
      e?.code === "SQLITE_CONSTRAINT_UNIQUE" ||
      String(e?.message || "").includes("UNIQUE")
    ) {
      return res.status(409).json({ error: "That username is already taken." });
    }
    throw e;
  }
});

router.post("/login", (req, res) => {
  const { username, password } = req.body || {};
  const u = String(username || "").trim();
  const row = db
    .prepare("SELECT id, username, password_hash FROM users WHERE username = ? COLLATE NOCASE")
    .get(u);
  if (!row || !bcrypt.compareSync(String(password || ""), row.password_hash)) {
    return res.status(401).json({ error: "Invalid username or password." });
  }
  req.session.userId = row.id;
  req.session.username = row.username;
  return res.json({ user: { id: row.id, username: row.username } });
});

router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: "Could not log out." });
    res.clearCookie("vg.sid");
    res.json({ ok: true });
  });
});

router.get("/me", (req, res) => {
  if (!req.session?.userId) {
    return res.json({ user: null });
  }
  const row = db
    .prepare(
      "SELECT id, username, created_at FROM users WHERE id = ?"
    )
    .get(req.session.userId);
  if (!row) {
    req.session.destroy(() => {});
    return res.json({ user: null });
  }
  res.json({
    user: {
      id: row.id,
      username: row.username,
      createdAt: row.created_at,
    },
  });
});

export default router;
