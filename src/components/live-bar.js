// === RACE PIT WALL · components/live-bar.js ===
// MILESTONE 2: <rpw-live-bar> — globale, sticky Leiste, sichtbar sobald
// irgendein Rennen live ist. Pro Live-Rennen: pulsierender Punkt, Name,
// Klassen-Tags, Restzeit (tickt sekündlich) und Fortschrittsbalken.
//
// REAKTIVITÄT: Struktur (welche Rennen live sind) hängt an liveRaces
// (Referenzwechsel nur bei Mengen-Änderung). Restzeit + Progress hängen am
// second-Tick und patchen NUR Textknoten/Styles — kein Re-Layout pro Sekunde.

import { el } from '../domain/utils.js';
import { second } from '../core/clock.js';
import { liveRaces } from '../live/live.js';

const BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) || '/';

function fmtRemaining(ms) {
  if (ms <= 0) return 'ZIELFLAGGE';
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

class RpwLiveBar extends HTMLElement {
  connectedCallback() {
    this.rows = new Map(); // slug → { remainEl, progEl, race }
    this.unsubLive = liveRaces.subscribe((list) => this.renderStructure(list));
    this.unsubTick = second.subscribe((now) => this.patchTimes(now));
  }

  disconnectedCallback() {
    this.unsubLive?.();
    this.unsubTick?.();
  }

  renderStructure(list) {
    this.replaceChildren();
    this.rows.clear();
    if (!list.length) {
      this.hidden = true;
      return;
    }
    this.hidden = false;

    const wrap = el('div', { class: 'live-bar', role: 'status', 'aria-live': 'polite' });
    for (const race of list) {
      const remainEl = el('span', { class: 'live-remain' }, '—:—');
      const progEl = el('div', { class: 'live-progress-fill' });
      const row = el('a', { class: 'live-row', href: `${BASE}race.html?slug=${race.slug}`, dataset: { series: race.seriesSlug } },
        el('span', { class: 'live-dot', 'aria-hidden': 'true' }),
        el('span', { class: 'live-label' }, 'LIVE'),
        el('span', { class: 'live-name' }, race.name),
        el('span', { class: 'live-tags' }, (race.classTags || []).join(' · ')),
        remainEl,
        el('div', { class: 'live-progress' }, progEl)
      );
      wrap.append(row);
      this.rows.set(race.slug, { remainEl, progEl, race });
    }
    this.append(wrap);
    this.patchTimes(new Date());
  }

  patchTimes(now) {
    if (this.hidden) return;
    for (const { remainEl, progEl, race } of this.rows.values()) {
      const start = new Date(race.startUtc).getTime();
      const end = new Date(race.endUtc).getTime();
      const remain = end - now.getTime();
      remainEl.textContent = fmtRemaining(remain);
      const pct = Math.min(100, Math.max(0, ((now.getTime() - start) / (end - start)) * 100));
      progEl.style.width = `${pct.toFixed(2)}%`;
    }
  }
}

customElements.define('rpw-live-bar', RpwLiveBar);
