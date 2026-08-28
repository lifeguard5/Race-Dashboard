// === RACE PIT WALL · Tests (Milestone 1 + 2) ===
// Ausführen mit TZ=UTC, damit Datums-Assertions zeitzonenunabhängig sind.
globalThis.__RPW_TEST__ = true;

import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { signal, derived } from '../src/core/signal.js';
import { getRaceStatus, compareForListing, pickFeaturedRace } from '../src/domain/race-status.js';
import { CLASS_TAGS, normalizeClass, matchesClassFilter, isValidTag } from '../src/domain/race-classes.js';

// ---------------------------------------------------------------------------
describe('signal', () => {
  it('benachrichtigt Subscriber sofort und bei Änderung', () => {
    const s = signal(1);
    const seen = [];
    s.subscribe((v) => seen.push(v));
    s.set(2);
    s.set(2); // Object.is-Guard: kein zweites Feuern
    expect(seen).toEqual([1, 2]);
  });

  it('derived feuert nur bei geändertem Ergebnis (Minuten-Muster)', () => {
    const src = signal(0);
    const min = derived(src, (v) => Math.floor(v / 60));
    const seen = [];
    min.subscribe((v) => seen.push(v));
    src.set(10); src.set(59); src.set(60); src.set(61);
    expect(seen).toEqual([0, 1]);
  });
});

// ---------------------------------------------------------------------------
describe('race-status', () => {
  const race = { startUtc: '2026-05-16T13:00:00Z', endUtc: '2026-05-17T13:00:00Z' };
  it('upcoming vor Start', () => {
    expect(getRaceStatus(race, new Date('2026-05-16T12:59:00Z'))).toBe('upcoming');
  });
  it('live zwischen Start und Ende — live-Check MUSS vor done-Check greifen', () => {
    expect(getRaceStatus(race, new Date('2026-05-16T13:00:00Z'))).toBe('live');
    expect(getRaceStatus(race, new Date('2026-05-17T02:00:00Z'))).toBe('live');
  });
  it('finished nach Ende', () => {
    expect(getRaceStatus(race, new Date('2026-05-17T13:00:01Z'))).toBe('finished');
  });
  it('compareForListing pinnt Live-Rennen nach oben', () => {
    const now = new Date('2026-05-16T14:00:00Z');
    const upcoming = { startUtc: '2026-05-20T10:00:00Z', endUtc: '2026-05-20T14:00:00Z' };
    const done = { startUtc: '2026-05-01T10:00:00Z', endUtc: '2026-05-01T14:00:00Z' };
    const sorted = [done, upcoming, race].sort((a, b) => compareForListing(a, b, now));
    expect(sorted[0]).toBe(race);
    expect(sorted[1]).toBe(upcoming);
    expect(sorted[2]).toBe(done);
  });
  it('pickFeaturedRace bevorzugt live', () => {
    const now = new Date('2026-05-16T14:00:00Z');
    const other = { startUtc: '2026-05-20T10:00:00Z', endUtc: '2026-05-20T14:00:00Z' };
    expect(pickFeaturedRace([other, race], now)).toBe(race);
  });
});

// ---------------------------------------------------------------------------
describe('race-classes', () => {
  it('normalisiert Serien-Bezeichnungen auf kanonische Tags', () => {
    expect(normalizeClass('LMGT3')).toBe('GT3');
    expect(normalizeClass('gtd pro')).toBe('GT3');
    expect(normalizeClass('SP9')).toBe('GT3');
    expect(normalizeClass('SP10')).toBe('GT4');
    expect(normalizeClass('LMDh')).toBe('HYPERCAR');
    expect(normalizeClass('LMP1')).toBe('HYPERCAR');
    expect(normalizeClass('Unbekannt')).toBeNull();
  });
  it('Filter: leere Auswahl matcht alles, sonst Schnittmenge', () => {
    const r = { classTags: ['GTP', 'GT3'] };
    expect(matchesClassFilter(r, [])).toBe(true);
    expect(matchesClassFilter(r, ['GT3'])).toBe(true);
    expect(matchesClassFilter(r, ['LMP3'])).toBe(false);
  });
});

