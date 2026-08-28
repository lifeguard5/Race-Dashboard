// === RACE PIT WALL · domain/race-classes.js ===
// MILESTONE 2: Klassen als First-Class-Konzept.
//
// ZWEI EBENEN:
// 1. Kanonische classTags in races.json — das Filter-Vokabular.
//    Bewusst grob: ein Fan, der "GT3" filtert, will WEC-LMGT3, IMSA-GTD
//    und NLS-SP9 sehen. Die technisch korrekten Serien-Bezeichnungen
//    bleiben Anzeige-Sache (series.json / Race-Detail).
// 2. displayClasses in series.json — was auf der Serien-Seite steht.
//
// LMP1 taucht bewusst nicht als eigener Tag auf: Die Klasse existiert 2026
// nicht mehr; ihre Nachfolge (LMH/LMDh) ist unter HYPERCAR/GTP abgebildet.
// Für historische Rennen kann das Vokabular später erweitert werden.

/** Kanonisches Vokabular — einzige gültige Werte für races[].classTags. */
export const CLASS_TAGS = ['HYPERCAR', 'GTP', 'LMP2', 'LMP3', 'GT3', 'GT4'];

export const CLASS_LABELS = {
  HYPERCAR: 'Hypercar',
  GTP: 'GTP',
  LMP2: 'LMP2',
  LMP3: 'LMP3',
  GT3: 'GT3',
  GT4: 'GT4',
};

/** Serien-Bezeichnung → kanonischer Tag (für Anzeige-Tooltips & Validierung). */
export const ALIAS_TO_TAG = {
  'HYPERCAR': 'HYPERCAR', 'LMH': 'HYPERCAR', 'LMDH': 'HYPERCAR', 'LMP1': 'HYPERCAR',
  'GTP': 'GTP',
  'LMP2': 'LMP2',
  'LMP3': 'LMP3',
  'LMGT3': 'GT3', 'GTD': 'GT3', 'GTD PRO': 'GT3', 'GT3': 'GT3',
  'SP9': 'GT3', 'SP9 PRO': 'GT3', 'SP9 PRO-AM': 'GT3',
  'GT4': 'GT4', 'SP10': 'GT4', 'GS': 'GT4',
};

export function normalizeClass(name) {
  return ALIAS_TO_TAG[String(name).trim().toUpperCase()] ?? null;
}

export function isValidTag(tag) {
  return CLASS_TAGS.includes(tag);
}

/**
 * Filter-Prädikat: Rennen matcht, wenn es mind. einen der gewählten Tags trägt.
 * Leere Auswahl = kein Filter = alles matcht.
 * @param {{classTags?: string[]}} race
 * @param {string[]} selectedTags
 */
export function matchesClassFilter(race, selectedTags) {
  if (!selectedTags || !selectedTags.length) return true;
  const tags = race.classTags || [];
  return selectedTags.some((t) => tags.includes(t));
}
