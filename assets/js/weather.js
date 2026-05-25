// === RACE PIT WALL · weather.js ===
// Open-Meteo — kein Key, keine CORS-Probleme. https://open-meteo.com

import { el, pad } from './utils.js';

/** WMO-Wettercode → Emoji + DE-Label (kompakt). */
const WMO = {
  0:  ['☀', 'Klar'],
  1:  ['🌤', 'Heiter'],
  2:  ['⛅', 'Bewölkt'],
  3:  ['☁', 'Bedeckt'],
  45: ['🌫', 'Nebel'],
  48: ['🌫', 'Reifnebel'],
  51: ['🌦', 'Nieselregen'],
  53: ['🌦', 'Nieselregen'],
  55: ['🌧', 'Starker Niesel'],
  61: ['🌧', 'Leichter Regen'],
  63: ['🌧', 'Regen'],
  65: ['🌧', 'Starker Regen'],
  71: ['🌨', 'Schneefall'],
  73: ['🌨', 'Schneefall'],
  75: ['❄', 'Starker Schnee'],
  77: ['❄', 'Schneegriesel'],
  80: ['🌦', 'Regenschauer'],
  81: ['🌧', 'Regenschauer'],
  82: ['⛈', 'Heftige Schauer'],
  85: ['🌨', 'Schneeschauer'],
  86: ['❄', 'Starke Schneeschauer'],
  95: ['⛈', 'Gewitter'],
  96: ['⛈', 'Gewitter mit Hagel'],
  99: ['⛈', 'Starkes Gewitter'],
};
function wmoIcon(code) { return (WMO[code] || ['•', 'Unbekannt'])[0]; }
function wmoLabel(code) { return (WMO[code] || ['•', 'Unbekannt'])[1]; }

/** Lädt Forecast für lat/lng. */
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
  const res = await fetch(url);
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

  // === Aktuell ===
  const cw = data.current_weather || {};
  const cur = el('div', { class: 'w-current' },
    el('div', { class: 'w-temp' }, `${Math.round(cw.temperature ?? 0)}`, el('span', {}, '°C')),
    el('div', { class: 'w-cond' },
      el('strong', {}, wmoLabel(cw.weathercode)),
      `Wind: ${Math.round(cw.windspeed ?? 0)} km/h`,
      el('br'),
      `Stand: ${formatLocalTime(cw.time)}`
    )
  );
  container.append(cur);

  // === Niederschlag-Hinweis (nächste 6h Summe) ===
  const hourly = data.hourly || {};
  const idxNow = findHourlyIndex(hourly.time, new Date());
  const next6Precip = sumRange(hourly.precipitation, idxNow, idxNow + 6);
  if (next6Precip != null && next6Precip > 0.5) {
    container.append(el('div', { class: 'w-rain' },
      `🌧 Nächste 6 h: ${next6Precip.toFixed(1)} mm Niederschlag erwartet.`));
  } else if (next6Precip != null) {
    container.append(el('div', { class: 'w-rain' },
      '☂ Nächste 6 h: trocken erwartet.'));
  }

  // === 6h-Sparkline (Temperatur + Regen-Marker) ===
  if (idxNow >= 0 && hourly.temperature_2m) {
    const tempSlice = hourly.temperature_2m.slice(idxNow, idxNow + 6);
    const rainSlice = (hourly.precipitation || []).slice(idxNow, idxNow + 6);
    const timeSlice = hourly.time.slice(idxNow, idxNow + 6);
    const max = Math.max(...tempSlice);
    const min = Math.min(...tempSlice);
    const range = Math.max(1, max - min);
    const spark = el('div', { class: 'w-sparkline' });
    tempSlice.forEach((t, i) => {
      const heightPct = 20 + ((t - min) / range) * 80;
      const bar = el('div', {
        class: 'w-spark-bar' + ((rainSlice[i] || 0) > 0.2 ? ' has-rain' : ''),
        style: { height: heightPct + '%' },
        title: `${formatLocalTime(timeSlice[i])} · ${Math.round(t)}°C${rainSlice[i] ? ` · ${rainSlice[i].toFixed(1)} mm` : ''}`,
      });
      spark.append(bar);
    });
    container.append(spark);
    const axis = el('div', { class: 'w-spark-axis' });
    [0, 2, 4].forEach(i => axis.append(el('span', {}, formatLocalTime(timeSlice[i]))));
    axis.append(el('span', {}, '+6 h'));
    container.append(axis);
  }

  // === 4-Tages-Forecast ===
  const daily = data.daily || {};
  if (daily.time && daily.time.length) {
    const fc = el('div', { class: 'w-forecast' });
    const raceDayKey = raceStart ? toISODateInTz(raceStart, data.timezone) : null;
    for (let i = 0; i < Math.min(4, daily.time.length); i++) {
      const date = new Date(daily.time[i] + 'T12:00:00');
      const dayKey = daily.time[i];
      const isToday = i === 0;
      const isRaceDay = raceDayKey && dayKey === raceDayKey;
      const day = el('div', { class: 'w-day' + (isRaceDay ? ' race-day' : (isToday ? ' today' : '')) },
        el('div', { class: 'w-day-name' },
          isRaceDay ? 'RACE' : (isToday ? 'HEUTE' : ['SO','MO','DI','MI','DO','FR','SA'][date.getDay()])
        ),
        el('div', { class: 'w-day-icon' }, wmoIcon(daily.weather_code[i])),
        el('div', { class: 'w-day-temp' }, `${Math.round(daily.temperature_2m_max[i])}°/${Math.round(daily.temperature_2m_min[i])}°`),
        el('div', { class: 'w-day-rain' }, `${daily.precipitation_probability_max[i] ?? 0}%`),
      );
      fc.append(day);
    }
    container.append(fc);
  }
}

// === Helpers ===
function findHourlyIndex(times, now) {
  if (!times || !times.length) return -1;
  const target = now.toISOString().slice(0, 13); // YYYY-MM-DDTHH
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
function formatLocalTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
/** YYYY-MM-DD in (ungefähr) der gleichen Zone wie der Forecast. Reicht für Tages-Match. */
function toISODateInTz(date, _tz) {
  return new Date(date.getTime()).toISOString().slice(0, 10);
}
