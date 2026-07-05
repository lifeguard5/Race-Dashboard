// === RACE PIT WALL · render-race.js ===
// Race-Detail-Seite. Lädt ?id=slug, dann rendert: Hero, Countdown,
// Live-Timing, Wetter, Stream, Zeitplan, Favoriten, Quicklinks, Discord.

import { loadConfig, loadSeries, loadTracks, loadRace } from './data-loader.js';
import { getRaceStatus, getStatusLabel } from './race-status.js';
import { renderCountdown } from './countdown.js';
import { icon } from './icons.js';
import { renderWeatherCard } from './weather.js';
import { renderStreamCard } from './streams.js';
import { renderNewsTicker } from './news.js';
import {
  el, qs, indexBy, formatRaceDateTime, formatDayHeader,
  zonedTimeToDate, formatTime, setText,
} from './utils.js';
import { showError } from './app.js';

const main = document.getElementById('race-main');

(async function init() {
  const slug = qs('id');
  if (!slug) {
    showError(main, 'KEIN RENNEN GEWÄHLT', 'URL erwartet ?id=<slug>. Beispiel: race.html?id=24h-nuerburgring-2026');
    return;
  }
  try {
    const [config, series, tracks, race] = await Promise.all([
      loadConfig(), loadSeries(), loadTracks(), loadRace(slug),
    ]);
    document.title = `${race.name} · RACE PIT WALL`;
    const seriesMap = indexBy(series, 'slug');
    const tracksMap = indexBy(tracks, 'slug');
    renderRace({ race, seriesMap, tracksMap, config });
  } catch (e) {
    console.error(e);
    showError(main, 'RENNEN NICHT GELADEN', e.message);
  }
})();

function renderRace({ race, seriesMap, tracksMap, config }) {
  main.replaceChildren();
  const now = new Date();
  const status = getRaceStatus(race, now);
  const series = seriesMap.get(race.seriesSlug);
  const track  = tracksMap.get(race.trackSlug);

  // 1. Hero
  main.append(renderHero(race, series, track, status));

  // 2. Countdown / Race-Clock (1 Spalte)
  const cdCard = card('COUNTDOWN', '');
  main.append(cdCard.wrap);
  // Keep the stop handle so intervals never stack if this page re-renders.
  if (window.RPW && typeof window.RPW.stopCountdown === 'function') window.RPW.stopCountdown();
  const stopCountdown = renderCountdown(cdCard.body, race);
  window.RPW = Object.assign(window.RPW || {}, { stopCountdown });

  // 3. Wetter (1 Spalte)
  const wxCard = card('WETTER · ' + (track ? track.name.split('·')[0].trim().toUpperCase() : '—'), '', 'weather-card');
  main.append(wxCard.wrap);
  renderWeatherCard(wxCard.body, track, new Date(race.startUtc));

  // 4. Live-Timing (volle Breite oder 2 Spalten)
  const ltCard = card('LIVE TIMING', getStatusLabel(status), null, 'span-full');
  main.append(ltCard.wrap);
  renderLiveTiming(ltCard.body, race);

  // 5. YouTube-Channel der Serie (volle Breite)
  const stCard = card('YOUTUBE · SERIEN-CHANNEL', null, null, 'span-full');
  main.append(stCard.wrap);
  renderStreamCard(stCard.body, series);

  // 6. Zeitplan (1 Spalte) — Zeiten werden in die Browser-Zeitzone umgerechnet.
  const schCard = card('ZEITPLAN', 'DEINE ZEITZONE');
  main.append(schCard.wrap);
  renderSchedule(schCard.body, race, now);
  // Refresh session states once per minute so LÄUFT/FERTIG stays correct
  // while the tab is left open on the pit wall.
  setInterval(() => {
    schCard.body.replaceChildren();
    renderSchedule(schCard.body, race, new Date());
  }, 60000);

  // 7. News-Ticker (2 Spalten) — global + race-spezifisch gemergt
  const globalFeeds = (config.globalNewsFeeds || []);
  const raceFeeds   = (race.newsFeeds || []);
  const allFeeds    = [...raceFeeds, ...globalFeeds];
  if (allFeeds.length) {
    const nwCard = card('NEWS-TICKER', allFeeds.length + ' QUELLEN', null, 'span-2of3');
    main.append(nwCard.wrap);
    renderNewsTicker(nwCard.body, allFeeds, 30);
  }

  // 8. Quicklinks (volle Breite)
  if (race.quicklinks && race.quicklinks.length) {
    const qlCard = card('SCHNELLZUGRIFF · OFFIZIELLE QUELLEN', null, null, 'span-full');
    main.append(qlCard.wrap);
    renderQuicklinks(qlCard.body, race.quicklinks);
  }

  // 9. Discord-Slot — nur wenn gesetzt (Phase 2+, hier nur Hinweis)
  if (race.discordChannelId) {
    const dcCard = card('DISCORD', null, null, 'span-full');
    main.append(dcCard.wrap);
    dcCard.body.append(el('div', { class: 'w-fallback' },
      'Discord-Embed wird in Phase 2 angebunden. Channel: ' + race.discordChannelId));
  }
}

