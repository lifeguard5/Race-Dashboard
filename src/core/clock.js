// === RACE PIT WALL · core/clock.js ===
// DER zentrale Tick der App. Ersetzt die drei unkoordinierten setInterval
// des Alt-Codes (Header-Uhr, Countdown, Schedule) durch eine Quelle.
//
// ARCHITEKTUR-ENTSCHEIDUNG: Ein Intervall, viele Abonnenten.
// - `second` für Countdown, Header-Uhr und Live-Bar-Restzeit (1×/s)
// - `minute` für Status-Badges, Relativzeiten, Listen-Sortierung (1×/min) —
//   dadurch kippt der LIVE-Badge OHNE Reload um (Kernfehler im Alt-Code).
//
// MILESTONE 2 · TRADE-OFF "adaptives Ticking": Wir behalten bewusst EIN
// 1s-Intervall statt es bei "kein Rennen live" auf 60s zu drosseln. Grund:
// Header-Uhr und Countdowns brauchen den Sekundentick ohnehin auf jeder
// Seite, und die Visibility-Pause (unten) eliminiert bereits die einzige
// relevante Energiequelle (Hintergrund-Tabs auf Mobile). Zwei Intervall-Modi
// hätten Umschalt-Logik + Testfläche gekostet, ohne messbaren Gewinn.
//
// VISIBILITY-AWARE: Tab im Hintergrund → Intervall stoppt komplett
// (Akku/CPU, Browser drosseln Hintergrund-Timer ohnehin unzuverlässig).
// Beim Zurückkehren sofortiger Tick → UI springt korrekt auf, statt
// veraltete Countdown-Werte zu zeigen.

import { signal, derived } from './signal.js';

/** Tickt jede Sekunde (solange der Tab sichtbar ist). Wert: Date. */
export const second = signal(new Date());

/** Tickt jede Minute — abgeleitet aus `second`, feuert nur bei Minutenwechsel. */
export const minute = derived(second, (d) => {
  // Rückgabe ist ein primitiver Schlüssel, damit Object.is greift.
  return Math.floor(d.getTime() / 60000);
});

let intervalId = null;

function tick() {
  second.set(new Date());
}

function start() {
  if (intervalId !== null) return;
  tick(); // sofort — kein 1s-Loch nach Tab-Rückkehr
  intervalId = setInterval(tick, 1000);
}

function stop() {
  if (intervalId === null) return;
  clearInterval(intervalId);
  intervalId = null;
}

// Nur im Browser automatisch starten (in Vitest/happy-dom steuern Tests selbst).
if (typeof document !== 'undefined' && !globalThis.__RPW_TEST__) {
  document.addEventListener('visibilitychange', () => {
    document.hidden ? stop() : start();
  });
  start();
}

// Für Tests exportiert.
export const _internal = { start, stop, tick };
