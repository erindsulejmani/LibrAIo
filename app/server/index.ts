import express from "express";
import path from "node:path";
import { networkInterfaces } from "node:os";
import { db, COVERS_DIR } from "./db.ts";

const PORT = Number(process.env.PORT ?? 3000);
const WEB_DIST = path.resolve(import.meta.dirname, "../web/dist");

const app = express();
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/books", (_req, res) => {
  res.json(db.prepare("SELECT * FROM books ORDER BY title COLLATE NOCASE").all());
});

app.use("/copertine", express.static(COVERS_DIR));
app.use(express.static(WEB_DIST));
app.get("/{*path}", (_req, res) => {
  res.sendFile(path.join(WEB_DIST, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`\nLibrAIo avviato.`);
  console.log(`  Su questo computer: http://localhost:${PORT}`);
  for (const addrs of Object.values(networkInterfaces())) {
    for (const a of addrs ?? []) {
      if (a.family === "IPv4" && !a.internal) console.log(`  In rete locale:     http://${a.address}:${PORT}`);
    }
  }
  console.log(`\nPer chiudere: Ctrl+C oppure chiudi questa finestra.\n`);
});
