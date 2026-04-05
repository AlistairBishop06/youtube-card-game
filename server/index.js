import express from "express";
import session from "express-session";
import FileStoreFactory from "session-file-store";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { existsSync, mkdirSync } from "fs";
import { migrate, dbFilePath } from "./db.js";
import authRoutes from "./routes/auth.js";
import usersRoutes from "./routes/users.js";
import inventoryRoutes from "./routes/inventory.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");

migrate();

const FileStore = FileStoreFactory(session);
const sessionsDir = join(rootDir, "data", "sessions");
if (!existsSync(sessionsDir)) {
  mkdirSync(sessionsDir, { recursive: true });
}

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: "256kb" }));

app.use(
  session({
    store: new FileStore({
      path: sessionsDir,
      ttl: 7 * 24 * 60 * 60,
      reapInterval: 60 * 60,
    }),
    secret: process.env.SESSION_SECRET || "dev-change-me-in-production",
    resave: false,
    saveUninitialized: false,
    name: "vg.sid",
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  })
);

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/inventory", inventoryRoutes);

app.use(express.static(rootDir));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, db: "gacha.db" });
});

app.listen(PORT, () => {
  console.log(`Video Gacha server http://localhost:${PORT}`);
  console.log(`SQLite (node:sqlite): ${dbFilePath}`);
});
