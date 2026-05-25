// === RACE PIT WALL · streams.js ===
// Rendert EINE Stream-Karte mit Link auf die YouTube-Channel-Hauptseite der Serie.
// Der Anwender sucht sich auf YouTube selbst Live-Stream / Highlight-Video raus —
// das spart das Pflegen race-spezifischer URLs und vermeidet tote /live-Links.

import { el } from './utils.js';

/**
 * @param {HTMLElement} container Card-Body
 * @param {object|null} series series-Objekt aus series.json
 */
export function renderStreamCard(container, series) {
  container.replaceChildren();

  if (!series || !series.youtubeUrl) {
    container.append(el('div', { class: 'w-fallback' },
      'Kein YouTube-Channel für diese Serie hinterlegt — Feld "youtubeUrl" in data/series.json ergänzen.'));
    return;
  }

  container.append(el('a', {
    class: 'stream-link series-stream',
    href: series.youtubeUrl,
    target: '_blank',
    rel: 'noopener noreferrer',
    title: 'YouTube-Channel der Serie in neuem Tab öffnen',
  },
    el('div', { class: 'stream-link-icon', 'aria-hidden': 'true' }, '▶'),
    el('div', { class: 'stream-link-body' },
      el('div', { class: 'stream-link-label' }, (series.shortName || series.name) + ' · YOUTUBE-CHANNEL'),
      el('div', { class: 'stream-link-meta' },
        'Live-Streams, Highlights, Re-Live',
        el('span', { class: 'stream-link-platform' }, 'YOUTUBE ↗')
      )
    )
  ));
}
