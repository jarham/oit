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

export function vec2Pow2Sum(v: Vec2): number {
  return v.x * v.x + v.y * v.y;
}
