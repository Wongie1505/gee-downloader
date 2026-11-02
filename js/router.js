// Hash routing: #home, #about, #app. The page never reloads, so the map
// and (from Phase 2) the sign-in token survive every screen change.

import { emit, getState } from './state.js';

const SCREENS = ['home', 'about', 'app'];

export function showScreen(name) {
  document.querySelectorAll('[data-screen]').forEach((screen) => {
    screen.hidden = screen.dataset.screen !== name;
  });

  // Lets CSS react to the current screen
  document.body.dataset.view = name;

  document.querySelectorAll('[data-nav]').forEach((link) => {
    if (link.dataset.nav === name) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });

  document.querySelector('main').scrollTop = 0;
  emit('screen:shown', name);
}

// Read the hash, fall back to home
function fromHash() {
  const name = window.location.hash.slice(1);

  return SCREENS.includes(name) ? name : 'home';
}

// The app needs a login. Anyone else lands on home and gets the login dialog.
function resolveScreen() {
  const wanted = fromHash();

  if (wanted === 'app' && !getState().user) {
    // Fix the address bar without firing another hashchange
    window.history.replaceState(null, '', '#home');
    emit('auth:required');

    return 'home';
  }

  return wanted;
}

export function initRouter() {
  window.addEventListener('hashchange', () => showScreen(resolveScreen()));
  showScreen(resolveScreen());
}
