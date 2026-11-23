export type BookData = {
  isbn: string;
  title: string | null;
  authors: string | null;
  publisher: string | null;
  year: number | null;
  language: string | null;
  genres: string | null;
  description: string | null;
  description_source: string | null;
  cover_url: string | null;
};

const yearOf = (date: unknown) => {
  const m = typeof date === "string" ? date.match(/\d{4}/) : null;
  return m ? Number(m[0]) : null;
};

async function getJson(url: string): Promise<any> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

function fromGoogleVolume(v: any): Partial<BookData> {
  return {
    title: [v.title, v.subtitle].filter(Boolean).join(". ") || null,
    authors: v.authors?.join("; ") ?? null,
    publisher: v.publisher ?? null,
    year: yearOf(v.publishedDate),
    language: v.language ?? null,
    genres: v.categories?.join("; ") ?? null,
    description: v.description ?? null,
    description_source: v.description ? "Google Books" : null,
    cover_url: (v.imageLinks?.thumbnail ?? v.imageLinks?.smallThumbnail)?.replace(/^http:/, "https:") ?? null,
  };
}

async function googleBooks(query: string): Promise<Partial<BookData> | null> {
  const key = process.env.GOOGLE_BOOKS_API_KEY;
  const json = await getJson(
    `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}${key ? `&key=${key}` : ""}`,
  );
  const v = json?.items?.[0]?.volumeInfo;
  return v ? fromGoogleVolume(v) : null;
}

export const fromGoogleBooks = (isbn: string) => googleBooks(`isbn:${isbn}`);

export async function fromOpenLibrary(isbn: string): Promise<Partial<BookData> | null> {
  const json = await getJson(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`);
  const b = json?.[`ISBN:${isbn}`];
  if (!b) return null;
  const notes = typeof b.notes === "string" ? b.notes : b.notes?.value;
  return {
    title: [b.title, b.subtitle].filter(Boolean).join(". ") || null,
    authors: b.authors?.map((a: { name: string }) => a.name).join("; ") || null,
    publisher: b.publishers?.map((p: { name: string }) => p.name).join("; ") || null,
    year: yearOf(b.publish_date),
    language: null,
    genres: null,
    description: notes ?? null,
    description_source: notes ? "Open Library" : null,
    cover_url: b.cover?.large ?? b.cover?.medium ?? null,
  };
}

/** Cerca l'ISBN su Google Books e Open Library; per ogni campo usa il primo valore trovato. */
export async function lookupIsbn(isbn: string): Promise<{ data: BookData; sources: string[] }> {
  const [g, o] = await Promise.all([fromGoogleBooks(isbn), fromOpenLibrary(isbn)]);
  const sources = [g && "Google Books", o && "Open Library"].filter((s): s is string => !!s);
  const pick = <K extends keyof BookData>(k: K) => (g?.[k] ?? o?.[k] ?? null) as BookData[K];
  const description = g?.description ? g : o?.description ? o : null;
  return {
    sources,
    data: {
      isbn,
      title: pick("title"),
      authors: pick("authors"),
      publisher: pick("publisher"),
      year: pick("year"),
      language: pick("language"),
      genres: pick("genres"),
      description: description?.description ?? null,
      description_source: description?.description_source ?? null,
      cover_url: pick("cover_url"),
    },
  };
}

/**
 * Cerca per titolo (e autore) quando non c'è ISBN. Il risultato può essere un'altra edizione:
 * se ne usano solo riassunto, generi e copertina, che l'utente conferma nella scheda.
 */
export async function searchByTitle(
  title: string,
  author: string | null,
): Promise<{ data: Partial<BookData>; sources: string[] }> {
  const g = await googleBooks(`intitle:${title}${author ? ` inauthor:${author}` : ""}`);
  let coverUrl = g?.cover_url ?? null;
  const sources = g ? ["Google Books (ricerca per titolo)"] : [];
  if (!coverUrl) {
    const q = new URLSearchParams({ title, limit: "1", fields: "cover_i" });
    if (author) q.set("author", author);
    const coverId = (await getJson(`https://openlibrary.org/search.json?${q}`))?.docs?.[0]?.cover_i;
    if (coverId) {
      coverUrl = `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`;
      sources.push("Open Library (copertina)");
    }
  }
  return {
    sources,
    data: {
      genres: g?.genres ?? null,
      description: g?.description ?? null,
      description_source: g?.description_source ?? null,
      cover_url: coverUrl,
    },
  };
}
