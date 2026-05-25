// === RACE PIT WALL · render-series-list.js ===
// Serien-Übersicht: alle Meisterschaften als Karten, jede zeigt Anzahl Rennen + nächstes.

import { loadCore } from './data-loader.js';
import { getRaceStatus, pickFeaturedRace } from './race-status.js';
import { formatRaceDateTime, formatRelative, el } from './utils.js';
import { showError } from './app.js';

const main = document.getElementById('series-main');

(async function init() {
  try {
    const { series, races } = await loadCore();
    render(series, races);
  } catch (e) {
    console.error(e);
    showError(main, 'DATEN-LADEFEHLER', e.message);
  }
})();

function render(series, races) {
  main.replaceChildren();
  const now = new Date();

  const sorted = [...series].sort((a, b) => a.name.localeCompare(b.name, 'de'));

  const grid = el('div', { class: 'series-grid' });
  for (const s of sorted) {
    const own = races.filter(r => r.seriesSlug === s.slug);
    const total = own.length;
    const upcoming = own.filter(r => getRaceStatus(r, now) === 'upcoming').length;
    const live     = own.filter(r => getRaceStatus(r, now) === 'live').length;
    const finished = own.filter(r => getRaceStatus(r, now) === 'finished').length;
    const nextRace = pickFeaturedRace(own, now);

    grid.append(el('a', {
      class: 'series-card',
      href: 'serie.html?id=' + encodeURIComponent(s.slug),
    },
      el('div', { class: 'card-corner' }),
      el('div', { class: 'series-card-shortname' }, s.shortName || s.slug.toUpperCase()),
      el('div', { class: 'series-card-name' }, s.name),
      s.description ? el('div', { class: 'series-card-desc' }, s.description) : null,
      s.classes && s.classes.length
        ? el('div', { class: 'series-card-classes' },
            ...s.classes.slice(0, 6).map(c => el('span', { class: 'class-pill' }, c)))
        : null,
      el('div', { class: 'series-card-stats' },
        statBlock(total, 'GESAMT'),
        live > 0 ? statBlock(live, 'LIVE', 'red') : null,
        upcoming > 0 ? statBlock(upcoming, 'BEVOR', 'green') : null,
        finished > 0 ? statBlock(finished, 'BEENDET', 'dim') : null,
      ),
      nextRace
        ? el('div', { class: 'series-card-next' },
            el('div', { class: 'next-label' },
              getRaceStatus(nextRace, now) === 'live' ? '▶ AKTUELL'
              : (getRaceStatus(nextRace, now) === 'upcoming' ? '▶ ALS NÄCHSTES' : '◼ ZULETZT')),
            el('div', { class: 'next-name' }, nextRace.name),
            el('div', { class: 'next-when' },
              formatRaceDateTime(new Date(nextRace.startUtc)), ' · ',
              el('span', { class: 'dim' }, formatRelative(new Date(nextRace.startUtc), now))
            )
          )
        : el('div', { class: 'series-card-next empty' }, 'Noch keine Rennen eingetragen')
    ));
  }
  main.append(grid);
}

function statBlock(value, label, tone) {
  return el('div', { class: 'stat-block' + (tone ? ' tone-' + tone : '') },
    el('div', { class: 'stat-value' }, String(value)),
    el('div', { class: 'stat-label' }, label)
  );
}
