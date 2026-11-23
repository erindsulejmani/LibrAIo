import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { AddBook } from "./AddBook.tsx";
import { Catalog, type Book } from "./Catalog.tsx";
import "./style.css";

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
          {!!books?.length && <Catalog books={books} onChanged={load} />}
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
