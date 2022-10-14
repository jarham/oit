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
  const CDP = Math.cos(dPh);
  const SDP = Math.sin(dPh);
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

export function minVSegments(
  a: Flatten.Segment,
  b: Flatten.Segment,
): {v: Flatten.Segment; d2: number} {
  let minD2 = Number.POSITIVE_INFINITY;
}

export function minVSegmentArrays(
  a: Flatten.Segment[],
  b: Flatten.Segment[],
): {v: Flatten.Segment; d2: number} {
  let minV: Flatten.Segment;
  let minD2 = Number.POSITIVE_INFINITY;
  a.forEach((sa) => {
    b.forEach((sb) => {
      const {v, d2} = minVSegments(sa, sb);
      if (d2 < minD2) {
        minV = v;
        minD2 = d2;
      }
    });
  });

  return {v: minV, d2: minD2};
}

export function minVRectangle(a: Flatten.Box, b: Flatten.Box): Flatten.Segment {
  const sa = a.toSegments();
  const sb = a.toSegments();
  return minVSegmentArrays(sa, sb);
}
