// === RACE PIT WALL · countdown.js ===
// Countdown bis Start, oder Race-Clock (verstrichene Zeit) während Live.

import { pad, el } from './utils.js';
import { getRaceStatus } from './race-status.js';

/**
 * Rendert eine Countdown-Box mit 4 Einheiten (TAGE/STUNDEN/MIN/SEK).
 * Tickt automatisch jede Sekunde und schaltet bei Status-Wechsel um.
 *
 * @param {HTMLElement} container - in das gerendert wird
 * @param {{startUtc:string, endUtc:string}} race
 * @returns {() => void} stop-Funktion
 */
export function renderCountdown(container, race) {
  container.replaceChildren();

  const statusLabel = el('div', { class: 'race-clock-status' }, '—');
  const grid = el('div', { class: 'countdown' });
  const unit = (label) => {
    const value = el('div', { class: 'cd-value' }, '00');
    const u = el('div', { class: 'cd-unit' },
      value,
      el('div', { class: 'cd-label' }, label)
    );
    return { node: u, value };
  };
  const dEl = unit('TAGE');
  const hEl = unit('STUNDEN');
  const mEl = unit('MIN');
  const sEl = unit('SEK');
  grid.append(dEl.node, hEl.node, mEl.node, sEl.node);

  container.append(statusLabel, grid);

  const start = new Date(race.startUtc).getTime();
  const end   = new Date(race.endUtc || race.startUtc).getTime();

  let lastStatus = null;

  function tick() {
    const now = Date.now();
    const status = getRaceStatus(race, new Date(now));

    if (status !== lastStatus) {
      lastStatus = status;
      grid.classList.toggle('is-live', status === 'live');
      grid.classList.toggle('is-finished', status === 'finished');
      statusLabel.classList.toggle('live', status === 'live');
      statusLabel.classList.toggle('finished', status === 'finished');
      if (status === 'upcoming') statusLabel.textContent = '▸ COUNTDOWN BIS START';
      else if (status === 'live') statusLabel.textContent = '● RACE CLOCK · LÄUFT';
      else statusLabel.textContent = '◼ RENNEN BEENDET';
    }

    let diffMs;
    if (status === 'upcoming') diffMs = start - now;
    else if (status === 'live') diffMs = now - start;
    else diffMs = end - start;

    diffMs = Math.max(0, diffMs);

    const d = Math.floor(diffMs / 86400000); diffMs -= d * 86400000;
    const h = Math.floor(diffMs / 3600000);  diffMs -= h * 3600000;
    const m = Math.floor(diffMs / 60000);    diffMs -= m * 60000;
    const s = Math.floor(diffMs / 1000);

    dEl.value.textContent = pad(d);
    hEl.value.textContent = pad(h);
    mEl.value.textContent = pad(m);
    sEl.value.textContent = pad(s);
  }

  tick();
  const id = setInterval(tick, 1000);
  return () => clearInterval(id);
}

/** Kompakte Header-Uhr (HH:MM:SS). */
export function attachHeaderClock(elemClock) {
  if (!elemClock) return () => {};
  function tick() {
    const d = new Date();
    elemClock.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }
  tick();
  const id = setInterval(tick, 1000);
  return () => clearInterval(id);
}
