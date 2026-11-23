import { cp, mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { db, COVERS_DIR, DATA_DIR } from "./db.ts";

const KEEP = 14;

/**
 * Copia il database (una copia per giorno, ultime 14) e le copertine nella cartella di backup.
 * Impostando BACKUP_DIR su una cartella di Google Drive il backup finisce anche nel cloud.
 */
export async function runBackup() {
  const dir = process.env.BACKUP_DIR || path.join(DATA_DIR, "backup");
  await mkdir(dir, { recursive: true });

  const file = path.join(dir, `libraio-${new Date().toISOString().slice(0, 10)}.db`);
  await rm(file, { force: true });
  db.prepare("VACUUM INTO ?").run(file);

  await cp(COVERS_DIR, path.join(dir, "copertine"), { recursive: true, force: false });

  const snapshots = (await readdir(dir)).filter((f) => /^libraio-\d{4}-\d{2}-\d{2}\.db$/.test(f)).sort();
  for (const old of snapshots.slice(0, -KEEP)) await rm(path.join(dir, old));
  return file;
}

export function scheduleBackups() {
  const run = () => runBackup().then(
    (f) => console.log(`Backup eseguito: ${f}`),
    (e) => console.error(`Backup non riuscito: ${(e as Error).message}`),
  );
  run();
  setInterval(run, 24 * 60 * 60 * 1000);
}
