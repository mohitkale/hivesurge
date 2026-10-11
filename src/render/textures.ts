import * as THREE from 'three';

/** All art is generated procedurally at runtime: no external image assets. */
export function stripeTexture(base: string, stripe: string, bands = 3): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const g = c.getContext('2d')!;
  g.fillStyle = base;
  g.fillRect(0, 0, 64, 64);
  g.fillStyle = stripe;
  const h = 64 / (bands * 2 + 1);
  for (let i = 0; i < bands; i++) g.fillRect(0, h * (i * 2 + 1.3), 64, h * 0.8);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function labelTexture(text: string, fill: string, sub = ''): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  drawLabel(c, text, fill, sub);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function drawLabel(c: HTMLCanvasElement, text: string, fill: string, sub = ''): void {
  const g = c.getContext('2d')!;
  g.clearRect(0, 0, c.width, c.height);
  g.fillStyle = fill;
  roundRect(g, 6, 6, c.width - 12, c.height - 12, 26);
  g.fill();
  // Backing plate: dark ink rim + white inner rim keeps it readable over swarms and grass.
  g.lineWidth = 12;
  g.strokeStyle = '#2a1838';
  g.stroke();
  g.lineWidth = 5;
  g.strokeStyle = 'rgba(255,255,255,0.9)';
  g.stroke();
  g.fillStyle = '#fff';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = '900 72px system-ui, sans-serif';
  g.lineWidth = 10;
  g.strokeStyle = 'rgba(40,20,60,0.55)';
  const y = sub ? 54 : 66;
  g.strokeText(text, c.width / 2, y);
  g.fillText(text, c.width / 2, y);
  if (sub) {
    g.font = '700 26px system-ui, sans-serif';
    g.fillText(sub, c.width / 2, 104);
  }
}

function roundRect(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/** Lane grass colours (base, light band); gate contrast is tested against these. */
export const GRASS = ['#7cc46a', '#86cd73'] as const;

export function grassTexture(base: string = GRASS[0], band: string = GRASS[1]): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = base;
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = band;
  g.fillRect(0, 0, 128, 64);
  for (let i = 0; i < 90; i++) {
    g.fillStyle = i % 2 ? 'rgba(255,255,255,0.08)' : 'rgba(30,90,40,0.12)';
    g.fillRect((i * 37) % 128, (i * 61) % 128, 3, 6);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
