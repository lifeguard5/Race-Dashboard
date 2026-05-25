// === RACE PIT WALL · app.js ===
// Gemeinsamer Bootstrap: Header-Daten, Uhr, Nav-Highlight, globale Fehler-Anzeige.

import { loadConfig } from './data-loader.js';
import { attachHeaderClock } from './countdown.js';
import { el } from './utils.js';

function highlightNav() {
  const here = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.site-nav a').forEach(a => {
    const href = a.getAttribute('href');
    if (!href) return;
    const target = href.split('?')[0];
    if (target === here || (here === '' && target === 'index.html')) {
      a.classList.add('active');
    }
  });
}

async function bootHeader() {
  const clockEl = document.getElementById('hdr-clock');
  if (clockEl) attachHeaderClock(clockEl);

  try {
    const cfg = await loadConfig();
    const titleEl = document.querySelector('.brand-text h1');
    if (titleEl && cfg.site && cfg.site.title) titleEl.textContent = cfg.site.title;
    const subEl = document.querySelector('.brand-text .sub');
    if (subEl && cfg.site && cfg.site.tagline) subEl.textContent = cfg.site.tagline.toUpperCase();
  } catch (e) {
    // Config-Fehler ist nicht fatal — Default-Text bleibt.
    console.warn('[app] config konnte nicht geladen werden:', e.message);
  }
}

function mountFooter() {
  // Footer wird per HTML eingebaut. Hier nichts zu tun, aber Disclaimer-Link aktiv halten.
}

window.RPW = Object.assign(window.RPW || {}, { build: '2026-05-14' });

document.addEventListener('DOMContentLoaded', () => {
  highlightNav();
  bootHeader();
  mountFooter();
});

/** Zeigt einen Fehler in einem Container an. */
export function showError(container, title, message) {
  container.replaceChildren(
    el('div', { class: 'error-box' },
      el('strong', {}, title || 'FEHLER'),
      message || 'Unbekannter Fehler.'
    )
  );
}
