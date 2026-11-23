import { useMemo, useState } from "react";
import { BookFields, fromDraft, toDraft, type Draft } from "./BookFields.tsx";

export type Book = {
  id: number; isbn: string | null; title: string; authors: string | null; publisher: string | null;
  year: number | null; language: string | null; genres: string | null; description: string | null;
  description_source: string | null; cover_file: string | null; created_at: string;
};

type SortKey = "title" | "authors" | "year" | "genres" | "created_at";
const SORTS: [SortKey, string][] = [
  ["title", "Titolo"], ["authors", "Autore"], ["year", "Anno"], ["genres", "Genere"], ["created_at", "Data di inserimento"],
];

const splitList = (s: string | null) => (s ?? "").split(";").map((x) => x.trim()).filter(Boolean);

export function Catalog({ books, onChanged }: { books: Book[]; onChanged: () => void }) {
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState("");
  const [sort, setSort] = useState<SortKey>("title");
  const [desc, setDesc] = useState(false);
  const [layout, setLayout] = useState<"griglia" | "tabella">("griglia");
  const [selected, setSelected] = useState<Book | null>(null);

  const genres = useMemo(
    () => [...new Set(books.flatMap((b) => splitList(b.genres)))].sort((a, b) => a.localeCompare(b, "it")),
    [books],
  );

  const shown = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    const list = books.filter((b) => {
      if (genre && !splitList(b.genres).includes(genre)) return false;
      const text = [b.title, b.authors, b.publisher, b.genres, b.isbn, b.year, b.description].join(" ").toLowerCase();
      return words.every((w) => text.includes(w));
    });
    list.sort((a, b) => {
      const x = a[sort], y = b[sort];
      if (x == null || x === "") return 1; // i valori mancanti vanno sempre in fondo
      if (y == null || y === "") return -1;
      const c = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "it");
      return desc ? -c : c;
    });
    return list;
  }, [books, query, genre, sort, desc]);

  if (selected) {
    return <BookEditor book={selected} onClose={(changed) => { setSelected(null); if (changed) onChanged(); }} />;
  }

  return (
    <section className="stack">
      <input type="search" placeholder="Cerca per titolo, autore, editore, genere, ISBN…" value={query} onChange={(e) => setQuery(e.target.value)} />
      <div className="row wrap">
        <select value={genre} onChange={(e) => setGenre(e.target.value)}>
          <option value="">Tutti i generi</option>
          {genres.map((g) => <option key={g}>{g}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
          {SORTS.map(([k, l]) => <option key={k} value={k}>Ordina per: {l}</option>)}
        </select>
        <button className="secondary" onClick={() => setDesc(!desc)} title="Inverti ordine">{desc ? "↓ Z–A" : "↑ A–Z"}</button>
        <button className="secondary" onClick={() => setLayout(layout === "griglia" ? "tabella" : "griglia")}>
          {layout === "griglia" ? "Vista tabella" : "Vista griglia"}
        </button>
      </div>
      <p className="muted">{shown.length} di {books.length} libri</p>

      {layout === "griglia" ? (
        <div className="grid">
          {shown.map((b) => (
            <button key={b.id} className="card" onClick={() => setSelected(b)}>
              {b.cover_file ? <img src={`/copertine/${b.cover_file}`} alt="" /> : <div className="no-cover">{b.title}</div>}
              <strong>{b.title}</strong>
              <span className="muted">{b.authors}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Titolo</th><th>Autori</th><th>Anno</th><th>Editore</th><th>Generi</th></tr></thead>
            <tbody>
              {shown.map((b) => (
                <tr key={b.id} onClick={() => setSelected(b)}>
                  <td>{b.title}</td><td>{b.authors}</td><td>{b.year}</td><td>{b.publisher}</td><td>{b.genres}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function BookEditor({ book, onClose }: { book: Book; onClose: (changed: boolean) => void }) {
  const [draft, setDraft] = useState<Draft>(toDraft(book));
  const [error, setError] = useState<string | null>(null);

  async function send(method: "PUT" | "DELETE") {
    setError(null);
    const res = await fetch(`/api/books/${book.id}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: method === "PUT" ? JSON.stringify(fromDraft(draft)) : undefined,
    });
    if (res.ok) onClose(true);
    else setError((await res.json().catch(() => null))?.error ?? "Operazione non riuscita.");
  }

  return (
    <form className="stack" onSubmit={(e) => { e.preventDefault(); send("PUT"); }}>
      {book.cover_file && <img className="cover-large" src={`/copertine/${book.cover_file}`} alt="Copertina" />}
      {error && <p className="error">{error}</p>}
      <BookFields draft={draft} onChange={setDraft} />
      <div className="row wrap">
        <button type="submit" disabled={!draft.title.trim()}>Salva modifiche</button>
        <button type="button" className="secondary" onClick={() => onClose(false)}>Indietro</button>
        <button type="button" className="danger" onClick={() => confirm(`Eliminare "${book.title}" dal catalogo?`) && send("DELETE")}>Elimina</button>
      </div>
    </form>
  );
}
