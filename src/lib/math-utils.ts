import Flatten from '@flatten-js/core';

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
): [number, number][] {
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
  const p: [number, number][] = [];
  // from 0 to nv to leave the last (which === the first) vertex out
  for (let n = 0; n < nv; n++) {
    p.push([xc + x, yc + y]);
    x = A * x + B * y;
    y = C * x + D * y;
  }

  return p;
}

export function minVSegmentArrays(
  a: Flatten.Segment[],
  b: Flatten.Segment[],
): [number, Flatten.Segment] {
  let minS = new Flatten.Segment();
  let minD = Number.POSITIVE_INFINITY;
  a.forEach((sa) => {
    b.forEach((sb) => {
      const [d, s] = sa.distanceTo(sb);
      if (d < minD) {
        minS = s;
        minD = d;
      }
    });
  });

  return [minD, minS];
}

export function boxContainsBox(a: Flatten.Box, b: Flatten.Box): boolean {
  return (
    a.xmin >= b.xmin && a.xmax <= b.xmax && a.ymin >= b.ymin && a.ymax <= b.ymax
  );
}

export function minVRectangle(
  a: Flatten.Box,
  b: Flatten.Box,
): [number, Flatten.Segment] {
  if (a.intersect(b) || boxContainsBox(a, b) || boxContainsBox(b, a)) {
    return [0, new Flatten.Segment()];
  }
  const sa = a.toSegments();
  const sb = b.toSegments();
  return minVSegmentArrays(sa, sb);
}

export function minVPolygon(
  a: Flatten.Polygon,
  b: Flatten.Polygon,
): [number, Flatten.Segment] {
  if (a.intersect(b).length > 0 || a.contains(b) || b.contains(a)) {
    return [0, new Flatten.Segment()];
  }
  return a.distanceTo(b);
}

export function segmentNormalize(s: Flatten.Segment) {
  const dx = s.end.x - s.start.x;
  const dy = s.end.y - s.start.y;
  const d = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
  s.end.x = s.start.x + dx / d;
  s.end.y = s.start.y + dy / d;
  return {
    p1: {x: 0, y: 0},
    p2: {x: dx / d, y: dy / d},
  };
}
