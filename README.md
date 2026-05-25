# RACE PIT WALL

**Endurance & GT Dashboard** — inoffizielles Multi-Race Motorsport-Dashboard.
Reines HTML/CSS/JS, kein Build, kein npm, ES6-Modules.

> Inoffizielles Fan-Dashboard. Keine Verbindung zu ACO, FIA, ADAC, SRO, Nürburgring oder anderen Veranstaltern.

---

## Was fertig ist

### Phase 1 — MVP
- **Hub** (`index.html`) — Featured-Race + Liste aller Rennen, Status-Sortierung
- **Race-Detail** (`race.html?id=<slug>`) — Hero · Countdown/Race-Clock · Live-Timing (iframe-Embed wenn embedbar, sonst CTA-Button) · Wetter via Open-Meteo · YouTube-Channel-Link der Serie · Zeitplan · Quicklinks
- **Daten**: 9 Serien, 9 Strecken, 8 Rennen (2 vollständig, 6 Basis-Daten)
- **Status-Logik** clientseitig — `upcoming | live | finished`, kein Rebuild nötig
- **`about.html`** mit Disclaimer und Datenquellen
- **`404.html`** für GitHub Pages
- **`file://`-Detector** in allen Pages — warnt sofort beim Doppelklick

### Phase 2 — Echtdaten & Breite
- **News-Ticker** auf Race-Detail via [rss2json.com](https://rss2json.com) — race-spezifische + globale Feeds gemergt, sortiert nach Datum, max 30 Items
- **Rennliste** (`rennen.html`) — alle Rennen mit Filter-Chips für Serie / Saison / Status, URL-State: `rennen.html?series=wec,nls&status=upcoming`
- **Kalender** (`kalender.html`) — Rennen nach Monat gruppiert, aktueller Monat grün hervorgehoben, Beendet-Rennen ausgegraut + durchgestrichen
- **Serien-Übersicht** (`serien.html`) — 9 Cards mit Klassen-Pills, Stats (Gesamt/Bevor/Beendet) und "Als nächstes"
- **Serie-Detail** (`serie.html?id=<slug>`) — Hero + Saisonkalender, Season-Selector wenn mehrere Saisons vorhanden

### Phase 2 — kleinere Verfeinerungen
- **Live-Timing-Embed** für 24h Nürburgring 2026: `https://livetiming.azurewebsites.net/events/50/results` — vollständige Leaderboard-Seite eingebettet
- **YouTube** nicht mehr embedded, nicht mehr pro Rennen — stattdessen genau **ein Serien-Channel-Link** pro Race-Detail (aus `series.youtubeUrl`). Anwender klickt sich auf YouTube zum aktuellen Live-Stream/Highlight.
- **Fokus-Card** (früher Verstappen-Hervorhebung) komplett entfernt — wird nicht mehr benötigt

### Noch offen (Phase 3)
- **Watchlist** mit Export/Import via `localStorage`
- Mobile-Feinschliff über das Default-Stylesheet hinaus
- Lighthouse-Audit auf 95+
- `CONTRIBUTING.md` für JSON-PR-Workflow
- `youtubeUrl` für **ELMS** und **NLS** in `data/series.json` nachpflegen (offizielle Channels)

---

## Lokal starten

Chrome blockt `fetch()` von lokalen JSON-Dateien unter `file://`. Drei Optionen:

### 1. Python (empfohlen, keine Installation nötig)

```bash
cd "/Users/hesse/Developer/Race Dashboard"
python3 -m http.server 8000
```

Dann im Browser: <http://localhost:8000>

### 2. VS Code Live Server

Extension "Live Server" installieren, Rechtsklick auf `index.html` → "Open with Live Server".

### 3. GitHub Pages

Auf `https://` läuft alles ohne Tricks — push, im Repo unter Settings → Pages den Branch wählen.

---

## Projektstruktur

```
race-pit-wall/
├── index.html                Hub
├── rennen.html               Renn-Liste mit Filter
├── race.html                 Race-Detail (?id=<slug>)
├── serien.html               Serien-Übersicht
├── serie.html                Saisonkalender einer Serie (?id=<slug>)
├── kalender.html             Globaler Kalender, nach Monat
├── watchlist.html            Watchlist (Phase 3 — Stub)
├── about.html                Disclaimer + Datenquellen
├── 404.html                  GitHub-Pages Fehlerseite
├── .nojekyll                 GitHub Pages: Unterordner mit Underscores nicht ignorieren
├── assets/
│   ├── css/
│   │   ├── tokens.css        Design-Tokens (Farben, Fonts, Spacing)
│   │   ├── main.css          Base + Layout + Header/Footer/Nav
│   │   └── components.css    Cards, Countdown, Weather, Stream, News, Cal …
│   └── js/
│       ├── app.js                Bootstrap (Header, Clock, Nav-Highlight)
│       ├── data-loader.js        fetch-Wrapper mit Cache
│       ├── race-status.js        upcoming | live | finished
│       ├── countdown.js          Countdown + Race-Clock
│       ├── weather.js            Open-Meteo (kein Key)
│       ├── streams.js            YouTube-Channel-Link der Serie (ein Link, kein Embed)
│       ├── news.js               RSS via rss2json.com
│       ├── render-hub.js         Hub-Page
│       ├── render-race.js        Race-Detail
│       ├── render-list.js        Rennliste mit Filter
│       ├── render-cal.js         Globaler Kalender
│       ├── render-series-list.js Serien-Übersicht
│       ├── render-series.js      Serien-Detail (Saisonkalender)
│       └── utils.js              Helpers (DOM, Datum, Format)
├── data/
│   ├── config.json           Site-Defaults + globalNewsFeeds
│   ├── series.json           9 Serien (mit youtubeUrl pro Serie)
│   ├── tracks.json           9 Strecken mit lat/lng (Pflicht für Wetter)
│   ├── races.json            Renn-Index (Slug + Eckdaten — schnell für Listen)
│   └── races/
│       ├── 24h-nuerburgring-2026.json   vollständig + Live-Timing-Embed
│       ├── le-mans-2026.json            vollständig
│       └── …                            6 weitere Basis-Datensätze
├── legacy/
│   └── index.html            Original-Prototyp (Referenz, nicht verlinkt)
└── README.md
```

Backups landen außerhalb des Projekts:
`/Users/hesse/Developer/Race Dashboard.backup-phase1.tgz` (41 KB)
`/Users/hesse/Developer/Race Dashboard.backup-phase2.tgz` (48 KB)

---

## Daten pflegen

### Neues Rennen anlegen

1. JSON-Datei unter `data/races/<slug>.json` anlegen — Schema-Vorlage siehe `data/races/24h-nuerburgring-2026.json`
2. Eintrag in `data/races.json` ergänzen (Slug + Eckdaten für Hub/Listen)
3. Reload — fertig

### Felder pro Rennen (`data/races/<slug>.json`)

**Pflicht:**
| Feld | Beispiel | Hinweis |
|---|---|---|
| `slug` | `"24h-spa-2027"` | URL-tauglich, klein, Bindestriche |
| `name` | `"CrowdStrike 24 Hours of Spa"` | sichtbar im Hero |
| `season` | `2027` | Jahreszahl als Integer |
| `seriesSlug` | `"gtwc-europe"` | muss in `series.json` existieren |
| `trackSlug` | `"spa-francorchamps"` | muss in `tracks.json` existieren |
| `startUtc` | `"2027-06-26T14:30:00Z"` | ISO 8601 UTC |
| `endUtc` | `"2027-06-27T14:30:00Z"` | ISO 8601 UTC |

**Optional:**
| Feld | Effekt wenn leer/null |
|---|---|
| `edition` | wird im Hero weggelassen |
| `timezone` | wird im Hero weggelassen |
| `schedule[]` | "Zeitplan wird nachgepflegt" |
| `liveTimingEmbed` (URL) | wenn gesetzt: iframe-Embed in der Card. Voraussetzung: keine `X-Frame-Options`-Sperre auf der Quelle. |
| `liveTimingUrl` (URL) | wenn gesetzt aber kein Embed: großer CTA-Button |
| `newsFeeds[]` | nur globale Feeds aus `config.json` werden geladen |
| `quicklinks[]` | Quicklinks-Card wird nicht gerendert |
| `discordChannelId` | Discord-Slot wird nicht gerendert |
| `result` | (Phase 3 — Ergebnis-Card) |

### Felder pro Serie (`data/series.json`)

| Feld | Beispiel |
|---|---|
| `slug` | `"wec"` |
| `name` | `"FIA World Endurance Championship"` |
| `shortName` | `"WEC"` |
| `category` | `"endurance"` |
| `classes` | `["Hypercar","LMGT3"]` |
| `officialUrl` | offizielle Website |
| `youtubeUrl` | Channel-Hauptseite, z. B. `https://www.youtube.com/@FIAWEC` oder `https://www.youtube.com/channel/UCKMI8JeOaowpEPLuOZGBJ_w`. `null` → Card zeigt Fallback-Hinweis. **Nie** `/live` benutzen — das ist unzuverlässig wenn nicht gerade gestreamt wird. |
| `description` | 1–2 Sätze |

### Felder pro Strecke (`data/tracks.json`)

`lat`/`lng` sind **Pflicht** für die Wetter-Card.

### `data/config.json`

```json
{
  "site": { "title": "RACE PIT WALL", "tagline": "...", "lang": "de" },
  "globalNewsFeeds": [
    { "label": "Motorsport-Total · News", "url": "https://www.motorsport-total.com/rss/news.xml" }
  ]
}
```

Globale News-Feeds erscheinen auf **jedem** Race-Detail zusätzlich zu den race-spezifischen.

---

## Tech-Stack

- HTML5 + CSS3 + ES6 Modules
- Google Fonts: Bebas Neue, JetBrains Mono, Archivo Black (CDN)
- [Open-Meteo](https://open-meteo.com) — Wetter, kein Key
- [rss2json.com](https://rss2json.com) — RSS-Bridge, kein Key, rate-limited
- Keine Bundler, kein Preprocessor, kein npm, kein TypeScript

---

## Beiträge

Daten-PRs (neue Rennen, korrigierte URLs, ergänzte Channel-Links) sind willkommen — JSON editieren reicht, am einfachsten direkt über den GitHub-Web-Editor.
Code-Beitrags-Guide (`CONTRIBUTING.md`) folgt in Phase 3.
