// SPDX-License-Identifier: BSD-2-Clause
// Copyright (c) 2023, Jari Hämäläinen, Carita Kiili and Julie Coiro
import {
  type Body,
  type BoundingBox,
  MinkowskiDiffEngine,
  Vec2,
} from '@symcode-fi/minkowski-collision';
import {type WordNode} from './word-node';
import {Ellipse, Vec2Ref, ellipse2poly, vec2Pow2Sum} from './math-utils';

// This file contains the remainder of D3 force simulation, which was
// at first used for word node positioning, but dropper later on.
// Custom "separate nodes" and "keep in viewport" forces created
// back then were seem useful in newer implementation so they were
// kept and used in their own "force simulation" (class Simulation).
// Simulation is now run for a few rounds after initial word node
// positioning is done in attempt to ensure that all word nodes
// are in viewport (this is enforced) and that they don't overlap
// (this is not guaranteed, space can be too small).

type ForceAlphas = Record<string, number>;

interface PerspectivePaletteForceAlphaSettings {
  target: number;
  decay: number;
  min: number;
  alphaInit?: number;
}

interface PerspectivePaletteBaseForceParams {
  enabled: boolean;
  strength: number;
  // Force "aspect ratio: x/y". 1 = apply equally, > 1 = apply more on x-axis
  aspectRatio: number;
}

export interface PerspectivePaletteBaseForceOpts<
  T extends PerspectivePaletteBaseForceParams,
> {
  params: T;
  alpha: PerspectivePaletteForceAlphaSettings;
}

export interface PerspectivePaletteSeparationForceOpts
  extends PerspectivePaletteBaseForceParams {
  outwardsOnly: boolean;
}

export interface PerspectivePaletteKeepInVpForceOpts
  extends PerspectivePaletteBaseForceParams {
  ellipse?: boolean;
}

interface BaseForceApplyOpts {
  eng: MinkowskiDiffEngine<WordNode>;
  vpBb: BoundingBox;
  vpEl: Ellipse;
}

let forceCounter = 0;
abstract class ForceBase<T extends PerspectivePaletteBaseForceParams> {
  readonly id = `force-${forceCounter++}`;
  protected nodes: WordNode[] = [];

  constructor(protected readonly p: T) {}

  abstract apply(alpha: number, opts: BaseForceApplyOpts): void;

  get enabled(): boolean {
    return this.p.enabled;
  }

  setAspectRatio(ar: number) {
    this.p.aspectRatio = ar;
  }

  updateParams(p: T) {
    Object.assign(this.p, p);
  }

  initialize(newNodes: WordNode[]) {
    this.nodes = newNodes;
  }

  clear() {
    this.nodes.splice(0, this.nodes.length);
  }
}

type BaseWordNodeDatumForce = ForceBase<PerspectivePaletteBaseForceParams>;

// A "force" that pushes overlapping node away from each other.
// 'velocity' version affects nodes velocity. 'position' version
// affect position directly.
export class ForceSeparate extends ForceBase<PerspectivePaletteSeparationForceOpts> {
  // Reusable temp vectors.
  private t1: Vec2 = {x: 0, y: 0};
  private t2: Vec2 = {x: 0, y: 0};
  private t3: Vec2 = {x: 0, y: 0};
  constructor(
    private readonly type: 'velocity' | 'position',
    p: PerspectivePaletteSeparationForceOpts,
  ) {
    super(p);
  }

  private applyToNode(
    node: WordNode,
    isABody: boolean,
    alpha: number,
    colDepth: number,
    colNormal: Vec2,
  ) {
    const vp = this.type === 'velocity' ? node.vl[this.id] : node.p[this.id];
    const str = this.p.strength / 100;
    const m = Math.max((alpha * str * colDepth) / 2, 1);

    if (isABody) {
      this.t2.x = m * colNormal.x * this.p.aspectRatio;
      this.t2.y = (m * colNormal.y) / this.p.aspectRatio;
    } else {
      this.t2.x = -m * colNormal.x * this.p.aspectRatio;
      this.t2.y = (-m * colNormal.y) / this.p.aspectRatio;
    }
    if (this.p.outwardsOnly) {
      this.t3.x = node.pos.x + this.t2.x;
      this.t3.y = node.pos.y + this.t2.y;
      // Clear effect if the force would move node closer to origin.
      if (vec2Pow2Sum(this.t3) < vec2Pow2Sum(node.pos)) {
        this.t2.x = 0;
        this.t2.y = 0;
      }
    }
    vp.x += this.t2.x;
    vp.y += this.t2.y;
  }

