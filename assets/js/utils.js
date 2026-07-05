// === RACE PIT WALL · utils.js ===
// Helpers: Datum, Format, DOM, kleine Locale-Sachen.

const WEEKDAY_DE_SHORT = ['SO', 'MO', 'DI', 'MI', 'DO', 'FR', 'SA'];
const WEEKDAY_DE_LONG  = ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];
const MONTH_DE = ['JAN','FEB','MÄR','APR','MAI','JUN','JUL','AUG','SEP','OKT','NOV','DEZ'];

/** Pads number to width with leading zeros. */
export function pad(n, width = 2) {
  return String(n).padStart(width, '0');
}

/** Parse "YYYY-MM-DD"+"HH:MM" as wall-clock time in the BROWSER timezone. */
export function parseLocalDateTime(date, time) {
  if (!date) return null;
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = (time || '00:00').split(':').map(Number);
  return new Date(y, (m || 1) - 1, d, hh || 0, mm || 0);
}

/**
 * Parse "YYYY-MM-DD"+"HH:MM" as wall-clock time in a GIVEN IANA timezone
 * (e.g. schedule times published in track-local time) and return the
 * corresponding Date (absolute instant). Falls back to browser timezone
 * if `timeZone` is missing or invalid.
 */
export function zonedTimeToDate(date, time, timeZone) {
  if (!date) return null;
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = (time || '00:00').split(':').map(Number);
  if (!timeZone) return new Date(y, (m || 1) - 1, d, hh || 0, mm || 0);
  try {
    // Guess the instant as if the wall-clock time were UTC, then measure
    // the zone offset at that instant and correct the guess.
    const utcGuess = Date.UTC(y, (m || 1) - 1, d, hh || 0, mm || 0);
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone, hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
    const parts = Object.fromEntries(
      dtf.formatToParts(new Date(utcGuess)).map(p => [p.type, p.value])
    );
    const asUtc = Date.UTC(
      Number(parts.year), Number(parts.month) - 1, Number(parts.day),
      parts.hour === '24' ? 0 : Number(parts.hour), Number(parts.minute), Number(parts.second)
    );
    return new Date(utcGuess - (asUtc - utcGuess));
  } catch (e) {
    console.warn('[utils] invalid timezone, falling back to browser tz:', timeZone);
    return new Date(y, (m || 1) - 1, d, hh || 0, mm || 0);
  }
}

/** Format Date as "DO 14. MAI · 13:15" or "DO 14. MAI". */
export function formatRaceDateTime(date, withTime = true) {
  if (!(date instanceof Date) || isNaN(date)) return '—';
  const wd = WEEKDAY_DE_SHORT[date.getDay()];
  const day = date.getDate();
  const mon = MONTH_DE[date.getMonth()];
  const base = `${wd} ${day}. ${mon}`;
  if (!withTime) return base;
  return `${base} · ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Day-Header für Schedule: "DO · 14. MAI" */
export function formatDayHeader(date) {
  if (!(date instanceof Date) || isNaN(date)) return '—';
  return `${WEEKDAY_DE_SHORT[date.getDay()]} · ${date.getDate()}. ${MONTH_DE[date.getMonth()]}`;
}

/** "HH:MM" aus Date. */
export function formatTime(date) {
  if (!(date instanceof Date) || isNaN(date)) return '—';
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Relativ-Datum DE: "vor 3 Min", "vor 2 h", "in 4 Tagen". */
export function formatRelative(date, now = new Date()) {
  if (!(date instanceof Date) || isNaN(date)) return '—';
  const diffMs = date.getTime() - now.getTime();
  const past = diffMs < 0;
  const abs = Math.abs(diffMs);
  const min = Math.round(abs / 60000);
  const hr  = Math.round(abs / 3600000);
  const day = Math.round(abs / 86400000);
  let core;
  if (min < 1)        core = 'gerade eben';
  else if (min < 60)  core = `${min} Min`;
  else if (hr  < 24)  core = `${hr} h`;
  else if (day < 30)  core = `${day} Tag${day === 1 ? '' : 'en'}`;
  else                core = date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
  if (min < 1) return core;
  return past ? `vor ${core}` : `in ${core}`;
}

/** Slugify (rudimentär, nur was wir brauchen) */
export function slugify(s) {
  return String(s).toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Element factory, kein innerHTML. */
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'dataset' && typeof v === 'object') Object.assign(node.dataset, v);
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') node.innerHTML = v;   // bewusst — nur intern, niemals mit User-Input
    else node.setAttribute(k, v);
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

/** URL-Query-Param holen. */
export function qs(key, fallback = null) {
  return new URLSearchParams(location.search).get(key) ?? fallback;
}

/** Lookup-Map aus Array bauen. */
export function indexBy(list, key) {
  const map = new Map();
  for (const item of list) map.set(item[key], item);
  return map;
}

/** Sicherer Text-Setter. */
export function setText(elem, text) {
  if (!elem) return;
  elem.textContent = text == null ? '' : String(text);
}
