// === RACE PIT WALL · core/poll.js ===
// MILESTONE 2: Daten-Polling mit ETag / If-None-Match.
//
// WARUM: Der Rennstatus (upcoming/live/finished) braucht KEIN Polling —
// er wird client-seitig aus UTC-Timestamps berechnet und kippt über den
// minute-Tick um. Polling lohnt nur für den Fall, dass die JSON-Dateien
// WÄHREND eines Rennens editiert werden (Ergebnis nachtragen, Zeitplan-
// Änderung, Red-Flag-Notiz). GitHub Pages liefert ETags; eine 304-Antwort
// kostet praktisch nichts (kein Body).
//
// STRATEGIE:
// - aktiv nur, wenn mind. ein Rennen live ist ODER in < 60 min startet
// - Intervall 3 min, visibility-aware (Hintergrund-Tab pollt nicht)
// - bei geändertem ETag: data.js-Cache invalidieren + onChange feuern →
//   Seitenmodule laden neu und re-rendern über ihr races-Signal.

import { dataUrl, invalidate } from './data.js';

/**
 * Startet einen ETag-Poller für eine Datei unter /data.
 * @param {string} rel z. B. "races.json"
 * @param {(rel: string) => void} onChange
 * @param {{ intervalMs?: number, isActive?: () => boolean }} [opts]
 * @returns {() => void} stop
 */
export function startEtagPoll(rel, onChange, opts = {}) {
  const intervalMs = opts.intervalMs ?? 3 * 60 * 1000;
  const isActive = opts.isActive ?? (() => true);
  let lastEtag = null;
  let timer = null;
  let stopped = false;

  async function check() {
    if (stopped) return;
    if (typeof document !== 'undefined' && document.hidden) return; // Hintergrund: nichts tun
    if (!isActive()) return;
    try {
      const res = await fetch(dataUrl(rel), {
        method: 'GET',
        headers: lastEtag ? { 'If-None-Match': lastEtag } : {},
        cache: 'no-cache',
      });
      if (res.status === 304) return; // unverändert — der Normalfall
      const etag = res.headers.get('ETag');
      const changed = lastEtag !== null && etag !== lastEtag;
      lastEtag = etag;
      if (changed && res.ok) {
        invalidate(rel);
        onChange(rel);
      }
    } catch {
      // Netzwerkfehler beim Polling sind egal — nächster Versuch kommt.
    }
  }

  check(); // ETag initial merken
  timer = setInterval(check, intervalMs);

  return function stop() {
    stopped = true;
    if (timer) clearInterval(timer);
  };
}
