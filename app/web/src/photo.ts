/** Ridimensiona la foto (lato lungo max 1600px) e la restituisce come canvas. */
export async function loadPhoto(file: File): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export const toBlob = (canvas: HTMLCanvasElement) =>
  new Promise<Blob>((ok, fail) => canvas.toBlob((b) => (b ? ok(b) : fail(new Error("Foto non valida."))), "image/jpeg", 0.85));

/** Ritaglia il riquadro [ymin, xmin, ymax, xmax] (0–1000) e lo restituisce come data URL JPEG. */
export function crop(canvas: HTMLCanvasElement, box: number[]): string {
  const [ymin, xmin, ymax, xmax] = box.map((v) => Math.min(1000, Math.max(0, v)) / 1000);
  const out = document.createElement("canvas");
  out.width = Math.round((xmax - xmin) * canvas.width);
  out.height = Math.round((ymax - ymin) * canvas.height);
  out.getContext("2d")!.drawImage(
    canvas, xmin * canvas.width, ymin * canvas.height, out.width, out.height, 0, 0, out.width, out.height,
  );
  return out.toDataURL("image/jpeg", 0.85);
}
