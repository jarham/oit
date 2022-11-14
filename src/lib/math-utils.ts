/**
 * Calculate polygon approximation of an ellipse.
 * Using algorithm described by L. B. Smith in
 *   The Computer Journal, Volume 14, Issue 1, 1971, Page 82
 *   Drawing ellipses, hyperbolas or parabolas with a fixed number of points and maximum inscribed area
 *   https://doi.org/10.1093/comjnl/14.1.81
 *
 * @param xc Ellipse's center x-coordinate
 * @param yc Ellipse's center y-coordinate
 * @param a Ellipse's major semi-axis
 * @param b Ellipse's minor semi-axis
 * @param th Ellipse's rotation in radians
 * @param nv Number of polygon vertices
 * @return Polygon vertices as array of [x, y] tuples
 */
export function ellipse2poly(
  xc: number,
  yc: number,
  a: number,
  b: number,
  th: number,
  nv: number,
): Vec2[] {
  // Algorith gives "closed polygon" (last vertex === first vertext), so we
  // actually want nv + 1 rounds.
  const N = nv + 1;
  const dPh = (2 * Math.PI) / (N - 1);
  const CT = Math.cos(th);
  const ST = Math.sin(th);
  // Handle the special case of nv === 4 (ie. rectangle)
  // NOTE: Using 0 as CDP causes algorith to fail (would need to handle Inf)
  const CDP = nv === 4 ? Number.EPSILON : Math.cos(dPh);
  const SDP = nv === 4 ? 1 : Math.sin(dPh);
  const A = CDP + SDP * ST * CT * (a / b - b / a);
  const B = (-SDP * (b * ST * (b * ST) + a * CT * (a * CT))) / (a * b);
  let C = (SDP * (b * CT * (b * CT) + a * ST * (a * ST))) / (a * b);
  let D = CDP + SDP * ST * CT * (b / a - a / b);
  D = D - (C * B) / A;
  C = C / A;
  let x = a * CT;
  let y = a * ST;
  const p: Vec2[] = [];
  // from 0 to nv to leave the last (which === the first) vertex out
  for (let n = 0; n < nv; n++) {
    p.push({x: xc + x, y: yc + y});
    x = A * x + B * y;
    y = C * x + D * y;
  }

  return p;
}

export interface Vec2 {
  x: number;
  y: number;
}

export function toFixed(n: number | string, f = 6) {
  return parseFloat(n as any).toFixed(f);
}

function lowestIndex(p: Vec2[]): number {
  let i = 0;
  p.forEach((v, j) => {
    if (v.y < p[i].y || (v.y === p[i].y && v.x < p[i].x)) i = j;
  });
  return i;
}

export function minkowskiSum(p: Vec2[], q: Vec2[], r?: Vec2[]): Vec2[] {
  if (!r) r = [];

  const si = lowestIndex(p);
  let i = 0;
  let i2 = 0;
  const sj = lowestIndex(q);
  let j = 0;
  let j2 = 0;
  let k = 0;

  while (i < p.length || j < q.length) {
    const pa = p[(si + i) % p.length];
    const qa = q[(sj + j) % q.length];
    i2 = (si + i + 1) % p.length;
    j2 = (sj + j + 1) % q.length;
    const pb = p[i2];
    const qb = q[j2];
    const pc = {x: pb.x - pa.x, y: pb.y - pa.y};
    const qc = {x: qb.x - qa.x, y: qb.y - qa.y};

    r[k++] = {x: pa.x + qa.x, y: pa.y + qa.y};

    // "perp dot product"
    const pdp = pc.x * qc.y - pc.y * qc.x;
    if (pdp >= 0) i++;
    if (pdp <= 0) j++;
  }

  return r;
}

export function pointInPoly(pt: Vec2, poly: Vec2[]): boolean {
  // "Always on the same side" check
  let p = 0;
  let n = 0;
  for (let i = 0; i < poly.length; i++) {
    const v1 = poly[i];
    const v2 = poly[i === poly.length - 1 ? 0 : i + 1];
    const pdp = (pt.x - v1.x) * (v2.y - v1.y) - (pt.y - v1.y) * (v2.x - v1.x);
    if (pdp > 0) p++;
    if (pdp < 0) n++;
    if (p > 0 && n > 0) return false;
  }

  return true;
}
