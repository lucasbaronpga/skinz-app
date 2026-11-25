# Skinz-Engine

Reine, getestete Spiellogik. Keine Datenbank, kein HTTP, keine Seiteneffekte.
Der Server ruft `calculateMatch` mit den Rohdaten auf und speichert das Ergebnis.
Eine Score-Korrektur ist ein erneuter Aufruf mit den geänderten Rohdaten.

```js
import { calculateMatch } from "../lib/engine/index.js"

const result = calculateMatch({
  config: {
    gameMode: "classic" | "professional" | "wolffn",
    stakeCents: 100,                 // ganze Cent pro Skin (1 bis 10000)
    holeCount: 18,                   // 9 oder 18
    pars: [4, 4, 3, ...],            // ein Par (3 bis 6) je Loch
    oozle: { enabled: false },       // oder { enabled: true, valueCents: 50, carryoverEnabled: true }
    scoringMode: "gross",            // optional, Netto folgt später
  },
  players: ["userId1", "userId2"],   // 2 bis 4, Wolffn genau 4; Reihenfolge = Abschlagreihenfolge
  holes: [
    {
      scores: { userId1: 4, userId2: 5 },
      wolffn: { decision: "alone" | "accepted" | "declined", askedPlayerId },  // nur Wolffn
      oozle: { playerId, putts: 1 | 2 | 3 } | { noGreen: true },               // nur auf Par 3 bei aktivem Oozle
    },
  ],
})
```

Ergebnis: `status`, `currentHole`, `carryoverSkinz`, `oozleCarryoverUnits`,
`finalCarryover`, `holes[]` (je Loch Skinz, Bonus, Geldverlauf), `players[]`
(Summen) und `settlement` (`pairs[]` je Gegner, `payments[]` Zahlungsplan).
Alle Geldbeträge sind ganze Cent.

Fehler sind `EngineError` mit `code` und deutscher `message`.
