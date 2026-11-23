import express from "express";
import path from "node:path";
import { networkInterfaces } from "node:os";
import { rm, writeFile } from "node:fs/promises";
import { db, COVERS_DIR } from "./db.ts";
import { normalizeIsbn } from "./isbn.ts";
import { lookupIsbn, searchByTitle, type BookData } from "./lookup.ts";
import { readBookPhoto } from "./gemini.ts";

const PORT = Number(process.env.PORT ?? 3000);
const WEB_DIST = path.resolve(import.meta.dirname, "../web/dist");

const app = express();
app.use(express.json({ limit: "10mb" }));

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

app.post("/api/analyze-photo", express.raw({ type: "image/*", limit: "20mb" }), async (req, res) => {
  if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
    res.status(400).json({ error: "Nessuna immagine ricevuta." });
    return;
  }
  let read;
  try {
    read = await readBookPhoto(req.body, req.headers["content-type"] ?? "image/jpeg");
  } catch (e) {
    res.status(502).json({ error: (e as Error).message });
    return;
  }

  const isbn = read.isbn ? normalizeIsbn(read.isbn) : null;
  const online = isbn
    ? await lookupIsbn(isbn)
    : read.title
      ? await searchByTitle(read.title, read.authors[0] ?? null)
      : { data: {} as Partial<BookData>, sources: [] };

  // I dati letti dalla foto hanno la precedenza: descrivono l'edizione che si ha in mano.
  const data = {
    isbn,
    title: read.title ?? online.data.title ?? null,
    authors: read.authors.length ? read.authors.join("; ") : (online.data.authors ?? null),
    publisher: read.publisher ?? online.data.publisher ?? null,
    year: read.year ?? online.data.year ?? null,
    language: read.language ?? online.data.language ?? null,
    genres: online.data.genres ?? null,
    description: online.data.description ?? null,
    description_source: online.data.description_source ?? null,
    cover_url: online.data.cover_url ?? null,
  };
  const existing = isbn ? db.prepare("SELECT id, title FROM books WHERE isbn = ?").all(isbn) : [];
  res.json({ tipo: read.tipo, cover_box: read.cover_box, data, sources: ["Gemini (foto)", ...online.sources], existing });
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

  const coverData = typeof body.cover_data === "string" ? body.cover_data.match(/^data:image\/jpeg;base64,(.+)$/) : null;
  if (coverData) {
    const file = `${id}.jpg`;
    await writeFile(path.join(COVERS_DIR, file), Buffer.from(coverData[1], "base64"));
    db.prepare("UPDATE books SET cover_file = ? WHERE id = ?").run(file, id);
  } else if (typeof body.cover_url === "string" && /^https:\/\//.test(body.cover_url)) {
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

const EDITABLE = FIELDS.filter((f) => f !== "input_method");

app.put("/api/books/:id", (req, res) => {
  const body = req.body ?? {};
  if (typeof body.title !== "string" || !body.title.trim()) {
    res.status(400).json({ error: "Il titolo è obbligatorio." });
    return;
  }
  const values = EDITABLE.map((f) => (body[f] === "" || body[f] === undefined ? null : body[f]));
  const { changes } = db
    .prepare(`UPDATE books SET ${EDITABLE.map((f) => `${f} = ?`).join(", ")}, updated_at = datetime('now') WHERE id = ?`)
    .run(...values, Number(req.params.id));
  if (!changes) {
    res.status(404).json({ error: "Libro non trovato." });
    return;
  }
  res.json(db.prepare("SELECT * FROM books WHERE id = ?").get(Number(req.params.id)));
});

app.delete("/api/books/:id", async (req, res) => {
  const book = db.prepare("SELECT cover_file FROM books WHERE id = ?").get(Number(req.params.id)) as { cover_file: string | null } | undefined;
  if (!book) {
    res.status(404).json({ error: "Libro non trovato." });
    return;
  }
  db.prepare("DELETE FROM books WHERE id = ?").run(Number(req.params.id));
  if (book.cover_file) await rm(path.join(COVERS_DIR, book.cover_file), { force: true });
  res.status(204).end();
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
