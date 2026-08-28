# Milestone 2 · Klassen-Fokus + Live-Dashboard

## Was neu ist
- **classTags** (kanonisch: HYPERCAR, GTP, LMP2, LMP3, GT3, GT4) an allen 62 Rennen;
  Mapping LMGT3/GTD/SP9→GT3, LMP1/LMH/LMDh→HYPERCAR, SP10/GS→GT4 in `src/domain/race-classes.js`.
- **Filter-Chips** auf dem Hub, Zustand in der URL (`?class=GT3,LMP2` → teilbar).
- **Live-Bar** (`<rpw-live-bar>`): sticky, pulsierender Punkt, Restzeit sekündlich, Fortschrittsbalken.
- **Tab-Chrome**: `🔴 LIVE: <Rennen>`-Titel + rotes Favicon während Live-Phasen (`src/live/live.js`).
- **ETag-Polling** (`src/core/poll.js`): nur aktiv wenn ein Rennen live ist oder <60 min vor Start;
  Intervall 3 min; GitHub Pages beantwortet unverändertes JSON mit 304 (praktisch kostenlos).
- **2026-Kalender komplett**: WEC (9), IMSA (11), ELMS (6), GTWC Europe (10), NLS (10),
  DTM (8), ADAC GT Masters (6), IGTC-Zusatzevents Bathurst/Suzuka/Indy (3) = 62 Einträge (+ Sebring/Daytona…).

## Daten-Korrekturen & Flags
- **wec-monza-2026 korrigiert**: 12.07. war das 6h São Paulo; Monza ist lt. FIA-Kalender das
  Saisonfinale am **08.11.2026** (revidierter Kalender: Barcelona 18.10. neu, Bahrain entfallen).
- `startTimeConfirmed: false` = Datum steht, exakte Startzeit ist Typisch-Wert (Cards zeigen „Startzeit tbc").
- ELMS-Termine Le Castellet/Imola/Spa/Silverstone sind aus „same weekends as 2025" abgeleitet.
- Qatar 1812km: Termin „Ende März" — 28.03. ist Näherung.

## Trade-off: kein adaptives Ticking
Ein 1s-Intervall bleibt (Header-Uhr/Countdown brauchen es ohnehin); Energie spart die
Visibility-Pause. Zwei Intervall-Modi hätten Umschalt-Logik gekostet ohne messbaren Gewinn.

## Einmalig nötig
Repo-Settings → Pages → **Source: „GitHub Actions"** (statt „Deploy from a branch"),
sonst kann `deploy.yml` nicht veröffentlichen.

## Ausführen
```
npm install
npm run dev          # lokal (base wird automatisch /)
TZ=UTC npx vitest run
npm run build
```
Noch nicht gebaut in diesem Milestone: rennen.html, kalender.html, race.html, serien.html
(im Nav verlinkt, Entries folgen — Hub ist das Referenzmuster).
