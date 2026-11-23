import { useCallback, useState } from "react";
import { IsbnScanner } from "./IsbnScanner.tsx";
import { crop, loadPhoto, toBlob } from "./photo.ts";
import { BookFields, fromDraft, toDraft, type Draft } from "./BookFields.tsx";

type Mode = "isbn" | "foto";
type CoverChoice = "online" | "ritaglio" | "nessuna";

export function AddBook({ onSaved }: { onSaved: () => void }) {
  const [mode, setMode] = useState<Mode>("isbn");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [inputMethod, setInputMethod] = useState("isbn");
  const [cropped, setCropped] = useState<string | null>(null);
  const [cover, setCover] = useState<CoverChoice>("nessuna");
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /** Mostra la scheda a partire dalla risposta del server (ricerca ISBN o analisi foto). */
  function showResult(json: any, method: string, croppedCover: string | null) {
    setDraft(toDraft(json.data));
    setInputMethod(method);
    setCropped(croppedCover);
    setCover(croppedCover ? "ritaglio" : json.data.cover_url ? "online" : "nessuna");
    const parts = [json.sources.length ? `Dati trovati su: ${json.sources.join(", ")}.` : "Nessun dato trovato online: compila a mano."];
    if (json.tipo === "altro") parts.push("La foto non sembra una copertina né un frontespizio: controlla bene i dati.");
    if (json.existing.length) parts.push(`Attenzione: in catalogo c'è già "${json.existing[0].title}" con questo ISBN.`);
    setInfo(parts.join(" "));
  }

  async function run(task: () => Promise<void>) {
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      await task();
    } catch (e) {
      setError((e as Error).message || "Si è verificato un errore.");
    } finally {
      setBusy(false);
    }
  }

  const lookup = useCallback((code: string) => run(async () => {
    const res = await fetch(`/api/lookup/isbn/${encodeURIComponent(code)}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    showResult(json, "isbn", null);
  }), []);

  const analyze = (file: File) => run(async () => {
    const canvas = await loadPhoto(file);
    const res = await fetch("/api/analyze-photo", { method: "POST", headers: { "Content-Type": "image/jpeg" }, body: await toBlob(canvas) });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    showResult(json, json.tipo === "frontespizio" ? "frontespizio" : "copertina", json.cover_box ? crop(canvas, json.cover_box) : null);
  });

  async function save() {
    if (!draft) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...fromDraft(draft),
          input_method: inputMethod,
          cover_url: cover === "online" ? draft.cover_url : null,
          cover_data: cover === "ritaglio" ? cropped : null,
        }),
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

  return (
    <section className="stack">
      {info && <p className="note">{info}</p>}
      {error && <p className="error">{error}</p>}
      {busy && <p>Attendere…</p>}

      {!draft && !busy && (
        <>
          <div className="row">
            <button className={mode === "isbn" ? "" : "secondary"} onClick={() => setMode("isbn")}>Codice ISBN</button>
            <button className={mode === "foto" ? "" : "secondary"} onClick={() => setMode("foto")}>Foto copertina / frontespizio</button>
          </div>
          {mode === "isbn" && <IsbnScanner onCode={lookup} />}
          {mode === "foto" && (
            <div className="stack">
              <p className="note">Per i libri antichi o senza ISBN fotografa il frontespizio: contiene più informazioni della copertina.</p>
              <label className="button">
                Scatta o scegli una foto
                <input type="file" accept="image/*" capture="environment" hidden
                  onChange={(e) => e.target.files?.[0] && analyze(e.target.files[0])} />
              </label>
            </div>
          )}
        </>
      )}

      {draft && (
        <form className="stack" onSubmit={(e) => { e.preventDefault(); save(); }}>
          <fieldset className="covers">
            <legend>Copertina</legend>
            {draft.cover_url && (
              <label><input type="radio" checked={cover === "online"} onChange={() => setCover("online")} />
                <img src={draft.cover_url} alt="Copertina trovata online" /> Online</label>
            )}
            {cropped && (
              <label><input type="radio" checked={cover === "ritaglio"} onChange={() => setCover("ritaglio")} />
                <img src={cropped} alt="Copertina ritagliata dalla foto" /> Dalla foto</label>
            )}
            <label><input type="radio" checked={cover === "nessuna"} onChange={() => setCover("nessuna")} /> Nessuna</label>
          </fieldset>
          <BookFields draft={draft} onChange={setDraft} />
          <div className="row">
            <button type="submit" disabled={busy || !draft.title.trim()}>Salva nel catalogo</button>
            <button type="button" className="secondary" onClick={() => { setDraft(null); setInfo(null); }}>Annulla</button>
          </div>
        </form>
      )}
    </section>
  );
}
