export type PhotoReading = {
  tipo: "copertina" | "frontespizio" | "altro";
  title: string | null;
  authors: string[];
  publisher: string | null;
  year: number | null;
  isbn: string | null;
  language: string | null;
  /** Riquadro della copertina nella foto: [ymin, xmin, ymax, xmax] normalizzati 0–1000. */
  cover_box: number[] | null;
};

const PROMPT = `Questa è la foto di un libro: la copertina oppure il frontespizio (la pagina interna con titolo, autore, editore, anno).
Trascrivi SOLO informazioni leggibili nell'immagine. Non indovinare e non usare conoscenze esterne: se un dato non è visibile, usa null (o lista vuota per gli autori).
- tipo: "copertina", "frontespizio" oppure "altro" se non è nessuno dei due.
- year: anno di pubblicazione solo se stampato nell'immagine.
- isbn: solo se stampato nell'immagine.
- language: codice ISO 639-1 della lingua del titolo (es. "it").
- cover_box: se tipo è "copertina", il riquadro che contiene esattamente la copertina come [ymin, xmin, ymax, xmax] normalizzati da 0 a 1000; altrimenti null.`;

const SCHEMA = {
  type: "OBJECT",
  properties: {
    tipo: { type: "STRING", enum: ["copertina", "frontespizio", "altro"] },
    title: { type: "STRING", nullable: true },
    authors: { type: "ARRAY", items: { type: "STRING" } },
    publisher: { type: "STRING", nullable: true },
    year: { type: "INTEGER", nullable: true },
    isbn: { type: "STRING", nullable: true },
    language: { type: "STRING", nullable: true },
    cover_box: { type: "ARRAY", items: { type: "INTEGER" }, nullable: true },
  },
  required: ["tipo", "title", "authors", "publisher", "year", "isbn", "language", "cover_box"],
};

export async function readBookPhoto(image: Buffer, mimeType: string): Promise<PhotoReading> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Chiave GEMINI_API_KEY mancante nel file .env.");
  const model = process.env.GEMINI_MODEL || "gemini-flash-latest";

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    signal: AbortSignal.timeout(60_000),
    body: JSON.stringify({
      contents: [{ parts: [{ inlineData: { mimeType, data: image.toString("base64") } }, { text: PROMPT }] }],
      generationConfig: { responseMimeType: "application/json", responseSchema: SCHEMA, temperature: 0 },
    }),
  });
  const json: any = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`Errore Gemini (${res.status}): ${json?.error?.message ?? "risposta non valida"}`);

  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string") throw new Error("Gemini non ha restituito una risposta leggibile.");
  const r = JSON.parse(text) as PhotoReading;
  const box = r.cover_box;
  r.cover_box = Array.isArray(box) && box.length === 4 && box[2] > box[0] && box[3] > box[1] ? box : null;
  return r;
}
