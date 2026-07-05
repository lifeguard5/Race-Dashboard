// === RACE PIT WALL · render-cal.js ===
// Globaler Kalender — alle Rennen, nach Monat gruppiert.
// Filter via URL-Params identisch zu render-list.js (?series=, ?season=, ?status=).

import { loadCore } from './data-loader.js';
import { getRaceStatus, getStatusLabel } from './race-status.js';
import { formatRelative, indexBy, el, pad } from './utils.js';
import { icon } from './icons.js';
import { showError } from './app.js';

const main = document.getElementById('cal-main');

const MONTHS_DE = ['JANUAR','FEBRUAR','MÄRZ','APRIL','MAI','JUNI','JULI','AUGUST','SEPTEMBER','OKTOBER','NOVEMBER','DEZEMBER'];
const WEEKDAYS_DE_SHORT = ['SO','MO','DI','MI','DO','FR','SA'];

(async function init() {
  try {
    const { series, tracks, races } = await loadCore();
    const seriesMap = indexBy(series, 'slug');
    const tracksMap = indexBy(tracks, 'slug');

    const params = new URLSearchParams(location.search);
    const filter = {
      series: csv(params.get('series')),
      season: csv(params.get('season')).map(Number),
      status: csv(params.get('status')),
    };

    render({ races, seriesMap, tracksMap, allSeries: series, filter });
  } catch (e) {
    console.error(e);
    showError(main, 'DATEN-LADEFEHLER', e.message);
  }
})();

function csv(s) { return s ? s.split(',').map(x => x.trim()).filter(Boolean) : []; }

function render({ races, seriesMap, tracksMap, allSeries, filter }) {
  main.replaceChildren();
  const now = new Date();

  // Filter anwenden
  const filtered = races.filter(r => {
    if (filter.series.length && !filter.series.includes(r.seriesSlug)) return false;
    if (filter.season.length && !filter.season.includes(r.season)) return false;
    if (filter.status.length && !filter.status.includes(getRaceStatus(r, now))) return false;
    return true;
  });

  // Filter-Bar (gleicher Stil wie Rennliste)
  main.append(renderFilterBar(allSeries, races, filter, filtered.length, races.length));

  if (!filtered.length) {
    main.append(el('div', { class: 'stub-box' },
      el('div', { class: 'tag' }, 'KEIN TREFFER'),
      el('h2', {}, 'Nichts gefunden'),
      el('p', {}, 'Filter zurücksetzen oder erweitern.'),
      el('a', { href: 'kalender.html' }, '→ Alle Rennen')
    ));
    return;
  }

  // Nach Monat gruppieren
  const byMonth = new Map(); // key: "2026-05"
  for (const r of filtered) {
    const d = new Date(r.startUtc);
    const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
    if (!byMonth.has(key)) byMonth.set(key, []);
    byMonth.get(key).push(r);
  }
  // Monate chronologisch
  const sortedKeys = [...byMonth.keys()].sort();

  const calWrap = el('div', { class: 'cal-wrap' });
  for (const key of sortedKeys) {
    const [yr, mo] = key.split('-').map(Number);
    const items = byMonth.get(key).sort((a, b) => new Date(a.startUtc) - new Date(b.startUtc));
    calWrap.append(renderMonth(yr, mo, items, seriesMap, tracksMap, now));
  }
  main.append(calWrap);
}

function renderMonth(year, monthOneBased, races, seriesMap, tracksMap, now) {
  const monthName = MONTHS_DE[monthOneBased - 1];
  const isThisMonth = now.getFullYear() === year && (now.getMonth() + 1) === monthOneBased;

  const head = el('div', { class: 'cal-month-head' + (isThisMonth ? ' current' : '') },
    el('div', { class: 'cal-month-title' }, monthName),
    el('div', { class: 'cal-month-year' }, String(year)),
    el('div', { class: 'cal-month-count' }, races.length + (races.length === 1 ? ' RENNEN' : ' RENNEN'))
  );

  const list = el('div', { class: 'cal-month-list' });
  for (const r of races) list.append(renderCalRow(r, seriesMap, tracksMap, now));

  return el('section', { class: 'cal-month' + (isThisMonth ? ' current' : '') }, head, list);
}