  apply(alpha: number, opts: BaseForceApplyOpts) {
    for (let i = 0; i < opts.eng.collisionCount; i++) {
      const c = opts.eng.collisions[i];
      // MinkowskiDiffEngine guarantees that c.a.index < c.b.index
      // to they're usable for getting distance between a and b.
      const d = opts.eng.distances[c.a.index][c.b.index - (c.a.index + 1)];
      this.t1.x = d.dv.x / d.d;
      this.t1.y = d.dv.y / d.d;
      this.applyToNode(c.a.data, true, alpha, d.d, this.t1);
      this.applyToNode(c.b.data, false, alpha, d.d, this.t1);
    }
  }
}

// A "force" that keeps node inside the viewport by manipulating node position
// so that it "nullifies" the effect of forces that pushed the node outside
// of viewport.
// NOTE: This "force" must be the last one added to simulation for it to actually work
// coorectly.
export class ForceKeepInVP extends ForceBase<PerspectivePaletteKeepInVpForceOpts> {
  // Reusable temp bounding box
  private t1: BoundingBox = {
    xmin: 0,
    xmax: 0,
    ymin: 0,
    ymax: 0,
  };
  // Reusable temp reference to a vector
  private t2: Vec2Ref = {ref: 0, x: 0, y: 0};
  constructor(p: PerspectivePaletteKeepInVpForceOpts) {
    super(p);
  }

  apply(_alpha: number, opts: BaseForceApplyOpts) {
    // This is a very special force: it'll "nullify" the effect of
    // other forces pushing node outside of the viewport. It should
    // be the last force applied.
    this.nodes.forEach((n) => {
      let dx = 0;
      let dy = 0;
      Object.entries(n.vl).forEach(([id, vl]) => {
        if (id !== this.id) {
          dx += vl.x;
          dy += vl.y;
        }
      });
      Object.entries(n.p).forEach(([id, p]) => {
        if (id !== this.id) {
          dx += p.x;
          dy += p.y;
        }
      });

      const vp = n.p[this.id];
      if (this.p.ellipse) {
        const poly = n.v.map<Vec2>((v) => ({
          x: v.x + dx + n.pos.x,
          y: v.y + dy + n.pos.y,
        }));
        if (!opts.vpEl.containsPolygon(poly, this.t2)) {
          this.t2.x -= poly[this.t2.ref].x;
          this.t2.y -= poly[this.t2.ref].y;
          vp.x = this.t2.x;
          vp.y = this.t2.y;
        }
      } else {
        const b = opts.eng.bodies[n.index];
        this.t1.xmin = b.bb.xmin + dx + n.pos.x;
        this.t1.xmax = b.bb.xmax + dx + n.pos.x;
        this.t1.ymin = b.bb.ymin + dy + n.pos.y;
        this.t1.ymax = b.bb.ymax + dy + n.pos.y;

        if (this.t1.xmin < opts.vpBb.xmin) {
          vp.x = opts.vpBb.xmin - this.t1.xmin;
        } else if (this.t1.xmax > opts.vpBb.xmax) {
          vp.x = opts.vpBb.xmax - this.t1.xmax;
        } else {
          vp.x = 0;
        }
        if (this.t1.ymin < opts.vpBb.ymin) {
          vp.y = opts.vpBb.ymin - this.t1.ymin;
        } else if (this.t1.ymax > opts.vpBb.ymax) {
          vp.y = opts.vpBb.ymax - this.t1.ymax;
        } else {
          vp.y = 0;
        }
      }
    });
  }
}

// Force simulation class
export class Simulation {
  private nodes: WordNode[] = [];
  eng: MinkowskiDiffEngine<WordNode>;
  private forces: ForceBase<PerspectivePaletteBaseForceParams>[] = [];
  private alphas: ForceAlphas = {};
  private alphaSettings = new Map<
    string,
    PerspectivePaletteForceAlphaSettings
  >();
  private vDecay = 0.4;
  // viewport as bounding box
  private vpBb: BoundingBox = {
    xmin: 0,
    xmax: 0,
    ymin: 0,
    ymax: 0,
  };
  // bounding ellipse
  private vpEl = new Ellipse({x: 0, y: 0}, {x: 0, y: 0});
  private applyOpts: BaseForceApplyOpts;
  // number of "idle" ticks (nodes not moving)
  private idleCounter = 0;

  constructor() {
    const temp: WordNode = {
      h: {x: 2, y: 1},
      id: 'temp',
      index: -1,
      p: {},
      pos: {x: 0, y: 0},
      pt: {x: 0, y: 0},
      v: ellipse2poly(0, 0, 20, 10, 0, 16),
      vl: {},
      vlt: {x: 0, y: 0},
      word: 'temp',
    };
    this.eng = new MinkowskiDiffEngine<WordNode>(
      true,
      false,
      false,
      (o) => o.id,
      temp,
    );
    this.applyOpts = {
      eng: this.eng,
      vpBb: this.vpBb,
      vpEl: this.vpEl,
    };
  }

