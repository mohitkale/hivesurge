/**
 * Feedback round 4 (Mohit, 2026-10-22: "I still see vertical scrollbars at many places"):
 * native scrollbars are hidden everywhere (style.css), so a scroll track shows a fade edge on
 * the side that has more content instead. `data-fade` (vertical) / `data-fade-x` (horizontal)
 * is 'start', 'end' or 'both'; the CSS masks that edge. Pure state function + a tiny DOM pass.
 */
export type Fade = '' | 'start' | 'end' | 'both';

/** Elements that may scroll: explicit tracks plus the home page and the card fallback. */
export const SCROLLERS = '.scroll-y, .scroll-x, .card, .home-card';

/** Which edges hide content: `pos` = scrollTop/Left, `size` = scrollHeight/Width, `view` = client. */
export function fadeState(pos: number, size: number, view: number): Fade {
  if (size - view <= 2) return '';
  const atStart = pos <= 2;
  const atEnd = pos + view >= size - 2;
  return atStart ? 'end' : atEnd ? 'start' : 'both';
}

function mark(el: HTMLElement): void {
  const y = fadeState(el.scrollTop, el.scrollHeight, el.clientHeight);
  const x = fadeState(el.scrollLeft, el.scrollWidth, el.clientWidth);
  if (y) el.dataset.fade = y;
  else delete el.dataset.fade;
  if (x) el.dataset.fadeX = x;
  else delete el.dataset.fadeX;
}

/** Re-mark every scroller under `root` (after a screen is drawn or the viewport resizes). */
export function refreshScrollHints(root: ParentNode): void {
  root.querySelectorAll<HTMLElement>(SCROLLERS).forEach(mark);
}

/**
 * One capture listener keeps the fades in step with touch / wheel scrolling; a rAF-debounced
 * MutationObserver re-marks after any screen redraw.
 */
export function installScrollHints(root: HTMLElement): void {
  let queued = false;
  const later = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      refreshScrollHints(root);
    });
  };
  new MutationObserver(later).observe(root, { childList: true, subtree: true });
  root.addEventListener(
    'scroll',
    (e) => {
      const t = e.target as HTMLElement;
      if (t instanceof HTMLElement && t.matches(SCROLLERS)) mark(t);
    },
    { capture: true, passive: true },
  );
  window.addEventListener('resize', later, { passive: true });
}
