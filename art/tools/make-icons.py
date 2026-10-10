"""Generates the original Hive Surge UI icon set (SVG, 64x64 grid, 4px ink outline).
Style: chunky rounded shapes, ink #2a1838 outline, palette fills from ART_DIRECTION.md."""
import math, os
OUT = 'public/assets/icons'
INK, HONEY, HONEYD, TEAL, PLUM, ORANGE, CREAM, PINK, GREEN, RED = (
    '#2a1838', '#ffc83d', '#f2a516', '#2ec4b6', '#6b2d8c', '#ff8a3d', '#fff8ec', '#ff6fa8', '#5fb84a', '#e2557a')
S = f'stroke="{INK}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"'

def hexpts(cx, cy, r, rot=0):
    return ' '.join(f'{cx + r*math.cos(math.radians(60*i+rot)):.1f},{cy + r*math.sin(math.radians(60*i+rot)):.1f}' for i in range(6))
def star(cx, cy, R, r, n=5):
    return ' '.join(f'{cx + (R if i%2==0 else r)*math.sin(math.pi*i/n):.1f},{cy - (R if i%2==0 else r)*math.cos(math.pi*i/n):.1f}' for i in range(2*n))

bee = f'<ellipse cx="22" cy="22" rx="12" ry="9" fill="#dff7ff" {S}/><ellipse cx="42" cy="22" rx="12" ry="9" fill="#dff7ff" {S}/><ellipse cx="32" cy="38" rx="16" ry="18" fill="{HONEY}" {S}/><path d="M17 34h30M17 44h30" {S}/><circle cx="26" cy="30" r="3" fill="{INK}"/><circle cx="38" cy="30" r="3" fill="{INK}"/>'
wasp = f'<path d="M10 14l18 12M54 14l-18 12" stroke="#b9a3d9" stroke-width="7" stroke-linecap="round"/><path d="M32 8l10 10-10 8-10-8z" fill="{PLUM}" {S}/><path d="M22 30h20l-10 30z" fill="#2b1636" {S}/><path d="M25 38h14M28 46h8" stroke="{ORANGE}" stroke-width="4"/><path d="M26 15l4 2M38 15l-4 2" stroke="#ff3d3d" stroke-width="3"/>'
icons = {
 'bee': bee,
 'wasp': wasp,
 'hornet': wasp.replace(PLUM, '#8a1f3c').replace(ORANGE, '#e2304a') + f'<path d="M24 10l-6-6M40 10l6-6" {S}/>',
 'queen': bee + f'<path d="M20 14l4-10 8 8 8-8 4 10z" fill="{HONEY}" {S}/>',
 'crown': f'<path d="M8 48l4-30 12 12 8-18 8 18 12-12 4 30z" fill="{HONEY}" {S}/><circle cx="32" cy="40" r="4" fill="{TEAL}"/>',
 'hive': f'<polygon points="{hexpts(32,32,26,30)}" fill="{HONEY}" {S}/><polygon points="{hexpts(32,32,12,30)}" fill="{HONEYD}" {S}/>',
 'nest': f'<path d="M32 4c14 6 22 18 22 32s-10 24-22 24S10 50 10 36 18 10 32 4z" fill="#7d6a8f" {S}/><path d="M14 30h36M12 44h40" stroke="{ORANGE}" stroke-width="5"/><circle cx="32" cy="38" r="6" fill="{INK}"/>',
 'cannon': f'<rect x="26" y="6" width="14" height="30" rx="4" transform="rotate(20 33 21)" fill="{HONEY}" {S}/><polygon points="{hexpts(30,44,16)}" fill="{TEAL}" {S}/>',
 'honey': f'<path d="M32 6C22 22 14 30 14 40a18 18 0 0 0 36 0c0-10-8-18-18-34z" fill="{HONEY}" {S}/><path d="M24 40a8 8 0 0 0 8 8" stroke="{CREAM}" stroke-width="4" fill="none"/>',
 'coin': f'<circle cx="32" cy="32" r="24" fill="{HONEY}" {S}/><polygon points="{hexpts(32,32,11,30)}" fill="{HONEYD}" {S}/>',
 'gem': f'<path d="M14 24l10-12h16l10 12-18 28z" fill="{TEAL}" {S}/><path d="M14 24h36M24 12l8 12 8-12" {S} fill="none"/>',
 'star': f'<polygon points="{star(32,34,26,11)}" fill="{HONEY}" {S}/>',
 'heart': f'<path d="M32 54S8 40 8 24a12 12 0 0 1 24-4 12 12 0 0 1 24 4c0 16-24 30-24 30z" fill="{PINK}" {S}/>',
 'shield': f'<path d="M32 6l22 8v16c0 14-10 24-22 28C20 54 10 44 10 30V14z" fill="{TEAL}" {S}/><path d="M24 30l6 6 12-12" {S} fill="none"/>',
 'play': f'<circle cx="32" cy="32" r="26" fill="{GREEN}" {S}/><path d="M26 20l18 12-18 12z" fill="{CREAM}" {S}/>',
 'pause': f'<circle cx="32" cy="32" r="26" fill="{TEAL}" {S}/><path d="M26 22v20M38 22v20" stroke="{CREAM}" stroke-width="7" stroke-linecap="round"/>',
 'home': f'<path d="M8 30L32 10l24 20" fill="none" {S}/><path d="M14 28v26h36V28" fill="{HONEY}" {S}/><rect x="27" y="38" width="10" height="16" fill="{TEAL}" {S}/>',
 'settings': f'<polygon points="{star(32,32,26,19,8)}" fill="{CREAM}" {S}/><circle cx="32" cy="32" r="8" fill="{TEAL}" {S}/>',
 'sound-on': f'<path d="M8 24h10l14-12v40L18 40H8z" fill="{CREAM}" {S}/><path d="M42 22c4 6 4 14 0 20M48 16c8 10 8 22 0 32" fill="none" {S}/>',
 'sound-off': f'<path d="M8 24h10l14-12v40L18 40H8z" fill="{CREAM}" {S}/><path d="M42 24l14 16M56 24L42 40" {S}/>',
 'music': f'<path d="M24 46V14l28-6v32" fill="none" {S}/><circle cx="18" cy="46" r="7" fill="{PLUM}" {S}/><circle cx="46" cy="40" r="7" fill="{PLUM}" {S}/>',
 'shop': f'<path d="M10 22h44l-4 32H14z" fill="{HONEY}" {S}/><path d="M22 22v-6a10 10 0 0 1 20 0v6" fill="none" {S}/>',
 'gift': f'<rect x="10" y="26" width="44" height="28" fill="{PINK}" {S}/><rect x="6" y="18" width="52" height="10" fill="{PINK}" {S}/><path d="M32 18v36" stroke="{HONEY}" stroke-width="6"/><path d="M32 18c-8-12-18-6-12 0M32 18c8-12 18-6 12 0" fill="none" {S}/>',
 'trophy': f'<path d="M18 8h28v14a14 14 0 0 1-28 0z" fill="{HONEY}" {S}/><path d="M18 14H8c0 10 6 14 12 14M46 14h10c0 10-6 14-12 14" fill="none" {S}/><path d="M26 54h12l-2-18h-8z" fill="{HONEYD}" {S}/><path d="M20 56h24" {S}/>',
 'lock': f'<rect x="12" y="28" width="40" height="28" rx="6" fill="{HONEY}" {S}/><path d="M20 28v-8a12 12 0 0 1 24 0v8" fill="none" {S}/><circle cx="32" cy="42" r="4" fill="{INK}"/>',
 'unlock': f'<rect x="12" y="28" width="40" height="28" rx="6" fill="{GREEN}" {S}/><path d="M20 28v-8a12 12 0 0 1 23-5" fill="none" {S}/><circle cx="32" cy="42" r="4" fill="{INK}"/>',
 'clock': f'<circle cx="32" cy="32" r="25" fill="{CREAM}" {S}/><path d="M32 18v14l10 6" fill="none" {S}/>',
 'boost': f'<path d="M36 4L12 36h16l-4 24 26-34H34z" fill="{HONEY}" {S}/>',
 'gate-multiply': f'<rect x="6" y="10" width="52" height="44" rx="10" fill="{TEAL}" {S}/><path d="M22 22l20 20M42 22L22 42" stroke="{CREAM}" stroke-width="7" stroke-linecap="round"/>',
 'gate-add': f'<rect x="6" y="10" width="52" height="44" rx="10" fill="{GREEN}" {S}/><path d="M32 20v24M20 32h24" stroke="{CREAM}" stroke-width="7" stroke-linecap="round"/>',
 'gate-trap': f'<rect x="6" y="10" width="52" height="44" rx="10" fill="{RED}" {S}/><path d="M20 32h24" stroke="{CREAM}" stroke-width="7" stroke-linecap="round"/>',
 'flower': ''.join(f'<circle cx="{32+12*math.sin(i*1.2566):.1f}" cy="{30-12*math.cos(i*1.2566):.1f}" r="9" fill="{PINK}" {S}/>' for i in range(5)) + f'<circle cx="32" cy="30" r="7" fill="{HONEY}" {S}/><path d="M32 42v18" {S}/>',
 'clover': ''.join(f'<circle cx="{32+11*math.sin(i*2.094):.1f}" cy="{28-11*math.cos(i*2.094):.1f}" r="11" fill="{GREEN}" {S}/>' for i in range(3)) + f'<path d="M32 30l6 28" {S}/>',
 'map': f'<path d="M6 14l16-6 20 6 16-6v42l-16 6-20-6-16 6z" fill="{CREAM}" {S}/><path d="M22 8v42M42 14v42" {S}/><circle cx="32" cy="30" r="5" fill="{RED}"/>',
 'close': f'<circle cx="32" cy="32" r="26" fill="{RED}" {S}/><path d="M22 22l20 20M42 22L22 42" stroke="{CREAM}" stroke-width="7" stroke-linecap="round"/>',
 'check': f'<circle cx="32" cy="32" r="26" fill="{GREEN}" {S}/><path d="M20 33l8 8 16-18" stroke="{CREAM}" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
 'ad-video': f'<rect x="6" y="14" width="52" height="36" rx="8" fill="{PLUM}" {S}/><path d="M26 22l14 10-14 10z" fill="{CREAM}"/>',
 'share': f'<circle cx="46" cy="14" r="7" fill="{TEAL}" {S}/><circle cx="18" cy="32" r="7" fill="{TEAL}" {S}/><circle cx="46" cy="50" r="7" fill="{TEAL}" {S}/><path d="M24 29l16-11M24 35l16 11" {S}/>',
 'calendar': f'<rect x="8" y="12" width="48" height="44" rx="6" fill="{CREAM}" {S}/><path d="M8 24h48" {S}/><path d="M20 6v10M44 6v10" {S}/><polygon points="{star(32,40,10,4)}" fill="{HONEY}"/>',
 'skin': bee.replace(HONEY, ORANGE) + f'<path d="M14 8l6 6M50 8l-6 6" stroke="{PINK}" stroke-width="5" stroke-linecap="round"/>',
 'season-pass': f'<rect x="10" y="6" width="44" height="52" rx="6" fill="{HONEY}" {S}/><polygon points="{star(32,28,12,5)}" fill="{CREAM}" {S}/><path d="M18 46h28" {S}/>',
}
os.makedirs(OUT, exist_ok=True)
for k, body in icons.items():
    with open(f'{OUT}/{k}.svg', 'w') as f:
        f.write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><title>{k}</title>{body}</svg>\n')
print(len(icons), 'icons')
