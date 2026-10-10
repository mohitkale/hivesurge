/** Accessible star rating text, e.g. "2 of 3 stars" (M2-23 / PR 002 bug 4). */
export function starsLabel(stars: number): string {
  const n = Math.max(0, Math.min(3, Math.floor(stars)));
  return `${n} of 3 stars`;
}

/** Star row HTML: visual stars are decorative; the row exposes the real rating as text. */
export function starRowHtml(stars: number): string {
  const label = starsLabel(stars);
  const icons = [0, 1, 2]
    .map((i) => `<span class="${i < stars ? '' : 'off'}" aria-hidden="true">★</span>`)
    .join('');
  return `<div class="stars" role="img" aria-label="${label}" title="${label}">${icons}<span class="sr-only">${label}</span></div>`;
}
