// === RACE PIT WALL · pages/hub.js ===
// Hub-Seite = Referenzmuster der Architektur:
// 1. Daten EINMAL laden → ins races-Signal.
// 2. Rendern hängt an (races × minute × Filter) — Live-Rennen pinnen sich
//    dadurch OHNE Reload nach oben, Badges kippen von selbst um.
// 3. ETag-Polling läuft nur rund um Live-Phasen und invalidiert bei
//    Änderung den Daten-Cache → Neuladen + Re-Render.
// MILESTONE 2: Klassen-Filter (?class=GT3,LMP2 — teilbare URL).

import '../components/chrome.js';
import '../components/live-bar.js';
import { loadRaces, loadSeries } from '../core/data.js';
import { minute } from '../core/clock.js';
import { races, pollingActive } from '../live/live.js';
import { startEtagPoll } from '../core/poll.js';
import { compareForListing } from '../domain/race-status.js';
import { matchesClassFilter, isValidTag } from '../domain/race-classes.js';
import { raceCard, classFilterChips } from '../components/card.js';
import { el, indexBy, qs } from '../domain/utils.js';

const root = document.getElementById('hub-root');

let seriesBySlug = new Map();
let selectedTags = (qs('class', '') || '')
  .split(',')
  .map((s) => s.trim().toUpperCase())
  .filter(isValidTag);

function syncUrl() {
  const url = new URL(location.href);
  if (selectedTags.length) url.searchParams.set('class', selectedTags.join(','));
  else url.searchParams.delete('class');
  history.replaceState(null, '', url);
}

function toggleTag(tag) {
  selectedTags = selectedTags.includes(tag)
    ? selectedTags.filter((t) => t !== tag)
    : [...selectedTags, tag];
  syncUrl();
  render();
}

function render() {
  if (!root) return;
  const now = new Date();
  const list = (races.get() || [])
    .filter((r) => matchesClassFilter(r, selectedTags))
    .sort((a, b) => compareForListing(a, b, now));

  root.replaceChildren(
    el('section', { class: 'hub-controls' },
      classFilterChips(selectedTags, toggleTag)
    ),
    el('section', { class: 'race-grid' },
      list.length
        ? list.map((r) => raceCard(r, seriesBySlug, now))
        : el('p', { class: 'muted' }, 'Keine Rennen für diesen Filter.')
    )
  );
}

async function init() {
  const [raceList, seriesList] = await Promise.all([loadRaces(), loadSeries()]);
  seriesBySlug = indexBy(seriesList, 'slug');
  races.set(raceList);

  minute.subscribe(render); // feuert initial + jede Minute
  races.subscribe(render);

  startEtagPoll('races.json', async () => {
    races.set(await loadRaces()); // Cache wurde invalidiert → frische Daten
  }, { isActive: pollingActive });
}

init().catch((err) => {
  if (root) root.replaceChildren(el('p', { class: 'error' }, `Daten konnten nicht geladen werden: ${err.message}`));
});
