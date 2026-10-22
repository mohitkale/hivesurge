import { cloudEnv, shouldAutoStartCloud } from './platform/cloud/config';
import { LocalSaveBackend, SaveStore } from './platform/save';

/**
 * Tiny bootstrap entry: shows a loading hint immediately, then lazily loads the
 * game module (Three.js renderer, sim, UI) as separate chunks in parallel with the save.
 */
const overlay = document.getElementById('overlay');
if (overlay) overlay.innerHTML = '<div class="boot-loading" role="status">Loading…</div>';

const store = new SaveStore(new LocalSaveBackend(localStorage));
Promise.all([import('./game'), store.load()])
  .then(([{ Game }]) => {
    if (overlay) overlay.innerHTML = '';
    const game = new Game(store);
    // M4: a returning signed-in player (or an auth link redirect) syncs in the background once
    // the game is up. Guests never load the cloud chunk until they open Account.
    const idle = window.requestIdleCallback ?? ((fn: () => void) => setTimeout(fn, 1500));
    if (shouldAutoStartCloud(localStorage, location, cloudEnv())) idle(() => game.startCloud());
    // M5-6g / M7: background refresh of the remote config (events calendar, season) and the
    // admin-edited level rows, for everyone incl. guests (lazy chunks; the shipped file is
    // used with no backend). Events show from the next home screen; levels from the next one.
    idle(() => {
      void import('./platform/remoteConfig').then((m) => m.refreshRemoteConfig(cloudEnv()));
      void import('./levels/overrides').then((m) => m.refreshLevelOverrides(cloudEnv()));
    });
    // M5-7: back from hosted Stripe Checkout: collect the server-confirmed grant (lazy chunk).
    if (/[?&]checkout=/.test(location.search)) void game.resumeCheckout(location.search);
    // Dev HMR: tear the old game down (frame loop, sim timer, GL context) before reloading.
    import.meta.hot?.dispose(() => game.dispose());
  })
  .catch((err: unknown) => {
    console.error(err);
    if (overlay)
      overlay.innerHTML =
        '<div class="boot-loading" role="alert">Failed to load. Please refresh.</div>';
  });