// === Hero ===
function renderHero(race, series, track, status) {
  const start = new Date(race.startUtc);
  const end   = new Date(race.endUtc);

  return el('section', { class: 'race-hero span-full', dataset: { series: race.seriesSlug || '' } },
    el('div', { class: 'card-corner' }),
    el('div', { class: 'meta-line' },
      el('span', { class: 'series-tag' }, series ? series.shortName : (race.seriesSlug || '').toUpperCase()),
      race.edition ? el('span', {}, race.edition + '. AUSGABE') : null,
      race.season ? el('span', {}, 'SAISON ' + race.season) : null,
      el('span', { class: 'status-badge ' + status },
        status === 'live' ? el('span', { class: 'dot' }) : null,
        getStatusLabel(status)
      )
    ),
    el('h1', {}, race.name),
    el('div', { class: 'sub-line' },
      el('div', {}, icon('pin'), ' ', el('b', {}, track ? track.name : race.trackSlug),
        track && track.lengthKm ? ` · ${track.lengthKm} km` : ''),
      el('div', {}, icon('flag'), ' START · ', el('b', {}, formatRaceDateTime(start))),
      el('div', {}, icon('trophy'), ' ZIEL · ', el('b', {}, formatRaceDateTime(end))),
      race.timezone ? el('div', {}, icon('clock'), ' ', race.timezone) : null
    )
  );
}

// === Live-Timing ===
function renderLiveTiming(container, race) {
  if (race.liveTimingEmbed) {
    const wrap = el('div', { class: 'timing-embed' },
      el('iframe', {
        src: race.liveTimingEmbed,
        title: 'Live Timing',
        loading: 'lazy',
        referrerpolicy: 'origin',
      })
    );
    container.append(wrap);
    if (race.liveTimingUrl) {
      container.append(el('div', { class: 'timing-fallback', style: { padding: '12px', textAlign: 'right' } },
        el('a', { class: 'link-btn', href: race.liveTimingUrl, target: '_blank', rel: 'noopener',
                 style: { display: 'inline-block', padding: '8px 14px' } },
          el('span', { class: 'link-title' }, 'IN NEUEM TAB ÖFFNEN'))
      ));
    }
    return;
  }

  if (race.liveTimingUrl) {
    container.append(el('div', { class: 'timing-fallback' },
      el('div', { class: 'hint' }, 'Kein einbettbares Live-Timing — direkt öffnen:'),
      el('a', { class: 'big-link', href: race.liveTimingUrl, target: '_blank', rel: 'noopener' },
        'LIVE TIMING ↗')
    ));
    return;
  }

  container.append(el('div', { class: 'timing-fallback' },
    el('div', { class: 'hint' }, 'Live-Timing wird vor dem Rennen ergänzt.')
  ));
}

// === Schedule ===
// Schedule times in race JSONs are TRACK-LOCAL wall-clock times. We convert
// them via race.timezone into absolute instants, then display them in the
// user's browser timezone — consistent with the hero (startUtc).
const DEFAULT_SESSION_MIN = { quali: 90, practice: 90, warmup: 45, scrutineering: 240 };

function renderSchedule(container, race, now) {
  if (!race.schedule || !race.schedule.length) {
    container.append(el('div', { class: 'w-fallback' }, 'Zeitplan wird nachgepflegt.'));
    return;
  }
  const list = el('div', { class: 'sch-list' });

  // Resolve every item to an absolute instant first, then group by LOCAL day
  // (grouping by raw item.date would split days wrong across timezones).
  const resolved = race.schedule
    .map(item => ({ item, when: zonedTimeToDate(item.date, item.time, race.timezone) }))
    .filter(r => r.when && !isNaN(r.when))
    .sort((a, b) => a.when - b.when);

  let lastDayKey = null;
  for (const { item, when } of resolved) {
    const dayKey = `${when.getFullYear()}-${when.getMonth()}-${when.getDate()}`;
    if (dayKey !== lastDayKey) {
      lastDayKey = dayKey;
      list.append(el('div', { class: 'sch-day-header' }, formatDayHeader(when)));
    }

    const durMin = item.durationMin ?? DEFAULT_SESSION_MIN[item.type] ?? 120;
    const sessionEnd = new Date(when.getTime() + durMin * 60000);
    let stateClass = '';
    let stateLabel = '';
    if (item.type === 'race-start') {
      stateClass = 'race-start';
      stateLabel = 'START';
    } else if (now >= when && now <= sessionEnd) {
      // live BEFORE done — previous order marked running sessions as done
      stateClass = 'live';
      stateLabel = 'LÄUFT';
    } else if (now > sessionEnd) {
      stateClass = 'done';
      stateLabel = 'FERTIG';
    } else {
      stateLabel = isSameDay(now, when) ? 'HEUTE' : (item.type || '').toUpperCase();
      if (!stateLabel || stateLabel === 'UPCOMING') stateLabel = 'BEVORST.';
    }
    list.append(el('div', { class: 'sch-item ' + stateClass },
      el('span', { class: 'sch-time' }, formatTime(when)),
      el('span', { class: 'sch-event' }, item.event),
      el('span', { class: 'sch-status' }, stateLabel)
    ));
  }
  container.append(list);
}

// === Quicklinks ===
function renderQuicklinks(container, links) {
  const grid = el('div', { class: 'links-grid' });
  for (const l of links) {
    grid.append(el('a', { class: 'link-btn', href: l.url, target: '_blank', rel: 'noopener' },
      el('div', { class: 'link-title' }, l.label),
      l.sub ? el('div', { class: 'link-sub' }, l.sub) : null
    ));
  }
  container.append(grid);
}

// === Card-Factory ===
function card(title, badge, extraClass, spanClass) {
  const wrap = el('section', { class: 'card' + (extraClass ? ' ' + extraClass : '') + (spanClass ? ' ' + spanClass : '') });
  wrap.append(el('div', { class: 'card-corner' }));
  const titleEl = el('div', { class: 'card-title' }, title);
  if (badge) titleEl.append(el('span', { class: 'badge' }, badge));
  wrap.append(titleEl);
  const body = el('div', { class: 'card-body' });
  wrap.append(body);
  return { wrap, body };
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear()
      && a.getMonth() === b.getMonth()
      && a.getDate() === b.getDate();
}
