// === RACE PIT WALL · components/chrome.js ===
// <rpw-header> und <rpw-footer>: geteiltes Seiten-Chrome als Custom Elements.
// KEIN Shadow DOM — globale CSS-Tokens sollen durchgreifen.
// Ersetzt die 8-fache Markup-Duplikation des Alt-Codes.

import { el, formatTime } from '../domain/utils.js';
import { second } from '../core/clock.js';

const BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) || '/';

const NAV = [
  { href: 'index.html', label: 'PIT WALL' },
  { href: 'rennen.html', label: 'RENNEN' },
  { href: 'kalender.html', label: 'KALENDER' },
  { href: 'serien.html', label: 'SERIEN' },
  { href: 'about.html', label: 'ABOUT' },
];

class RpwHeader extends HTMLElement {
  connectedCallback() {
    const clockEl = el('span', { class: 'hdr-clock', 'aria-label': 'Lokale Uhrzeit' }, '—');
    this.unsub = second.subscribe((d) => { clockEl.textContent = formatTime(d); });

    const path = location.pathname.split('/').pop() || 'index.html';
    this.append(
      el('header', { class: 'site-header' },
        el('a', { class: 'brand', href: BASE }, 'RACE ', el('span', { class: 'brand-accent' }, 'PIT WALL')),
        el('nav', { class: 'site-nav' },
          NAV.map((n) =>
            el('a', { href: BASE + n.href, class: path === n.href ? 'active' : null }, n.label)
          )
        ),
        clockEl
      )
    );
  }
  disconnectedCallback() { this.unsub?.(); }
}

class RpwFooter extends HTMLElement {
  connectedCallback() {
    this.append(
      el('footer', { class: 'site-footer' },
        el('p', {}, 'RACE PIT WALL · inoffizielles Fan-Projekt · keine Verbindung zu Serien oder Veranstaltern.'),
        el('p', { class: 'muted' }, 'Alle Zeiten in deiner lokalen Zeitzone. Angaben ohne Gewähr.')
      )
    );
  }
}

customElements.define('rpw-header', RpwHeader);
customElements.define('rpw-footer', RpwFooter);
