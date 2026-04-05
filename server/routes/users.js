import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "../db.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();
router.use(requireAuth);

const USER_RE = /^[a-zA-Z0-9_]{3,32}$/;

router.patch("/me/username", (req, res) => {
  const { newUsername, password } = req.body || {};
  const nu = String(newUsername || "").trim();
  if (!USER_RE.test(nu)) {
    return res.status(400).json({
      error:
        "Username must be 3–32 characters: letters, numbers, and underscores only.",
    });
  }

  const user = db
    .prepare("SELECT password_hash FROM users WHERE id = ?")
    .get(req.session.userId);
  if (!user || !bcrypt.compareSync(String(password || ""), user.password_hash)) {
    return res.status(401).json({ error: "Incorrect password." });
  }

  try {
    db.prepare("UPDATE users SET username = ? WHERE id = ?").run(
      nu,
      req.session.userId
    );
    req.session.username = nu;
    res.json({ user: { id: req.session.userId, username: nu } });
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

router.patch("/me/password", (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (typeof newPassword !== "string" || newPassword.length < 8) {
    return res.status(400).json({ error: "New password must be at least 8 characters." });
  }

  const user = db
    .prepare("SELECT password_hash FROM users WHERE id = ?")
    .get(req.session.userId);
  if (!user || !bcrypt.compareSync(String(currentPassword || ""), user.password_hash)) {
    return res.status(401).json({ error: "Current password is incorrect." });
  }

  const password_hash = bcrypt.hashSync(newPassword, 10);
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(
    password_hash,
    req.session.userId
  );
  res.json({ ok: true });
});

router.delete("/me", (req, res) => {
  const { password } = req.body || {};
  const user = db
    .prepare("SELECT password_hash FROM users WHERE id = ?")
    .get(req.session.userId);
  if (!user || !bcrypt.compareSync(String(password || ""), user.password_hash)) {
    return res.status(401).json({ error: "Incorrect password." });
  }

  db.prepare("DELETE FROM users WHERE id = ?").run(req.session.userId);
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: "Account removed but session cleanup failed." });
    res.clearCookie("vg.sid");
    res.json({ ok: true });
  });
});

export default router;
