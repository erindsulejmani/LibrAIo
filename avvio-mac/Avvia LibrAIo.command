#!/bin/bash
# Doppio clic per installare (la prima volta) e avviare LibrAIo su Mac.
cd "$(dirname "$0")/.." || exit 1

fine() { read -r -p "Premi Invio per chiudere..."; exit "$1"; }

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js non trovato. Installa la versione LTS da https://nodejs.org e riprova."
  fine 1
fi

npm install || fine 1
npm run build || fine 1
(sleep 3 && open "http://localhost:3000") &
npm start
fine 0
