// === RACE PIT WALL · news.js ===
// RSS-Feeds via rss2json.com (kostenlos, kein Key).
// Merged global feeds + race-spezifische, sortiert nach Datum, max N items.

import { el, formatRelative } from './utils.js';

const RSS_BRIDGE = 'https://api.rss2json.com/v1/api.json?rss_url=';

async function fetchFeed(url, label) {
  try {
    const res = await fetch(RSS_BRIDGE + encodeURIComponent(url));
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (data.status !== 'ok' || !Array.isArray(data.items)) throw new Error('rss2json: ' + (data.message || 'bad response'));
    return data.items.map(it => ({
      title: it.title,
      link: it.link,
      pubDate: it.pubDate ? new Date(it.pubDate) : null,
      source: label || (data.feed && data.feed.title) || url,
    }));
  } catch (e) {
    console.warn('[news] feed failed:', url, e.message);
    return [];
  }
}

/**
 * Lädt mehrere Feeds parallel, mergt, sortiert, gibt max N items zurück.
 * @param {Array<{label:string,url:string}>} feeds
 * @param {number} [max]
 */
export async function loadNews(feeds, max = 30) {
  if (!feeds || !feeds.length) return [];
  const results = await Promise.all(feeds.map(f => fetchFeed(f.url, f.label)));
  const all = results.flat();
  all.sort((a, b) => (b.pubDate?.getTime() || 0) - (a.pubDate?.getTime() || 0));
  return all.slice(0, max);
}

/**
 * Rendert News-Ticker in `container`. Macht eigene Loading- + Fehler-UI.
 * @param {HTMLElement} container
 * @param {Array<{label:string,url:string}>} feeds
 * @param {number} [max]
 */
export async function renderNewsTicker(container, feeds, max = 30) {
  container.replaceChildren();
  if (!feeds || !feeds.length) {
    container.append(el('div', { class: 'w-fallback' }, 'Keine News-Feeds eingetragen.'));
    return;
  }
  const loading = el('div', { class: 'loading' }, 'NEWS LADEN …');
  container.append(loading);

  let items;
  try {
    items = await loadNews(feeds, max);
  } catch (e) {
    console.warn('[news]', e);
    loading.remove();
    container.append(el('div', { class: 'w-fallback' }, 'News momentan nicht verfügbar.'));
    return;
  }
  loading.remove();

  if (!items.length) {
    container.append(el('div', { class: 'w-fallback' }, 'News momentan nicht verfügbar.'));
    return;
  }

  const list = el('div', { class: 'news-list' });
  const now = new Date();
  for (const it of items) {
    list.append(
      el('a', {
        class: 'news-item',
        href: it.link,
        target: '_blank',
        rel: 'noopener noreferrer',
      },
        el('div', { class: 'news-when' }, it.pubDate ? formatRelative(it.pubDate, now) : '—'),
        el('div', { class: 'news-title' }, it.title || '(ohne Titel)'),
        el('div', { class: 'news-source' }, it.source || '')
      )
    );
  }
  container.append(list);
}
