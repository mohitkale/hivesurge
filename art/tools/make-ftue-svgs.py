"""Generates the 6 FTUE overlay SVGs in public/assets/ftue/ (M3-1b, art/ART_DIRECTION.md §6).
Original artwork defined here as geometry; output is byte-identical to the committed files
(checked by tests/provenance.test.ts via the sha256 in art/PROVENANCE.md)."""
import os

OUT = 'public/assets/ftue'
INK, CREAM, HONEY = '#2a1838', '#fff8ec', '#ffc83d'


def svg(w, h, title, body):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">'
            f'<title>{title}</title>{body}</svg>\n')


FILES = {
    'finger': svg(96, 112, 'ftue-finger',
        f'<path d="M38 8a8 8 0 0 1 16 0v40l4-2a8 8 0 0 1 10 4l2-1a8 8 0 0 1 10 5l1 0a8 8 0 0 1 9 7v20c0 16-12 28-28 28H54c-10 0-18-6-22-14L14 62a8 8 0 0 1 12-10l12 12z" fill="{CREAM}" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/>'
        f'<path d="M54 62v14M68 62v14M80 66v12" stroke="{INK}" stroke-width="4" stroke-linecap="round"/>'
        f'<path d="M42 12h8" stroke="{HONEY}" stroke-width="4" stroke-linecap="round"/>'),
    'tap-ring': svg(96, 96, 'ftue-tap-ring',
        f'<circle cx="48" cy="48" r="40" fill="none" stroke="{CREAM}" stroke-width="6"/>'
        f'<circle cx="48" cy="48" r="40" fill="none" stroke="{INK}" stroke-width="2" stroke-dasharray="2 0"/>'
        f'<circle cx="48" cy="48" r="22" fill="{HONEY}" fill-opacity="0.45" stroke="{INK}" stroke-width="3"/>'),
    'aim-line': svg(32, 256, 'ftue-aim-line (vertical tile: dots + target ring at top)',
        f'<g fill="{CREAM}" stroke="{INK}" stroke-width="2.5">'
        + ''.join(f'<circle cx="16" cy="{y}" r="5"/>' for y in range(232, 63, -24))
        + f'</g><circle cx="16" cy="22" r="13" fill="none" stroke="{INK}" stroke-width="7"/>'
        f'<circle cx="16" cy="22" r="13" fill="none" stroke="{HONEY}" stroke-width="4"/>'),
    'gate-arrow': svg(64, 80, 'ftue-gate-arrow',
        f'<path d="M20 6h24v34h14L32 74 6 40h14z" fill="{HONEY}" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/>'),
    'gate-glow': svg(160, 96, 'ftue-gate-glow (9-slice frame)',
        '<defs><filter id="b" x="-20%" y="-30%" width="140%" height="160%"><feGaussianBlur stdDeviation="5"/></filter></defs>'
        '<rect x="12" y="12" width="136" height="72" rx="18" fill="none" stroke="#fff3a0" stroke-width="12" filter="url(#b)"/>'
        f'<rect x="12" y="12" width="136" height="72" rx="18" fill="none" stroke="{HONEY}" stroke-width="6"/>'
        f'<rect x="12" y="12" width="136" height="72" rx="18" fill="none" stroke="{INK}" stroke-width="2"/>'),
    'prompt-plate': svg(320, 56, 'ftue-prompt-plate (9-slice, optional backing for prompt text)',
        f'<rect x="3" y="3" width="314" height="50" rx="25" fill="{INK}" fill-opacity="0.72"/>'
        f'<rect x="3" y="3" width="314" height="50" rx="25" fill="none" stroke="{CREAM}" stroke-opacity="0.9" stroke-width="3"/>'),
}

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for name, text in FILES.items():
        with open(f'{OUT}/{name}.svg', 'w') as f:
            f.write(text)
    print(len(FILES), 'FTUE SVGs')
