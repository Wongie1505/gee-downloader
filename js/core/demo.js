// Demo mode lets anyone view the whole app flow without logging in.
// It has no token and never touches Google or Earth Engine, so it cannot
// download anything. It is stored in this tab only.

const DEMO_KEY = 'gd_demo';

export function startDemo() {
  try {
    sessionStorage.setItem(DEMO_KEY, '1');
  } catch (error) {
    // Without storage, demo mode simply ends on refresh
  }
}

export function endDemo() {
  try {
    sessionStorage.removeItem(DEMO_KEY);
  } catch (error) {
    // Nothing to clear
  }
}

// True after a refresh, as long as this tab started demo mode
export function demoWasActive() {
  try {
    return sessionStorage.getItem(DEMO_KEY) === '1';
  } catch (error) {
    return false;
  }
}