/** Restituisce l'ISBN-13 normalizzato, o null se il codice non è un ISBN valido. */
export function normalizeIsbn(input: string): string | null {
  const s = input.toUpperCase().replace(/[^0-9X]/g, "");

  if (/^\d{13}$/.test(s) && (s.startsWith("978") || s.startsWith("979"))) {
    const sum = [...s.slice(0, 12)].reduce((t, d, i) => t + Number(d) * (i % 2 ? 3 : 1), 0);
    return (10 - (sum % 10)) % 10 === Number(s[12]) ? s : null;
  }

  if (/^\d{9}[\dX]$/.test(s)) {
    const sum = [...s].reduce((t, d, i) => t + (d === "X" ? 10 : Number(d)) * (10 - i), 0);
    if (sum % 11 !== 0) return null;
    const core = "978" + s.slice(0, 9);
    const sum13 = [...core].reduce((t, d, i) => t + Number(d) * (i % 2 ? 3 : 1), 0);
    return core + ((10 - (sum13 % 10)) % 10);
  }

  return null;
}