function renderCalRow(race, seriesMap, tracksMap, now) {
  const start = new Date(race.startUtc);
  const end = new Date(race.endUtc);
  const status = getRaceStatus(race, now);
  const series = seriesMap.get(race.seriesSlug);
  const track  = tracksMap.get(race.trackSlug);

  const dayBox = el('div', { class: 'cal-day' },
    el('div', { class: 'cal-day-num' }, String(start.getDate())),
    el('div', { class: 'cal-day-wd' }, WEEKDAYS_DE_SHORT[start.getDay()]),
    // Bei Mehrtagesrennen: kleines Brückchen anzeigen
    isMultiDay(start, end) ? el('div', { class: 'cal-day-span' }, '→ ' + end.getDate()) : null
  );

  return el('a', {
    class: 'cal-row ' + status,
    href: `race.html?id=${encodeURIComponent(race.slug)}`,
    dataset: { series: race.seriesSlug || '' },
  },
    dayBox,
    el('div', { class: 'cal-info' },
      el('div', { class: 'cal-info-top' },
        el('span', { class: 'cal-series' }, series ? series.shortName : race.seriesSlug),
        el('span', { class: 'status-badge ' + status },
          status === 'live' ? el('span', { class: 'dot' }) : null,
          getStatusLabel(status)
        )
      ),
      el('div', { class: 'cal-name' }, race.name),
      el('div', { class: 'cal-meta' },
        el('span', {}, icon('pin'), ' ', track ? track.name : race.trackSlug),
        el('span', {}, icon('flag'), ' ', pad(start.getHours()) + ':' + pad(start.getMinutes()), ' deine Zeit'),
        el('span', { class: 'cal-relative' }, formatRelative(start, now))
      )
    )
  );
}

function isMultiDay(start, end) {
  return start.getDate() !== end.getDate()
      || start.getMonth() !== end.getMonth()
      || start.getFullYear() !== end.getFullYear();
}

// === Filter-Bar (gemeinsam mit render-list.js — hier dupliziert, um keine import-Schleife zu bauen)
function renderFilterBar(allSeries, allRaces, filter, shownCount, totalCount) {
  const seasons = [...new Set(allRaces.map(r => r.season))].sort((a, b) => b - a);
  const statuses = [
    { value: 'upcoming', label: 'BEVORSTEHEND' },
    { value: 'live',     label: 'LIVE' },
    { value: 'finished', label: 'BEENDET' },
  ];
  const groupsWrap = el('div', { class: 'filter-bar-groups' },
    chipGroup('SERIE',  allSeries.map(s => ({ value: s.slug, label: s.shortName })), filter.series, 'series'),
    chipGroup('SAISON', seasons.map(s => ({ value: String(s), label: String(s) })), filter.season.map(String), 'season'),
    chipGroup('STATUS', statuses, filter.status, 'status'),
  );
  const hasFilter = filter.series.length || filter.season.length || filter.status.length;

  return el('section', { class: 'filter-bar' },
    el('div', { class: 'filter-count' },
      el('span', { class: 'count-big' }, String(shownCount)),
      el('span', { class: 'count-sep' }, '/'),
      el('span', { class: 'count-total' }, String(totalCount)),
      el('span', { class: 'count-label' }, 'RENNEN')
    ),
    groupsWrap,
    hasFilter ? el('a', { class: 'filter-clear', href: 'kalender.html' }, '✕ ZURÜCKSETZEN') : el('span')
  );
}
function chipGroup(label, options, activeValues, paramKey) {
  const row = el('div', { class: 'filter-chips' });
  for (const opt of options) {
    const active = activeValues.includes(opt.value);
    row.append(el('a', {
      class: 'filter-chip' + (active ? ' active' : ''),
      href: chipToggleUrl(paramKey, opt.value, active),
    }, opt.label));
  }
  return el('div', { class: 'filter-group' },
    el('div', { class: 'filter-label' }, label),
    row
  );
}
function chipToggleUrl(key, value, currentlyActive) {
  const params = new URLSearchParams(location.search);
  const current = (params.get(key) || '').split(',').filter(Boolean);
  const next = currentlyActive ? current.filter(v => v !== value) : [...current, value];
  if (next.length) params.set(key, next.join(','));
  else             params.delete(key);
  return 'kalender.html' + (params.toString() ? '?' + params : '');
}
