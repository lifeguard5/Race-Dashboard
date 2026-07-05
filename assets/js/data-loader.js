// === RACE PIT WALL · data-loader.js ===
// Minimal fetch-Wrapper mit Memo-Cache. Pfade relativ zur aufrufenden HTML-Datei.
// Wichtig: Unter file:// blockt Chrome fetch() — siehe README.

const _cache = new Map();

async function fetchJson(path) {
  if (_cache.has(path)) return _cache.get(path);
  const p = (async () => {
    let res;
    try {
      res = await fetch(path, { cache: 'default' });
    } catch (e) {
      const isFile = location.protocol === 'file:';
      const hint = isFile
        ? ' — file://-Modus blockt fetch(). Bitte mit `python3 -m http.server 8000` oder über GitHub Pages öffnen.'
        : '';
      throw new Error(`Daten konnten nicht geladen werden: ${path}${hint}`);
    }
    if (!res.ok) throw new Error(`HTTP ${res.status} beim Laden von ${path}`);
    return res.json();
  })();
  // Evict rejected promises: otherwise a single transient network error
  // poisons this path for every later caller until a full page reload.
  p.catch(() => _cache.delete(path));
  _cache.set(path, p);
  return p;
}

export async function loadConfig()  { return fetchJson('data/config.json'); }
export async function loadSeries()  { return fetchJson('data/series.json'); }
export async function loadTracks()  { return fetchJson('data/tracks.json'); }
export async function loadRaceIndex() { return fetchJson('data/races.json'); }

export async function loadRace(slug) {
  if (!slug) throw new Error('loadRace: slug fehlt');
  return fetchJson(`data/races/${slug}.json`);
}

/** Lädt config + series + tracks + races-Index gemeinsam (parallel). */
export async function loadCore() {
  const [config, series, tracks, races] = await Promise.all([
    loadConfig(),
    loadSeries(),
    loadTracks(),
    loadRaceIndex(),
  ]);
  return { config, series, tracks, races };
}

/** Cache leeren — für Dev/Reload. */
export function clearDataCache() { _cache.clear(); }
