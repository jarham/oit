import {Vec2} from '@symcode-fi/minkowski-collision';

/**
 * Reference to a polygon vertex. ref is the index of references vertex on polygon.
 * x and y values depend on use case.
 */
export interface Vec2Ref extends Vec2 {
  ref: number;
}

export class Ellipse {
  // Center of the ellipse
  pos: Vec2 = {x: 0, y: 0};
  // x and y half axes
  r: Vec2 = {x: 0, y: 0};
  // Precalculated this.r.x * this.r.x
  private rx2: number = 0;
  // Scale factor for y axis to make a circle (pre-calculated to)
  ys: number;
  // Reusable temp vectors.
  private t1: Vec2 = {x: 0, y: 0};
  private t2: Vec2 = {x: 0, y: 0};
  private t3: Vec2 = {x: 0, y: 0};

  constructor(pos: Vec2, r: Vec2) {
    this.pos.x = pos.x;
    this.pos.y = pos.y;
    this.r.x = r.x;
    this.r.y = r.y;
    this.ys = r.x / r.y;
  }

  setPosition(pos: Vec2) {
    this.pos.x = pos.x;
    this.pos.y = pos.y;
  }

  setHalfAxes(r: Vec2) {
    this.r.x = r.x;
    this.r.y = r.y;
    this.ys = r.x / r.y;
    this.rx2 = this.r.x * this.r.x;
  }

  /**
   * Checks if the ellipse fully contains the given polygon.
   * ref will be set as follows: If the ellipse contains
   * the polygon x and y will be point on ellipse that is closest
   * to the polygon and ref.ref will refer to vertex that it closest
   * to the ellipse; otherwise ref's x and y will be point on ellipse
   * that is crossed by vector from ellipse's center to vertex furthest
   * outside of the ellipse and ref.ref will refer to that furthest vertex.
   *
   * @param poly Polygon vertices.
   * @param ref Reference to polygon vertex.
   * @returns true if the ellipse fully contains the given polygon; otherwise false.
   */
  containsPolygon(poly: Vec2[], ref: Vec2Ref): boolean {
    // Every vertex of polygon must be inside the polygon.
    // Translate coordinates so that ellipse us centered at origin and
    // scale coordinated so that ellipse becomes a circle. This way
    // we can just check that length of vector v (vertex) is <= than
    // circle's radius (ellipse's r.x, since r.y is scaled).
    // Temp vector usage:
    //   t1 = translated and scaled polygon point, later reference point on
    //        the scaled circle for closest / furthest vertex
    //   t2 = vertex closest to ellipse's edge _inside_ the ellipse
    //   t3 = vertex furthest away from ellipse's edge _outside_ the ellipse
    let contains = true;
    let closest = Number.POSITIVE_INFINITY;
    let closestRef = Number.POSITIVE_INFINITY;
    let closestD2 = Number.POSITIVE_INFINITY;
    let furthest = Number.NEGATIVE_INFINITY;
    let furthestRef = Number.NEGATIVE_INFINITY;
    let furthestD2 = Number.NEGATIVE_INFINITY;
    let d2 = 0;
    let i = 0;
    this.t2.x = 0;
    this.t2.y = 0;
    this.t3.x = 0;
    this.t3.y = 0;
    for (const p of poly) {
      // Translate and scale vertex
      this.t1.x = p.x - this.pos.x;
      this.t1.y = (p.y - this.pos.y) * this.ys;
      // 1: Math.sqrt(this.t1.x * this.t1.x + this.t1.y * this.t1.y) > this.r.x   |  () ^ 2
      // 2: this.t1.x * this.t1.x + this.t1.y * this.t1.y > this.r.x ^ 2
      // 3: this.t1.x * this.t1.x + this.t1.y * this.t1.y > this.r.x * this.r.x
      // 4: d2 > this.rx2
      d2 = this.t1.x * this.t1.x + this.t1.y * this.t1.y;
      if (d2 > this.rx2) {
        contains = false;
        if (d2 - this.rx2 > furthest) {
          furthest = d2 - this.rx2;
          furthestRef = i;
          furthestD2 = d2;
          this.t3.x = this.t1.x;
          this.t3.y = this.t1.y;
        }
      } else {
        if (this.rx2 - d2 < closest) {
          closest = this.rx2 - d2;
          closestRef = i;
          closestD2 = d2;
          this.t2.x = this.t1.x;
          this.t2.y = this.t1.y;
        }
      }
      i++;
    }
    // Calculate reference point on the scaled circle and scale it back
    // to point on ellipse. Circle radius is r.x (ellipse half x axis
    // since only y is scaled to make the circle).
    if (contains) {
      ref.x = this.t2.x;
      ref.y = this.t2.y;
      ref.ref = closestRef;
      d2 = closestD2;
    } else {
      ref.x = this.t3.x;
      ref.y = this.t3.y;
      ref.ref = furthestRef;
      d2 = furthestD2;
    }
    const d = Math.sqrt(d2);
    // 1) Unit vector
    // 2) Scale to reach the circle
    // 3) Scale to ellipse
    // 4) Translate to match untranslated ellipse
    ref.x = (ref.x / d) * this.r.x + this.pos.x;
    ref.y = ((ref.y / d) * this.r.x) / this.ys + this.pos.y; // radius = r.x!

    return contains;
  }
}

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

export function toFixed(n: number | string, f = 6) {
  return parseFloat(n as any).toFixed(f);
}

export function vec2Pow2Sum(v: Vec2): number {
  return v.x * v.x + v.y * v.y;
}
