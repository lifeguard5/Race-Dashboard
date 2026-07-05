// === RACE PIT WALL · news.js ===
// RSS-Feeds via rss2json.com (kostenlos, kein Key).
// Merged global feeds + race-spezifische, sortiert nach Datum, max N items.
// Mit 8s-Timeout pro Feed und 10-Minuten sessionStorage-Cache, um das
// rss2json-Rate-Limit nicht bei jedem Seitenaufruf zu belasten.

import { el, formatRelative } from './utils.js';

const RSS_BRIDGE = 'https://api.rss2json.com/v1/api.json?rss_url=';
const CACHE_PREFIX = 'rpw-news:';
const CACHE_TTL_MS = 10 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8000;

function cacheGet(url) {
  try {
    const raw = sessionStorage.getItem(CACHE_PREFIX + url);
    if (!raw) return null;
    const { ts, items } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL_MS) return null;
    return items.map(it => ({ ...it, pubDate: it.pubDate ? new Date(it.pubDate) : null }));
  } catch (e) { return null; }
}
function cacheSet(url, items) {
  try {
    sessionStorage.setItem(CACHE_PREFIX + url, JSON.stringify({ ts: Date.now(), items }));
  } catch (e) { /* storage full/blocked — cache is best effort */ }
}

async function fetchFeed(url, label) {
  const cached = cacheGet(url);
  if (cached) return cached;
  try {
    const opts = {};
    if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) {
      opts.signal = AbortSignal.timeout(FETCH_TIMEOUT_MS);
    }
    const res = await fetch(RSS_BRIDGE + encodeURIComponent(url), opts);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (data.status !== 'ok' || !Array.isArray(data.items)) throw new Error('rss2json: ' + (data.message || 'bad response'));
    const items = data.items.map(it => ({
      title: it.title,
      link: it.link,
      pubDate: it.pubDate ? new Date(it.pubDate) : null,
      source: label || (data.feed && data.feed.title) || url,
    }));
    cacheSet(url, items);
    return items;
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
