import { useCallback, useState } from "react";
import { IsbnScanner } from "./IsbnScanner.tsx";

type Draft = {
  isbn: string; title: string; authors: string; publisher: string; year: string;
  language: string; genres: string; description: string; description_source: string; cover_url: string;
};

const LABELS: [keyof Draft, string][] = [
  ["title", "Titolo"], ["authors", "Autori (separati da ;)"], ["publisher", "Editore"], ["year", "Anno"],
  ["isbn", "ISBN"], ["language", "Lingua"], ["genres", "Generi (separati da ;)"],
];

export function AddBook({ onSaved }: { onSaved: () => void }) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const lookup = useCallback(async (code: string) => {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/lookup/isbn/${encodeURIComponent(code)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      const d = json.data;
      setDraft(Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v == null ? "" : String(v)])) as Draft);
      const parts = [json.sources.length ? `Dati trovati su: ${json.sources.join(", ")}.` : "Nessun dato trovato online: compila a mano."];
      if (json.existing.length) parts.push(`Attenzione: in catalogo c'è già "${json.existing[0].title}" con questo ISBN.`);
      setInfo(parts.join(" "));
    } catch (e) {
      setError((e as Error).message || "Errore nella ricerca.");
    } finally {
      setBusy(false);
    }
  }, []);

  async function save() {
    if (!draft) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, year: draft.year ? Number(draft.year) : null, input_method: "isbn" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setDraft(null);
      setInfo(`Salvato: ${json.title}`);
      onSaved();
    } catch (e) {
      setError((e as Error).message || "Errore nel salvataggio.");
    } finally {
      setBusy(false);
    }
  }

  const set = (k: keyof Draft) => (e: { target: { value: string } }) => setDraft((d) => d && { ...d, [k]: e.target.value });

  return (
    <section className="stack">
      {info && <p className="note">{info}</p>}
      {error && <p className="error">{error}</p>}
      {busy && <p>Attendere…</p>}

      {!draft && !busy && <IsbnScanner onCode={lookup} />}

      {draft && (
        <form className="stack" onSubmit={(e) => { e.preventDefault(); save(); }}>
          {draft.cover_url && <img className="cover-preview" src={draft.cover_url} alt="Copertina" />}
          {LABELS.map(([k, label]) => (
            <label key={k} className="field">{label}<input value={draft[k]} onChange={set(k)} /></label>
          ))}
          <label className="field">
            Riassunto{draft.description_source && ` (fonte: ${draft.description_source})`}
            <textarea rows={6} value={draft.description} onChange={set("description")} />
          </label>
          <div className="row">
            <button type="submit" disabled={busy || !draft.title.trim()}>Salva nel catalogo</button>
            <button type="button" className="secondary" onClick={() => { setDraft(null); setInfo(null); }}>Annulla</button>
          </div>
        </form>
      )}
    </section>
  );
}