  private static resetNodeForce(
    n: WordNode,
    f: ForceBase<PerspectivePaletteBaseForceParams>,
  ) {
    n.vl[f.id] = n.vl[f.id] || {x: 0, y: 0};
    n.vl[f.id].x = 0;
    n.vl[f.id].y = 0;
    n.p[f.id] = n.p[f.id] || {x: 0, y: 0};
    n.p[f.id].x = 0;
    n.p[f.id].y = 0;
  }

  get isIdle(): boolean {
    return this.idleCounter > 0;
  }

  private updateBodies() {
    this.eng.updateData(this.nodes);
  }

  setViewportSize(w: number, h: number, px: number, py: number) {
    this.vpBb.xmax = w / 2 - px;
    this.vpBb.xmin = -this.vpBb.xmax;
    this.vpBb.ymax = h / 2 - py;
    this.vpBb.ymin = -this.vpBb.ymax;
    this.vpEl.setHalfAxes({x: this.vpBb.xmax, y: this.vpBb.ymax});
  }

  addForce(
    f: ForceBase<PerspectivePaletteBaseForceParams>,
    a: PerspectivePaletteForceAlphaSettings,
  ): this {
    this.forces.push(f);
    this.alphaSettings.set(f.id, a);
    return this;
  }

  clear() {
    this.idleCounter = 0;
    this.eng.updateData([]);
    this.forces.forEach((f) => f.clear());
    this.forces.splice(0, this.forces.length);
    this.nodes.splice(0, this.nodes.length);
    this.alphaSettings.clear();
  }

  initialize(newNodes: WordNode[]) {
    this.nodes = newNodes;
    this.updateBodies();
    this.forces.forEach((f) => f.initialize(this.nodes));
    this.reset();
  }

  findBody(node: WordNode): Body<WordNode> | undefined {
    return this.eng.findBody(node.id);
  }

  hasCollisions(): Boolean {
    this.eng.checkCollisions();
    return this.eng.collisionCount > 0;
  }

  reset() {
    this.idleCounter = 0;
    this.forces.forEach((f) => {
      const alphaInit = this.alphaSettings.get(f.id)?.alphaInit;
      this.alphas[f.id] = typeof alphaInit === 'number' ? alphaInit : 1;
      this.nodes.forEach((n) => {
        Simulation.resetNodeForce(n, f);
        for (const nf of Object.keys(n.vl)) {
          if (this.forces.findIndex((f) => f.id === nf) === -1) {
            delete n.vl[nf];
          }
        }
        for (const nf of Object.keys(n.p)) {
          if (this.forces.findIndex((f) => f.id === nf) === -1) {
            delete n.p[nf];
          }
        }
      });
    });
  }

  tick() {
    this.eng.checkCollisions();

    // Apply forces
    this.forces.forEach((f) => {
      const a = this.alphas[f.id];

      const aMin = this.alphaSettings.get(f.id)?.min || 0;
      if (f.enabled && a >= aMin) {
        f.apply(a, this.applyOpts);
      }
    });

    // Update nodes' totals and position
    let idling = 0;
    this.nodes.forEach((n) => {
      n.vlt.x = 0;
      n.vlt.y = 0;
      Object.values(n.vl).forEach((vl) => {
        n.vlt.x += vl.x;
        n.vlt.y += vl.y;

        // Velocity decay
        vl.x *= 1 - this.vDecay;
        vl.y *= 1 - this.vDecay;
      });

      n.pt.x = 0;
      n.pt.y = 0;
      Object.values(n.p).forEach((p) => {
        n.pt.x += p.x;
        n.pt.y += p.y;

        // Position change doesn't "carry over"
        p.x = 0;
        p.y = 0;
      });

      const dx = n.vlt.x + n.pt.x;
      const dy = n.vlt.y + n.pt.y;

      if (Math.abs(dx) < 0.05 && Math.abs(dy) < 0.05) {
        idling++;
      } else {
        n.pos.x += dx;
        n.pos.y += dy;
      }
      // NOTE: MinkowskiDiffEngine shares pos with nodes
      //       so there's no need to call updateShapePos().
      //       n.pos update above is enough.
    });
    if (idling >= this.nodes.length) {
      this.idleCounter++;
    }

    // Update alphas
    this.forces.forEach((f) => {
      const s = this.alphaSettings.get(f.id);
      if (s) {
        const aMin = s.min || 0;
        if (this.alphas[f.id] >= aMin) {
          this.alphas[f.id] += (s.target - this.alphas[f.id]) * s.decay;
        }
      }
    });
  }
}

export function forceSep(
  type: 'velocity' | 'position',
  p: PerspectivePaletteSeparationForceOpts,
): ForceSeparate {
  return new ForceSeparate(type, p);
}

export function forceKeepInVP(
  p: PerspectivePaletteKeepInVpForceOpts,
): ForceKeepInVP {
  return new ForceKeepInVP(p);
}
