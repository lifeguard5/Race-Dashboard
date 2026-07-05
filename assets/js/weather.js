// === RACE PIT WALL · weather.js ===
// Open-Meteo — kein Key, keine CORS-Probleme. https://open-meteo.com
// Alle Zeiten in dieser Card sind STRECKEN-Lokalzeit (timezone=auto),
// da das Wetter am Kurs interessiert — Index-Suche & Labels rechnen
// deshalb konsequent mit utc_offset_seconds aus der API-Antwort.

import { el, pad } from './utils.js';
import { icon } from './icons.js';

/** WMO weather code → [icon name, DE label]. */
const WMO = {
  0:  ['sun', 'Klar'],
  1:  ['cloud-sun', 'Heiter'],
  2:  ['cloud-sun', 'Bewölkt'],
  3:  ['cloud', 'Bedeckt'],
  45: ['fog', 'Nebel'],
  48: ['fog', 'Reifnebel'],
  51: ['drizzle', 'Nieselregen'],
  53: ['drizzle', 'Nieselregen'],
  55: ['rain', 'Starker Niesel'],
  61: ['rain', 'Leichter Regen'],
  63: ['rain', 'Regen'],
  65: ['rain', 'Starker Regen'],
  71: ['snow', 'Schneefall'],
  73: ['snow', 'Schneefall'],
  75: ['snow', 'Starker Schnee'],
  77: ['snow', 'Schneegriesel'],
  80: ['drizzle', 'Regenschauer'],
  81: ['rain', 'Regenschauer'],
  82: ['storm', 'Heftige Schauer'],
  85: ['snow', 'Schneeschauer'],
  86: ['snow', 'Starke Schneeschauer'],
  95: ['storm', 'Gewitter'],
  96: ['storm', 'Gewitter mit Hagel'],
  99: ['storm', 'Starkes Gewitter'],
};
function wmo(code) { return WMO[code] || ['cloud', 'Unbekannt']; }

/** Lädt Forecast für lat/lng — mit 8s-Timeout, damit die Card nie hängt. */
export async function fetchWeather(lat, lng) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lng,
    current_weather: 'true',
    hourly: 'temperature_2m,precipitation,precipitation_probability,wind_speed_10m,weather_code',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum',
    timezone: 'auto',
    forecast_days: 5,
  });
  const url = `https://api.open-meteo.com/v1/forecast?${params}`;
  const opts = {};
  if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) opts.signal = AbortSignal.timeout(8000);
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error('Open-Meteo HTTP ' + res.status);
  return res.json();
}

