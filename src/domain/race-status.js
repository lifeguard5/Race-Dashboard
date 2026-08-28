// === RACE PIT WALL · race-status.js ===
// Status-Logik: upcoming | live | finished

/**
 * @param {{startUtc: string, endUtc: string}} race
 * @param {Date} [now]
 * @returns {'upcoming'|'live'|'finished'}
 */
export function getRaceStatus(race, now = new Date()) {
  if (!race || !race.startUtc) return 'upcoming';
  const start = new Date(race.startUtc);
  const end = race.endUtc ? new Date(race.endUtc) : start;
  if (now < start) return 'upcoming';
  if (now <= end)  return 'live';
  return 'finished';
}

/** DE-Label für Badge. */
export function getStatusLabel(status) {
  switch (status) {
    case 'live':     return 'LIVE';
    case 'finished': return 'BEENDET';
    case 'upcoming': return 'BEVORSTEHEND';
    default:         return '—';
  }
}

/** Sortier-Helper für Hub/Kalender: Live > Upcoming > Finished, jeweils chronologisch. */
export function compareForListing(a, b, now = new Date()) {
  const order = { live: 0, upcoming: 1, finished: 2 };
  const sa = getRaceStatus(a, now);
  const sb = getRaceStatus(b, now);
  if (order[sa] !== order[sb]) return order[sa] - order[sb];
  // Innerhalb: aufsteigend nach Start
  return new Date(a.startUtc) - new Date(b.startUtc);
}

/** Findet das "Featured-Race" fürs Hub: erstes Live, sonst nächstes Upcoming, sonst letztes Finished. */
export function pickFeaturedRace(races, now = new Date()) {
  if (!races || !races.length) return null;
  const live = races.find(r => getRaceStatus(r, now) === 'live');
  if (live) return live;
  const upcoming = races
    .filter(r => getRaceStatus(r, now) === 'upcoming')
    .sort((a, b) => new Date(a.startUtc) - new Date(b.startUtc));
  if (upcoming.length) return upcoming[0];
  const finished = races
    .filter(r => getRaceStatus(r, now) === 'finished')
    .sort((a, b) => new Date(b.startUtc) - new Date(a.startUtc));
  return finished[0] || races[0];
}