// ---------------------------------------------------------------------------
describe('live-state', () => {
  it('liveRaces/soonRaces werden aus races abgeleitet', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-16T14:00:00Z')); // N24 läuft
    const { races, liveRaces, soonRaces, pollingActive } = await import('../src/live/live.js');
    races.set([
      { slug: 'n24', name: 'N24', startUtc: '2026-05-16T13:00:00Z', endUtc: '2026-05-17T13:00:00Z' },
      { slug: 'soon', name: 'Soon', startUtc: '2026-05-16T14:30:00Z', endUtc: '2026-05-16T18:00:00Z' },
      { slug: 'later', name: 'Later', startUtc: '2026-06-01T10:00:00Z', endUtc: '2026-06-01T14:00:00Z' },
    ]);
    expect(liveRaces.get().map((r) => r.slug)).toEqual(['n24']);
    expect(soonRaces.get().map((r) => r.slug)).toEqual(['soon']);
    expect(pollingActive()).toBe(true);
    vi.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
describe('Daten-Integrität races.json', () => {
  const races = JSON.parse(readFileSync(`${process.cwd()}/public/data/races.json`, 'utf8'));
  const tracks = JSON.parse(readFileSync(`${process.cwd()}/public/data/tracks.json`, 'utf8'));
  const series = JSON.parse(readFileSync(`${process.cwd()}/public/data/series.json`, 'utf8'));
  const trackSlugs = new Set(tracks.map((t) => t.slug));
  const seriesSlugs = new Set(series.map((s) => s.slug));

  it('alle Pflichtfelder vorhanden, Slugs eindeutig', () => {
    const seen = new Set();
    for (const r of races) {
      expect(r.slug, JSON.stringify(r)).toBeTruthy();
      expect(seen.has(r.slug), `doppelter Slug ${r.slug}`).toBe(false);
      seen.add(r.slug);
      expect(r.name && r.seriesSlug && r.trackSlug && r.startUtc && r.endUtc).toBeTruthy();
    }
  });
  it('Zeiten sind gültiges UTC-ISO und start < end', () => {
    for (const r of races) {
      expect(r.startUtc.endsWith('Z'), r.slug).toBe(true);
      expect(r.endUtc.endsWith('Z'), r.slug).toBe(true);
      expect(new Date(r.startUtc) < new Date(r.endUtc), r.slug).toBe(true);
    }
  });
  it('classTags nur aus kanonischem Vokabular, mind. 1 Tag', () => {
    for (const r of races) {
      expect(Array.isArray(r.classTags) && r.classTags.length > 0, r.slug).toBe(true);
      for (const t of r.classTags) expect(isValidTag(t), `${r.slug}: ${t}`).toBe(true);
    }
  });
  it('Referenzen auf tracks/series existieren', () => {
    for (const r of races) {
      expect(trackSlugs.has(r.trackSlug), `${r.slug} → ${r.trackSlug}`).toBe(true);
      expect(seriesSlugs.has(r.seriesSlug), `${r.slug} → ${r.seriesSlug}`).toBe(true);
    }
  });
  it('deckt alle Fokus-Serien ab', () => {
    const used = new Set(races.map((r) => r.seriesSlug));
    for (const s of ['wec', 'imsa', 'elms', 'gtwc-europe', 'nls', 'dtm', 'adac-gt-masters', 'intercontinental-gt', '24h-nuerburgring']) {
      expect(used.has(s), s).toBe(true);
    }
  });
  it('CLASS_TAGS-Vokabular enthält alle geforderten Klassen (gemappt)', () => {
    // LMP1→HYPERCAR, LMDh→HYPERCAR/GTP, GTD/LMGT3→GT3 — siehe race-classes.js
    expect(CLASS_TAGS).toEqual(['HYPERCAR', 'GTP', 'LMP2', 'LMP3', 'GT3', 'GT4']);
  });
});