/** Render-Funktion: lädt Wetter, baut Card-Inhalt. raceStart als Date optional → Race-Day-Highlight. */
export async function renderWeatherCard(container, track, raceStart = null) {
  if (!track || track.lat == null || track.lng == null) {
    container.append(el('div', { class: 'w-fallback' }, 'Keine Koordinaten für die Strecke hinterlegt.'));
    return;
  }
  const loading = el('div', { class: 'loading' }, 'WETTER LÄDT …');
  container.append(loading);

  let data;
  try {
    data = await fetchWeather(track.lat, track.lng);
  } catch (e) {
    console.warn('[weather]', e);
    loading.remove();
    container.append(el('div', { class: 'w-fallback' }, 'Wetterdaten momentan nicht verfügbar.'));
    return;
  }
  loading.remove();

  const offsetSec = data.utc_offset_seconds ?? 0;

  // === Aktuell ===
  const cw = data.current_weather || {};
  const [cwIcon, cwLabel] = wmo(cw.weathercode);
  const cur = el('div', { class: 'w-current' },
    el('div', { class: 'w-temp' }, `${Math.round(cw.temperature ?? 0)}`, el('span', {}, '°C')),
    el('div', { class: 'w-cond' },
      el('strong', {}, icon(cwIcon), ' ', cwLabel),
      `Wind: ${Math.round(cw.windspeed ?? 0)} km/h`,
      el('br'),
      `Stand: ${clockFromIso(cw.time)} Ortszeit`
    )
  );
  container.append(cur);

  // === Niederschlag-Hinweis (nächste 6h Summe) ===
  const hourly = data.hourly || {};
  const idxNow = findHourlyIndex(hourly.time, offsetSec);
  const next6Precip = sumRange(hourly.precipitation, idxNow, idxNow + 6);
  if (next6Precip != null && next6Precip > 0.5) {
    container.append(el('div', { class: 'w-rain' },
      icon('rain'), ` Nächste 6 h: ${next6Precip.toFixed(1)} mm Niederschlag erwartet.`));
  } else if (next6Precip != null) {
    container.append(el('div', { class: 'w-rain dry' },
      icon('sun'), ' Nächste 6 h: trocken erwartet.'));
  }

  // === 6h-Sparkline (Temperatur + Regen-Marker) ===
  const tempSlice = (hourly.temperature_2m || []).slice(idxNow, idxNow + 6);
  if (idxNow >= 0 && tempSlice.length) {
    const rainSlice = (hourly.precipitation || []).slice(idxNow, idxNow + 6);
    const timeSlice = (hourly.time || []).slice(idxNow, idxNow + 6);
    const max = Math.max(...tempSlice);
    const min = Math.min(...tempSlice);
    const range = Math.max(1, max - min);
    const spark = el('div', { class: 'w-sparkline' });
    tempSlice.forEach((t, i) => {
      const heightPct = 20 + ((t - min) / range) * 80;
      const bar = el('div', {
        class: 'w-spark-bar' + ((rainSlice[i] || 0) > 0.2 ? ' has-rain' : ''),
        style: { height: heightPct + '%' },
        title: `${clockFromIso(timeSlice[i])} · ${Math.round(t)}°C${rainSlice[i] ? ` · ${rainSlice[i].toFixed(1)} mm` : ''}`,
      });
      spark.append(bar);
    });
    container.append(spark);
    const axis = el('div', { class: 'w-spark-axis' });
    [0, 2, 4].forEach(i => axis.append(el('span', {}, clockFromIso(timeSlice[i]))));
    axis.append(el('span', {}, '+6 h'));
    container.append(axis);
  }

  // === 4-Tages-Forecast ===
  const daily = data.daily || {};
  if (daily.time && daily.time.length) {
    const fc = el('div', { class: 'w-forecast' });
    // Race day matched in the TRACK timezone (previously UTC → wrong day
    // for evening races in the Americas).
    const raceDayKey = raceStart ? isoDateInTz(raceStart, data.timezone) : null;
    for (let i = 0; i < Math.min(4, daily.time.length); i++) {
      const date = new Date(daily.time[i] + 'T12:00:00');
      const dayKey = daily.time[i];
      const isToday = i === 0;
      const isRaceDay = raceDayKey && dayKey === raceDayKey;
      const [dIcon] = wmo(daily.weather_code ? daily.weather_code[i] : null);
      const day = el('div', { class: 'w-day' + (isRaceDay ? ' race-day' : (isToday ? ' today' : '')) },
        el('div', { class: 'w-day-name' },
          isRaceDay ? 'RACE' : (isToday ? 'HEUTE' : ['SO','MO','DI','MI','DO','FR','SA'][date.getDay()])
        ),
        el('div', { class: 'w-day-icon' }, icon(dIcon)),
        el('div', { class: 'w-day-temp' }, `${Math.round(daily.temperature_2m_max?.[i] ?? 0)}°/${Math.round(daily.temperature_2m_min?.[i] ?? 0)}°`),
        el('div', { class: 'w-day-rain' }, `${daily.precipitation_probability_max?.[i] ?? 0}%`),
      );
      fc.append(day);
    }
    container.append(fc);
  }
}

// === Helpers ===
/**
 * hourly.time entries are TRACK-LOCAL ISO strings (timezone=auto).
 * Compare against the track-local "now" derived from utc_offset_seconds —
 * comparing against toISOString() (UTC) shifted the window by the
 * track's UTC offset (e.g. 5h at Daytona).
 */
function findHourlyIndex(times, offsetSec) {
  if (!times || !times.length) return -1;
  const trackNow = new Date(Date.now() + offsetSec * 1000);
  const target = trackNow.toISOString().slice(0, 13); // YYYY-MM-DDTHH in track-local wall time
  for (let i = 0; i < times.length; i++) {
    if (times[i].slice(0, 13) >= target) return i;
  }
  return Math.max(0, times.length - 6);
}
function sumRange(arr, from, to) {
  if (!arr) return null;
  let s = 0, count = 0;
  for (let i = from; i < to && i < arr.length; i++) {
    if (arr[i] != null) { s += arr[i]; count++; }
  }
  return count ? s : 0;
}
/** "HH:MM" straight from a local ISO string — no Date() detour that would
 *  re-interpret the string in the BROWSER timezone. */
function clockFromIso(iso) {
  if (!iso || iso.length < 16) return '—';
  return iso.slice(11, 16);
}
/** YYYY-MM-DD of an instant, rendered in the given IANA timezone. */
function isoDateInTz(date, tz) {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(date); // en-CA yields YYYY-MM-DD
  } catch (e) {
    return date.toISOString().slice(0, 10);
  }
}
