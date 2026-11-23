import express from "express";
import path from "node:path";
import { networkInterfaces } from "node:os";
import { writeFile } from "node:fs/promises";
import { db, COVERS_DIR } from "./db.ts";
import { normalizeIsbn } from "./isbn.ts";
import { lookupIsbn } from "./lookup.ts";

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

app.get("/api/lookup/isbn/:code", async (req, res) => {
  const isbn = normalizeIsbn(req.params.code);
  if (!isbn) {
    res.status(400).json({ error: "Codice ISBN non valido." });
    return;
  }
  const existing = db.prepare("SELECT id, title FROM books WHERE isbn = ?").all(isbn);
  res.json({ ...(await lookupIsbn(isbn)), existing });
});

const FIELDS = ["isbn", "title", "authors", "publisher", "year", "language", "genres", "description", "description_source", "input_method"] as const;

app.post("/api/books", async (req, res) => {
  const body = req.body ?? {};
  if (typeof body.title !== "string" || !body.title.trim()) {
    res.status(400).json({ error: "Il titolo è obbligatorio." });
    return;
  }
  const values = FIELDS.map((f) => (body[f] === "" || body[f] === undefined ? null : body[f]));
  const { lastInsertRowid } = db
    .prepare(`INSERT INTO books (${FIELDS.join(", ")}) VALUES (${FIELDS.map(() => "?").join(", ")})`)
    .run(...values);
  const id = Number(lastInsertRowid);

  if (typeof body.cover_url === "string" && /^https:\/\//.test(body.cover_url)) {
    try {
      const img = await fetch(body.cover_url, { signal: AbortSignal.timeout(15_000) });
      if (img.ok && img.headers.get("content-type")?.startsWith("image/")) {
        const file = `${id}.jpg`;
        await writeFile(path.join(COVERS_DIR, file), Buffer.from(await img.arrayBuffer()));
        db.prepare("UPDATE books SET cover_file = ? WHERE id = ?").run(file, id);
      }
    } catch {
      // Copertina non scaricabile: il libro resta salvato senza.
    }
  }

  res.status(201).json(db.prepare("SELECT * FROM books WHERE id = ?").get(id));
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
