// === RACE PIT WALL · render-series.js ===
// Saisonkalender einer Serie — ?id=<series-slug>[&season=YYYY]

import { loadCore } from './data-loader.js';
import { getRaceStatus, getStatusLabel, compareForListing } from './race-status.js';
import { formatRaceDateTime, formatRelative, indexBy, el, qs } from './utils.js';
import { showError } from './app.js';

const main = document.getElementById('serie-main');

(async function init() {
  const slug = qs('id');
  if (!slug) {
    showError(main, 'KEINE SERIE GEWÄHLT', 'URL erwartet ?id=<series-slug>. Beispiel: serie.html?id=wec');
    return;
  }

  try {
    const { series, tracks, races } = await loadCore();
    const seriesObj = series.find(s => s.slug === slug);
    if (!seriesObj) {
      showError(main, 'SERIE NICHT GEFUNDEN', `Slug "${slug}" existiert nicht in data/series.json.`);
      return;
    }
    document.title = `${seriesObj.shortName || seriesObj.name} · RACE PIT WALL`;

    const ownRaces = races.filter(r => r.seriesSlug === slug);
    const tracksMap = indexBy(tracks, 'slug');

    const requestedSeason = qs('season');
    const seasons = [...new Set(ownRaces.map(r => r.season))].sort((a, b) => b - a);
    const activeSeason = requestedSeason ? Number(requestedSeason) : (seasons[0] ?? null);

    render({ series: seriesObj, ownRaces, tracksMap, seasons, activeSeason });
  } catch (e) {
    console.error(e);
    showError(main, 'DATEN-LADEFEHLER', e.message);
  }
})();

function render({ series, ownRaces, tracksMap, seasons, activeSeason }) {
  main.replaceChildren();
  const now = new Date();

  // Hero
  main.append(renderHero(series, ownRaces, activeSeason, seasons));

  // Saisonrennen
  const seasonRaces = activeSeason
    ? ownRaces.filter(r => r.season === activeSeason)
    : ownRaces;
  seasonRaces.sort((a, b) => compareForListing(a, b, now));

  if (!seasonRaces.length) {
    main.append(el('div', { class: 'stub-box' },
      el('div', { class: 'tag' }, 'KEINE RENNEN'),
      el('h2', {}, 'Saison leer'),
      el('p', {}, 'Für diese Serie sind in der gewählten Saison noch keine Rennen hinterlegt.'),
      el('a', { href: 'serie.html?id=' + series.slug }, '→ Alle Saisons anzeigen')
    ));
    return;
  }

  // Race-Cards (gleicher Stil wie Rennliste)
  const grid = el('div', { class: 'list-grid' });
  for (const r of seasonRaces) grid.append(renderCard(r, series, tracksMap, now));
  main.append(grid);
}

function renderHero(series, ownRaces, activeSeason, seasons) {
  return el('section', { class: 'race-hero span-full' },
    el('div', { class: 'card-corner' }),
    el('div', { class: 'meta-line' },
      el('span', { class: 'series-tag' }, series.shortName || series.slug.toUpperCase()),
      series.category ? el('span', {}, (series.category + '').toUpperCase().replace(/-/g, ' · ')) : null,
      activeSeason ? el('span', {}, 'SAISON ' + activeSeason) : null
    ),
    el('h1', {}, series.name),
    series.description ? el('div', {
      style: { fontSize: '13px', color: 'var(--ink-dim)', lineHeight: '1.6', marginTop: 'var(--space-3)', maxWidth: '680px' }
    }, series.description) : null,
    el('div', { class: 'sub-line' },
      el('div', {}, 'RENNEN GESAMT · ', el('b', {}, String(ownRaces.length))),
      activeSeason ? el('div', {}, 'IN ' + activeSeason + ' · ', el('b', {}, String(ownRaces.filter(r => r.season === activeSeason).length))) : null,
      series.officialUrl ? el('a', { href: series.officialUrl, target: '_blank', rel: 'noopener', style: { color: 'var(--green)' } }, 'OFFIZIELL ↗') : null
    ),
    seasons.length > 1 ? renderSeasonSelector(series.slug, seasons, activeSeason) : null
  );
}

function renderSeasonSelector(slug, seasons, activeSeason) {
  return el('div', { class: 'season-selector' },
    el('span', { class: 'season-label' }, 'SAISON:'),
    ...seasons.map(s => el('a', {
      class: 'season-chip' + (s === activeSeason ? ' active' : ''),
      href: 'serie.html?id=' + slug + '&season=' + s,
    }, String(s)))
  );
}

function renderCard(race, series, tracksMap, now) {
  const track  = tracksMap.get(race.trackSlug);
  const status = getRaceStatus(race, now);
  const start  = new Date(race.startUtc);

  return el('a', { class: 'race-card list-card', href: `race.html?id=${encodeURIComponent(race.slug)}` },
    el('div', { class: 'card-corner' }),
    el('div', { class: 'race-card-top' },
      el('span', { class: 'race-card-series' }, series.shortName || race.seriesSlug),
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
