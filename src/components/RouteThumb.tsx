import type { LatLng } from '../lib/types';

/** Zet een route om naar een pad dat binnen een vierkant van `size` past, noorden boven. */
export function routePath(coords: LatLng[], size: number, pad: number): string {
  if (coords.length < 2) return '';
  const lat0 = (coords[0][0] * Math.PI) / 180;
  const pts = coords.map(([lat, lng]) => [lng * Math.cos(lat0), -lat] as const);
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [x, y] of pts) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  const span = Math.max(maxX - minX, maxY - minY) || 1;
  const scale = (size - pad * 2) / span;
  const offX = (size - (maxX - minX) * scale) / 2;
  const offY = (size - (maxY - minY) * scale) / 2;
  return pts
    .map(([x, y], i) => `${i ? 'L' : 'M'}${((x - minX) * scale + offX).toFixed(1)} ${((y - minY) * scale + offY).toFixed(1)}`)
    .join('');
}

export default function RouteThumb({ coords, size = 64 }: { coords: LatLng[]; size?: number }) {
  const d = routePath(coords, 64, 11);
  const [x, y] = d ? d.slice(1, d.indexOf('L')).split(' ') : ['32', '32'];
  return (
    <svg className="thumb" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="14" className="thumb-bg" />
      <path d={d} className="thumb-line" />
      <circle cx={x} cy={y} r="3.5" className="thumb-start" />
    </svg>
  );
}
