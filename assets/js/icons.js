// === RACE PIT WALL · icons.js ===
// Single consistent inline-SVG icon set (Lucide-style, stroke-based).
// Replaces the previous mix of emojis — renders identically on every OS
// and inherits currentColor from the surrounding text.

const PATHS = {
  'pin':       '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  'flag':      '<path d="M4 22V4c4-2 8 2 12 0v10c-4 2-8-2-12 0"/>',
  'trophy':    '<path d="M6 9H4a2 2 0 0 1-2-2V5h4"/><path d="M18 9h2a2 2 0 0 0 2-2V5h-4"/><path d="M6 3h12v6a6 6 0 0 1-12 0V3Z"/><path d="M12 15v4"/><path d="M8 21h8"/>',
  'clock':     '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  'timer':     '<path d="M10 2h4"/><path d="M12 14l3-3"/><circle cx="12" cy="14" r="8"/>',
  'calendar':  '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  'play':      '<polygon points="6 3 20 12 6 21 6 3"/>',
  'external':  '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  'sun':       '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  'cloud':     '<path d="M17.5 19a4.5 4.5 0 1 0-.9-8.9 7 7 0 1 0-11 6.3"/><path d="M6 19h11.5"/>',
  'cloud-sun': '<path d="M12 2v2M4.9 4.9l1.4 1.4M20 12h2M19.1 4.9l-1.4 1.4"/><path d="M15.9 12.6A4 4 0 1 0 9.8 9"/><path d="M13 22H7a5 5 0 1 1 4.9-6A3.5 3.5 0 1 1 13 22Z"/>',
  'fog':       '<path d="M17.5 15a4.5 4.5 0 1 0-.9-8.9 7 7 0 1 0-11.3 5.4"/><path d="M4 19h16M6 22h12"/>',
  'drizzle':   '<path d="M17.5 13a4.5 4.5 0 1 0-.9-8.9 7 7 0 1 0-11.3 5.4"/><path d="M8 15v2M8 20v1M12 16v2M12 21v1M16 15v2M16 20v1"/>',
  'rain':      '<path d="M17.5 13a4.5 4.5 0 1 0-.9-8.9 7 7 0 1 0-11.3 5.4"/><path d="M8 15v6M12 16v6M16 15v6"/>',
  'snow':      '<path d="M17.5 13a4.5 4.5 0 1 0-.9-8.9 7 7 0 1 0-11.3 5.4"/><path d="M8 16h.01M8 20h.01M12 17h.01M12 21h.01M16 16h.01M16 20h.01"/>',
  'storm':     '<path d="M17.5 12a4.5 4.5 0 1 0-.9-8.9 7 7 0 1 0-11.3 5.4"/><path d="m13 12-3 5h4l-3 5"/>',
  'wind':      '<path d="M12.8 19.6A2 2 0 1 0 14 16H2"/><path d="M17.5 8a2.5 2.5 0 1 1 2 4H2"/><path d="M9.8 4.4A2 2 0 1 1 11 8H2"/>',
};

/**
 * Returns an inline SVG element for the given icon name.
 * @param {string} name key in PATHS
 * @param {string} [cls] additional CSS class (default size class "mi")
 */
export function icon(name, cls = '') {
  const span = document.createElement('span');
  span.className = ('mi-wrap ' + cls).trim();
  span.setAttribute('aria-hidden', 'true');
  // Static, hand-written markup only — never user input.
  span.innerHTML = `<svg class="mi" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${PATHS[name] || PATHS['flag']}</svg>`;
  return span;
}
