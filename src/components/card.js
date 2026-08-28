// === RACE PIT WALL · components/card.js ===
// Race-Card-Factory (pure DOM, kein innerHTML) + Klassen-Filter-Chips.

import { el, formatRaceDateTime, formatRelative } from '../domain/utils.js';
import { getRaceStatus, getStatusLabel } from '../domain/race-status.js';
import { CLASS_TAGS, CLASS_LABELS } from '../domain/race-classes.js';

const BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) || '/';

/**
 * @param {object} race Eintrag aus races.json
 * @param {Map<string,object>} seriesBySlug
 * @param {Date} now
 */
export function raceCard(race, seriesBySlug, now = new Date()) {
  const status = getRaceStatus(race, now);
  const series = seriesBySlug.get(race.seriesSlug);
  const start = new Date(race.startUtc);

  return el('a', {
    class: `race-card status-${status}`,
    href: `${BASE}race.html?slug=${race.slug}`,
    dataset: { series: race.seriesSlug, status },
  },
    el('div', { class: 'race-card-top' },
      el('span', { class: 'race-series' }, series?.shortName ?? race.seriesSlug),
      el('span', { class: `status-badge status-badge-${status}` }, getStatusLabel(status))
    ),
    el('h3', { class: 'race-name' }, race.name),
    el('div', { class: 'race-meta' },
      el('span', { class: 'race-date' }, formatRaceDateTime(start)),
      el('span', { class: 'race-rel' },
        status === 'upcoming' ? formatRelative(start, now) :
        status === 'live' ? 'läuft jetzt' : formatRelative(new Date(race.endUtc), now)
      )
    ),
    (race.classTags && race.classTags.length)
      ? el('div', { class: 'race-classes' },
          race.classTags.map((t) => el('span', { class: 'class-pill' }, CLASS_LABELS[t] ?? t)))
      : null,
    race.startTimeConfirmed === false
      ? el('div', { class: 'race-tbc muted' }, 'Startzeit tbc')
      : null
  );
}

/**
 * Klassen-Filter-Chips. Mehrfachauswahl, Zustand via onToggle nach außen.
 * @param {string[]} selected
 * @param {(tag: string) => void} onToggle
 */
export function classFilterChips(selected, onToggle) {
  return el('div', { class: 'class-chips', role: 'group', 'aria-label': 'Nach Rennklasse filtern' },
    CLASS_TAGS.map((tag) =>
      el('button', {
        class: `chip${selected.includes(tag) ? ' chip-active' : ''}`,
        type: 'button',
        'aria-pressed': String(selected.includes(tag)),
        onClick: () => onToggle(tag),
      }, CLASS_LABELS[tag])
    )
  );
}
