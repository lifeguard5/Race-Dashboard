// === RACE PIT WALL · render-hub.js ===
// Hub-Seite: Featured-Race + Liste aller weiteren Rennen.

import { loadCore } from './data-loader.js';
import { getRaceStatus, getStatusLabel, pickFeaturedRace, compareForListing } from './race-status.js';
import { formatRaceDateTime, formatRelative, indexBy, el } from './utils.js';
import { showError } from './app.js';

const main = document.getElementById('hub-main');

(async function init() {
  try {
    const { series, tracks, races } = await loadCore();
    const seriesMap = indexBy(series, 'slug');
    const tracksMap = indexBy(tracks, 'slug');

    const now = new Date();
    const featured = pickFeaturedRace(races, now);
    const others = races.filter(r => r !== featured).sort((a, b) => compareForListing(a, b, now));

    main.replaceChildren();
    if (featured) main.append(renderFeatured(featured, seriesMap, tracksMap, now));
    others.forEach(r => main.append(renderCard(r, seriesMap, tracksMap, now)));

    if (!races.length) {
      main.append(el('div', { class: 'stub-box' },
        el('div', { class: 'tag' }, 'KEINE RENNEN'),
        el('h2', {}, 'Noch nichts hinterlegt'),
        el('p', {}, 'Lege ein Rennen unter data/races/ an und trage es in data/races.json ein.')
      ));
    }
  } catch (e) {
    console.error(e);
    showError(main, 'DATEN-LADEFEHLER', e.message);
  }
})();

function renderFeatured(race, seriesMap, tracksMap, now) {
  const series = seriesMap.get(race.seriesSlug);
  const track  = tracksMap.get(race.trackSlug);
  const status = getRaceStatus(race, now);
  const start  = new Date(race.startUtc);

  return el('a', { class: 'featured-race', href: `race.html?id=${encodeURIComponent(race.slug)}` },
    el('div', { class: 'featured-label' },
      el('span', { class: 'status-badge ' + status },
        status === 'live' ? el('span', { class: 'dot' }) : null,
        getStatusLabel(status)
      ),
      '· FEATURED · ',
      series ? series.shortName : (race.seriesSlug || '').toUpperCase()
    ),
    el('h2', {}, race.name),
    el('div', { class: 'meta' },
      el('div', {}, '📍 ', el('b', {}, track ? track.name : race.trackSlug)),
      el('div', {}, '🏁 ', el('b', {}, formatRaceDateTime(start))),
      el('div', {}, '⏱ ', el('b', {}, formatRelative(start, now)))
    ),
    el('span', { class: 'featured-cta' }, 'ÖFFNEN →')
  );
}

function renderCard(race, seriesMap, tracksMap, now) {
  const series = seriesMap.get(race.seriesSlug);
  const track  = tracksMap.get(race.trackSlug);
  const status = getRaceStatus(race, now);
  const start  = new Date(race.startUtc);

  return el('a', { class: 'race-card', href: `race.html?id=${encodeURIComponent(race.slug)}` },
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
