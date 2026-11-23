# LibrAIo
Il tuo libraio di casa.

Catalogo per una biblioteca privata: si scansiona l'ISBN o si fotografa la copertina/il frontespizio
con il telefono, l'AI (Gemini) estrae i dati, l'app li completa da Google Books / Open Library e li
salva in un database consultabile da una dashboard (ricerca, ordinamento, esportazione Excel).

## Come funziona
- Un computer (Mac o Windows) fa da **server**: tiene il database (SQLite, file `data/libraio.db`)
  e le copertine (`data/copertine/`).
- Telefoni e PC aprono l'app dal browser. Per la fotocamera serve HTTPS: lo forniremo con **Tailscale**.

## Requisiti
- [Node.js](https://nodejs.org) versione LTS (22.18 o successiva).

## Configurazione (facoltativa)
Copia `.env.example` come `.env` e inserisci le chiavi (vedi commenti nel file).

## Avvio
- **Mac:** doppio clic su `avvio-mac/Avvia LibrAIo.command`
  (la prima volta: clic destro → Apri, se macOS blocca il file).
- **Windows:** doppio clic su `avvio-windows/Avvia LibrAIo.bat`.

Lo script installa le dipendenze, prepara l'app e apre `http://localhost:3000`.
Gli indirizzi per la rete locale vengono stampati nella finestra.

## Struttura
```
app/server/   server (Express) e database (SQLite)
app/web/      interfaccia web (React)
avvio-mac/    script di avvio per Mac
avvio-windows/ script di avvio per Windows
data/         database e copertine (creata all'avvio, non versionata)
```

## Stato
- [x] 1. Struttura, database, avvio Mac/Windows
- [x] 2. Scansione ISBN + ricerca Google Books / Open Library
- [x] 3. Foto copertina/frontespizio con Gemini + ritaglio copertina
- [x] 4. Dashboard: griglia/tabella, ricerca, ordinamento, modifica
- [ ] 5. Esportazione Excel e backup
- [ ] 6. Ruoli amministratore / lettore
