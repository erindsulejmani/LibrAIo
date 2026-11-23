import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

type Book = { id: number; title: string; authors: string | null; year: number | null };

function App() {
  const [books, setBooks] = useState<Book[] | null>(null);

  useEffect(() => {
    fetch("/api/books").then((r) => r.json()).then(setBooks);
  }, []);

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: 16, maxWidth: 900, margin: "0 auto" }}>
      <h1>LibrAIo</h1>
      {books === null && <p>Caricamento…</p>}
      {books?.length === 0 && <p>Nessun libro in catalogo.</p>}
      <ul>
        {books?.map((b) => (
          <li key={b.id}>
            {b.title}{b.authors ? ` — ${b.authors}` : ""}{b.year ? ` (${b.year})` : ""}
          </li>
        ))}
      </ul>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
