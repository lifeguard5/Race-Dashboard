// === RACE PIT WALL · render-list.js ===
// Rennliste mit URL-Filtern: ?series=wec,nls&season=2026&status=upcoming,live

import { loadCore } from './data-loader.js';
import { getRaceStatus, getStatusLabel, compareForListing } from './race-status.js';
import { formatRaceDateTime, formatRelative, indexBy, el } from './utils.js';
import { showError } from './app.js';

const main = document.getElementById('list-main');

(async function init() {
  try {
    const { series, tracks, races } = await loadCore();
    const seriesMap = indexBy(series, 'slug');
    const tracksMap = indexBy(tracks, 'slug');

    const params = new URLSearchParams(location.search);
    const filter = {
      series: parseCsv(params.get('series')),
      season: parseCsv(params.get('season')).map(Number),
      status: parseCsv(params.get('status')),
    };

    render({ races, seriesMap, tracksMap, allSeries: series, filter });
  } catch (e) {
    console.error(e);
    showError(main, 'DATEN-LADEFEHLER', e.message);
  }
})();

function parseCsv(s) {
  return s ? s.split(',').map(x => x.trim()).filter(Boolean) : [];
}

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
  filtered.sort((a, b) => compareForListing(a, b, now));

  // Filter-Bar oben
  main.append(renderFilterBar(allSeries, races, filter, filtered.length, races.length));

  if (!filtered.length) {
    main.append(el('div', { class: 'stub-box' },
      el('div', { class: 'tag' }, 'KEIN TREFFER'),
      el('h2', {}, 'Nichts gefunden'),
      el('p', {}, 'Mit den aktuellen Filtern bleibt die Liste leer. Setz die Filter zurück oder erweitere sie.'),
      el('a', { href: 'rennen.html' }, '→ Alle Rennen')
    ));
    return;
  }

  // Karten — exakt im Hub-Stil
  const grid = el('div', { class: 'list-grid' });
  for (const r of filtered) grid.append(renderListCard(r, seriesMap, tracksMap, now));
  main.append(grid);
}

function renderFilterBar(allSeries, allRaces, filter, shownCount, totalCount) {
  const seasons = [...new Set(allRaces.map(r => r.season))].sort((a, b) => b - a);
  const statuses = [
    { value: 'upcoming', label: 'BEVORSTEHEND' },
    { value: 'live',     label: 'LIVE' },
    { value: 'finished', label: 'BEENDET' },
  ];

  const groupsWrap = el('div', { class: 'filter-bar-groups' },
    renderChipGroup('SERIE',  allSeries.map(s => ({ value: s.slug, label: s.shortName })), filter.series, 'series'),
    renderChipGroup('SAISON', seasons.map(s => ({ value: String(s), label: String(s) })), filter.season.map(String), 'season'),
    renderChipGroup('STATUS', statuses, filter.status, 'status'),
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
    hasFilter ? el('a', { class: 'filter-clear', href: 'rennen.html' }, '✕ ZURÜCKSETZEN') : el('span')
  );
}

function renderChipGroup(label, options, activeValues, paramKey) {
  const group = el('div', { class: 'filter-group' },
    el('div', { class: 'filter-label' }, label)
  );
  const chipRow = el('div', { class: 'filter-chips' });
  for (const opt of options) {
    const active = activeValues.includes(opt.value);
    chipRow.append(el('a', {
      class: 'filter-chip' + (active ? ' active' : ''),
      href: buildToggleUrl(paramKey, opt.value, active),
    }, opt.label));
  }
  group.append(chipRow);
  return group;
}

function buildToggleUrl(key, value, currentlyActive) {
  const params = new URLSearchParams(location.search);
  const current = (params.get(key) || '').split(',').filter(Boolean);
  let next;
  if (currentlyActive) next = current.filter(v => v !== value);
  else                 next = [...current, value];
  if (next.length) params.set(key, next.join(','));
  else             params.delete(key);
  return 'rennen.html' + (params.toString() ? '?' + params : '');
}

function renderListCard(race, seriesMap, tracksMap, now) {
  const series = seriesMap.get(race.seriesSlug);
  const track  = tracksMap.get(race.trackSlug);
  const status = getRaceStatus(race, now);
  const start  = new Date(race.startUtc);

  return el('a', { class: 'race-card list-card', href: `race.html?id=${encodeURIComponent(race.slug)}` },
    el('div', { class: 'card-corner' }),
    el('div', { class: 'race-card-top' },
      el('span', { class: 'race-card-series' }, series ? series.shortName : race.seriesSlug),
      el('span', { class: 'status-badge ' + status },
        status === 'live' ? el('span', { class: 'dot' }) : null,
        getStatusLabel(status)
      )
    ),
    el('div', { class: 'race-card-name' }, race.name),
    el('div', { class: 'race-card-track' }, track ? track.name : race.trackSlug),
    el('div', { class: 'race-card-when' },
      el('span', { class: 'label' }, status === 'finished' ? 'GELAUFEN AM' : (status === 'live' ? 'LÄUFT SEIT' : 'START')),
      el('div', { class: 'big' }, formatRaceDateTime(start)),
      el('div', { class: 'dim' }, formatRelative(start, now))
    )
  );
}
