import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";

export const DATA_DIR = path.resolve(import.meta.dirname, "../../data");
export const COVERS_DIR = path.join(DATA_DIR, "copertine");
mkdirSync(COVERS_DIR, { recursive: true });

export const db = new DatabaseSync(path.join(DATA_DIR, "libraio.db"));

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY,
    name       TEXT NOT NULL UNIQUE,
    role       TEXT NOT NULL CHECK (role IN ('admin', 'reader')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS books (
    id                 INTEGER PRIMARY KEY,
    isbn               TEXT,
    title              TEXT NOT NULL,
    authors            TEXT,
    publisher          TEXT,
    year               INTEGER,
    language           TEXT,
    genres             TEXT,
    description        TEXT,
    description_source TEXT,
    cover_file         TEXT,
    input_method       TEXT CHECK (input_method IN ('isbn', 'copertina', 'frontespizio', 'manuale')),
    created_by         INTEGER REFERENCES users(id),
    created_at         TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at         TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS books_isbn ON books(isbn);
`);
