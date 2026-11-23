export type Draft = {
  isbn: string; title: string; authors: string; publisher: string; year: string;
  language: string; genres: string; description: string; description_source: string; cover_url: string;
};

const LABELS: [keyof Draft, string][] = [
  ["title", "Titolo"], ["authors", "Autori (separati da ;)"], ["publisher", "Editore"], ["year", "Anno"],
  ["isbn", "ISBN"], ["language", "Lingua"], ["genres", "Generi (separati da ;)"],
];

/** Converte un oggetto del server (valori null/numeri) in una bozza modificabile (stringhe). */
export const toDraft = (o: Record<string, unknown>) =>
  Object.fromEntries(
    (["isbn", "title", "authors", "publisher", "year", "language", "genres", "description", "description_source", "cover_url"] as const)
      .map((k) => [k, o[k] == null ? "" : String(o[k])]),
  ) as Draft;

export const fromDraft = (d: Draft) => ({ ...d, year: d.year ? Number(d.year) : null });

/** Campi della scheda libro, usati sia in inserimento sia in modifica. */
export function BookFields({ draft, onChange }: { draft: Draft; onChange: (d: Draft) => void }) {
  const set = (k: keyof Draft) => (e: { target: { value: string } }) => onChange({ ...draft, [k]: e.target.value });
  return (
    <>
      {LABELS.map(([k, label]) => (
        <label key={k} className="field">{label}<input value={draft[k]} onChange={set(k)} /></label>
      ))}
      <label className="field">
        Riassunto{draft.description_source && ` (fonte: ${draft.description_source})`}
        <textarea rows={6} value={draft.description} onChange={set("description")} />
      </label>
    </>
  );
}
