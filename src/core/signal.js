// === RACE PIT WALL · core/signal.js ===
// Minimale Reaktivität: ein Signal hält einen Wert und benachrichtigt Abonnenten.
//
// ARCHITEKTUR-ENTSCHEIDUNG: bewusst *explizites* subscribe() statt
// Auto-Dependency-Tracking (wie Preact Signals / Svelte Runes). Bei ~6 Seiten
// und einer Handvoll Signale ist Nachvollziehbarkeit wichtiger als Komfort:
// man sieht an jeder Stelle exakt, wer wann neu rendert. Kein Framework-Verhalten,
// das man debuggen muss — nur ein Set von Callbacks.

/**
 * @template T
 * @param {T} initial
 */
export function signal(initial) {
  let value = initial;
  const subscribers = new Set();

  return {
    /** Aktuellen Wert lesen. */
    get() {
      return value;
    },

    /**
     * Wert setzen. Benachrichtigt nur bei tatsächlicher Änderung (Object.is),
     * damit z. B. ein Minuten-Signal nicht 60× pro Minute feuert.
     * @param {T} next
     */
    set(next) {
      if (Object.is(value, next)) return;
      value = next;
      for (const fn of subscribers) fn(value);
    },

    /**
     * Abonnieren. Callback wird sofort einmal mit dem aktuellen Wert
     * aufgerufen (Render-Initialisierung) und danach bei jeder Änderung.
     * @param {(value: T) => void} fn
     * @returns {() => void} unsubscribe
     */
    subscribe(fn) {
      subscribers.add(fn);
      fn(value);
      return () => subscribers.delete(fn);
    },
  };
}

/**
 * Abgeleitetes Signal: transformiert ein Quell-Signal.
 * Dank Object.is-Guard in set() feuert es nur, wenn sich das
 * *Ergebnis* ändert — Basis für clock.minute (tickt 1×/Minute,
 * obwohl die Quelle 1×/Sekunde tickt).
 * @template T, U
 * @param {{subscribe: Function}} source
 * @param {(value: T) => U} transform
 */
export function derived(source, transform) {
  const out = signal(undefined);
  source.subscribe((v) => out.set(transform(v)));
  return out;
}
