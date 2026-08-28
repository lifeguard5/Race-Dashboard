// === RACE PIT WALL · core/data.js ===
// Fetch-Layer. import.meta.env.BASE_URL macht Pfade deploy-sicher:
// lokal "/" — auf GitHub Pages "/Race-Dashboard/". Der Alt-Code brach,
// sobald relative Pfade von Unterseiten aus aufgelöst wurden.
//
// LESSON LEARNED (Alt-Code): fehlgeschlagene Promises wurden memoisiert →
// ein einziger Netzwerk-Hänger machte die Seite bis zum Reload datenlos.
// Hier: Cache-Eintrag wird bei Reject wieder entfernt.

const cache = new Map();

const BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) || '/';

export function dataUrl(rel) {
  return `${BASE}data/${rel}`.replace(/\/{2,}/g, '/');
}

/**
 * JSON laden, memoisiert. Fehler räumen den Cache-Slot wieder frei.
 * @param {string} rel  Pfad relativ zu /data, z. B. "races.json"
 */
export function loadJson(rel) {
  if (cache.has(rel)) return cache.get(rel);
  const p = fetch(dataUrl(rel))
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status} für ${rel}`);
      return res.json();
    })
    .catch((err) => {
      cache.delete(rel); // nächster Aufruf versucht es erneut
      throw err;
    });
  cache.set(rel, p);
  return p;
}

export function loadRaces()  { return loadJson('races.json'); }
export function loadSeries() { return loadJson('series.json'); }
export function loadTracks() { return loadJson('tracks.json'); }
export function loadRaceDetail(slug) { return loadJson(`races/${slug}.json`); }

/** Cache gezielt invalidieren (genutzt vom ETag-Polling). */
export function invalidate(rel) {
  cache.delete(rel);
}
