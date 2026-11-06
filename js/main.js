import { initRouter } from './router.js';
import { on } from './state.js';
import { getMap, refreshMaps } from './ui/map.js';
import { initMapLayers } from './ui/map-layers.js';
import { initSignIn, tryRestoreSession } from './screens/signin/signin.js';
import { initWizard } from './screens/wizard/wizard.js';
import { CONTACT_EMAIL } from './config.js';

initWizard(
  document.getElementById('wizard-card'),
  document.getElementById('pane-info')
);

// A map needs a visible container, so create each one when its screen first shows
on('screen:shown', (name) => {
  if (name === 'home') {
    getMap('hero-map');
  }

  if (name === 'app') {
    getMap('app-map', { scrollWheelZoom: true });
  }

  refreshMaps();
});

// Registered after the handler above, so the map exists when layers draw
initMapLayers();

// Before the router, so the login dialog is ready when it asks for it
initSignIn();

// Bring back this tab's login first, so a refresh on #app stays in the app
document.body.classList.add('restoring');
await tryRestoreSession();
document.body.classList.remove('restoring');

if (CONTACT_EMAIL) {
  document.getElementById('contact-link').href = `mailto:${CONTACT_EMAIL}`;
}

initRouter();