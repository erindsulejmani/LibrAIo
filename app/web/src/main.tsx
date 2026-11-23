import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { AddBook } from "./AddBook.tsx";
import "./style.css";

type Book = { id: number; title: string; authors: string | null; year: number | null; cover_file: string | null };

function App() {
  const [view, setView] = useState<"catalogo" | "aggiungi">("catalogo");
  const [books, setBooks] = useState<Book[] | null>(null);

  const load = () => fetch("/api/books").then((r) => r.json()).then(setBooks);
  useEffect(() => { load(); }, []);

  return (
    <main>
      <header className="row">
        <h1>LibrAIo</h1>
        <nav className="row">
          <button className={view === "catalogo" ? "" : "secondary"} onClick={() => setView("catalogo")}>Catalogo</button>
          <button className={view === "aggiungi" ? "" : "secondary"} onClick={() => setView("aggiungi")}>Aggiungi libro</button>
        </nav>
      </header>

      {view === "aggiungi" && <AddBook onSaved={load} />}

      {view === "catalogo" && (
        <>
          {books === null && <p>Caricamento…</p>}
          {books?.length === 0 && <p>Nessun libro in catalogo.</p>}
          <ul className="books">
            {books?.map((b) => (
              <li key={b.id}>
                {b.cover_file ? <img src={`/copertine/${b.cover_file}`} alt="" /> : <div className="no-cover" />}
                <span>{b.title}{b.authors ? ` — ${b.authors}` : ""}{b.year ? ` (${b.year})` : ""}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
