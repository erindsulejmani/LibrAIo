import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatOneDReader, type IScannerControls } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";

const hints = new Map([[DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13]]]);

/** Legge il codice a barre ISBN dalla fotocamera (o da una foto) e lo passa a onCode. */
export function IsbnScanner({ onCode }: { onCode: (code: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const liveAvailable = !!navigator.mediaDevices?.getUserMedia;

  useEffect(() => {
    if (!liveAvailable || !videoRef.current) return;
    let controls: IScannerControls | undefined;
    let stopped = false;
    new BrowserMultiFormatOneDReader(hints)
      .decodeFromConstraints({ video: { facingMode: "environment" } }, videoRef.current, (result, _err, c) => {
        if (result && !stopped) {
          stopped = true;
          c.stop();
          onCode(result.getText());
        }
      })
      .then((c) => {
        controls = c;
        if (stopped) c.stop();
      })
      .catch(() => setError("Impossibile accedere alla fotocamera. Usa la foto o inserisci il codice a mano."));
    return () => {
      stopped = true;
      controls?.stop();
    };
  }, [liveAvailable, onCode]);

  async function fromPhoto(file: File) {
    const url = URL.createObjectURL(file);
    try {
      const result = await new BrowserMultiFormatOneDReader(hints).decodeFromImageUrl(url);
      onCode(result.getText());
    } catch {
      setError("Codice a barre non riconosciuto nella foto. Riprova più vicino e con più luce.");
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  return (
    <div className="stack">
      {liveAvailable ? (
        <video ref={videoRef} className="scanner" muted playsInline />
      ) : (
        <p className="note">Scansione dal vivo non disponibile su questa connessione (serve HTTPS). Usa la foto.</p>
      )}
      <label className="button">
        Fotografa il codice a barre
        <input type="file" accept="image/*" capture="environment" hidden
          onChange={(e) => e.target.files?.[0] && fromPhoto(e.target.files[0])} />
      </label>
      <form className="row" onSubmit={(e) => { e.preventDefault(); if (typed.trim()) onCode(typed); }}>
        <input placeholder="oppure scrivi l'ISBN" value={typed} onChange={(e) => setTyped(e.target.value)} inputMode="numeric" />
        <button type="submit">Cerca</button>
      </form>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
