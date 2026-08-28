// === RACE PIT WALL · live/live.js ===
// MILESTONE 2: Globaler Live-Zustand.
//
// Ein Signal `races` (von der Seite befüllt), daraus abgeleitet:
// - liveRaces:  aktuell laufende Rennen (kippt über minute-Tick um)
// - soonRaces:  Start in < 60 min (steuert u. a. das ETag-Polling)
//
// Dazu Seiteneffekte, die das Dashboard-Gefühl tragen:
// - document.title: "🔴 LIVE: <Rennen> · RACE PIT WALL"
// - Favicon-Swap auf rote Variante während Live-Phasen
// Beides hängt am minute-Tick — billig, aber im Browser-Tab sofort sichtbar.

import { signal } from '../core/signal.js';
import { minute } from '../core/clock.js';
import { getRaceStatus } from '../domain/race-status.js';

/** Von Seitenmodulen befüllt (Array aus races.json). */
export const races = signal([]);

/** Live- und Bald-Listen als eigene Signale (nur Referenzwechsel bei Änderung). */
export const liveRaces = signal([]);
export const soonRaces = signal([]);

const SOON_MS = 60 * 60 * 1000;

function recompute() {
  const list = races.get() || [];
  const now = new Date();
  const live = list.filter((r) => getRaceStatus(r, now) === 'live');
  const soon = list.filter((r) => {
    if (getRaceStatus(r, now) !== 'upcoming') return false;
    return new Date(r.startUtc) - now < SOON_MS;
  });
  // Nur neue Referenz setzen, wenn sich die Slug-Menge ändert —
  // sonst würde jede Minute jeder Subscriber feuern.
  if (slugKey(live) !== slugKey(liveRaces.get())) liveRaces.set(live);
  if (slugKey(soon) !== slugKey(soonRaces.get())) soonRaces.set(soon);
}

function slugKey(list) {
  return (list || []).map((r) => r.slug).join(',');
}

races.subscribe(recompute);
minute.subscribe(recompute);

/** true, wenn Daten-Polling gerade sinnvoll ist. */
export function pollingActive() {
  return liveRaces.get().length > 0 || soonRaces.get().length > 0;
}

// ---------------------------------------------------------------------------
// Tab-Titel + Favicon
// ---------------------------------------------------------------------------

const BASE_TITLE = 'RACE PIT WALL';
let faviconSwapped = false;

// Rotes Live-Favicon als Data-URI (16×16-SVG-Punkt) — kein Extra-Asset nötig.
const LIVE_FAVICON =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">' +
    '<rect width="16" height="16" rx="3" fill="#0a0c0a"/>' +
    '<circle cx="8" cy="8" r="5" fill="#ff3b30"/></svg>'
  );

let originalFaviconHref = null;

function faviconLink() {
  let link = document.querySelector('link[rel~="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  return link;
}

export function applyLiveChrome(liveList) {
  if (typeof document === 'undefined') return;
  const live = liveList ?? liveRaces.get();
  if (live.length > 0) {
    const first = live[0];
    const more = live.length > 1 ? ` +${live.length - 1}` : '';
    document.title = `\u{1F534} LIVE: ${first.name}${more} · ${BASE_TITLE}`;
    const link = faviconLink();
    if (!faviconSwapped) {
      originalFaviconHref = link.href || null;
      link.href = LIVE_FAVICON;
      faviconSwapped = true;
    }
  } else {
    if (document.title.includes('LIVE:')) document.title = BASE_TITLE;
    if (faviconSwapped) {
      const link = faviconLink();
      if (originalFaviconHref) link.href = originalFaviconHref;
      faviconSwapped = false;
    }
  }
}

if (typeof document !== 'undefined' && !globalThis.__RPW_TEST__) {
  liveRaces.subscribe((list) => applyLiveChrome(list));
}
