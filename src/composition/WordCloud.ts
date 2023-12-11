// SPDX-License-Identifier: BSD-2-Clause
// Copyright (c) 2022, Jari Hämäläinen, Carita Kiili and Julie Coiro
import * as d3 from 'd3';
import {ref} from 'vue';
import type {Ref} from 'vue';
import type {PartialDeep} from 'type-fest';
import merge from 'lodash.merge';
import {Ellipse, Vec2Ref, ellipse2poly, vec2Pow2Sum} from '@/lib/math-utils';
import {
  type Body,
  type BoundingBox,
  MinkowskiDiffEngine,
  type Vec2,
} from '@symcode-fi/minkowski-collision';

export interface WordNode extends d3.SimulationNodeDatum {
  id: string;
  index: number;
  word: string;
  // Center coordinates
  pos: Vec2;
  // Half width and height; and ellipse radii (note: ellipse is approximated)
  h: Vec2;
  // Velocities created by forces
  vl: Record<string, Vec2>;
  // Total velocity
  vlt: Vec2;
  // Absolute position changes created by "forces"
  p: Record<string, Vec2>;
  // Total absolute position change
  pt: Vec2;
  // Ellipse approximation vertices
  v: Vec2[];
}

export type ForceAlphas = Record<string, number>;

export interface SimData {
  alphas: ForceAlphas;
}

export interface WordCloudForceAlphaSettings {
  target: number;
  decay: number;
  min: number;
  alphaInit?: number;
}

export interface WordCloudBaseForceParams {
  enabled: boolean;
  strength: number;
  // Force "aspect ratio: x/y". 1 = apply equally, > 1 = apply more on x-axis
  aspectRatio: number;
}

export interface ForceTrigger {
  type: 'time-before' | 'time-after';
  value: number;
  callback: (
    s: Simulation,
    f: BaseWordNodeDatumForce,
    t: number,
    alpha: number,
  ) => void;
}

export interface WordCloudBaseForceOpts<T extends WordCloudBaseForceParams> {
  params: T;
  alpha: WordCloudForceAlphaSettings;
  triggers?: ForceTrigger[];
}

export interface WordCloudSeparationForceOpts extends WordCloudBaseForceParams {
  outwardsOnly: boolean;
}

export interface WordCloudKeepInVpForceOpts extends WordCloudBaseForceParams {
  ellipse?: boolean;
}

// NOTE: because Vue doesn't support importing props interface until 3.3
//       WordCloudProps if defined in files:
//       - src/composition/WordCloud.ts
//       - src/components/WordCloud.vue
interface WordCloudProps {
  words: string[];
  shapePadding?: Vec2;
  viewportPadding?: Vec2;
  shapePolyVertexCount: number;
  simulation?: {
    run: boolean;
    breakPoint: number | null;
  };
  debugInfo?: {
    hideAll: boolean;
    showCollRectangle: boolean;
    showCollEllipse: boolean;
    showCollPolygon: boolean;
  };
  fGravity?: WordCloudBaseForceOpts<WordCloudBaseForceParams>;
  fGravity2?: WordCloudBaseForceOpts<WordCloudBaseForceParams>;
  fSepV?: WordCloudBaseForceOpts<WordCloudSeparationForceOpts>;
  fSepV2?: WordCloudBaseForceOpts<WordCloudSeparationForceOpts>;
  fSepP?: WordCloudBaseForceOpts<WordCloudSeparationForceOpts>;
  fSepP2?: WordCloudBaseForceOpts<WordCloudSeparationForceOpts>;
  fKeepInVp?: WordCloudBaseForceOpts<WordCloudKeepInVpForceOpts>;
}

export type WordCloudOpts = PartialDeep<Omit<WordCloudProps, 'words'>>;

export const wordCloudDefaultOpts: Required<Omit<WordCloudProps, 'words'>> = {
  shapePadding: {
    x: 25,
    y: 25,
  },
  viewportPadding: {
    x: 3,
    y: 3,
  },
  shapePolyVertexCount: 12,
  simulation: {
    run: false,
    breakPoint: null,
  },
  debugInfo: {
    hideAll: false,
    showCollRectangle: false,
    showCollEllipse: false,
    showCollPolygon: false,
  },
  fGravity: {
    params: {enabled: true, strength: 1, aspectRatio: 1},
    alpha: {
      target: 0,
      decay: 0.0228,
      min: 0.001,
    },
  },
  fGravity2: {
    params: {enabled: false, strength: 1, aspectRatio: 1},
    alpha: {
      target: 0,
      decay: 0.0228,
      min: 0.001,
    },
  },
  fSepV: {
    params: {
      enabled: true,
      strength: 1,
      outwardsOnly: false,
      aspectRatio: 1,
    },
    alpha: {
      target: 0,
      decay: 0.0228,
      min: 0.001,
    },
  },
  fSepV2: {
    params: {
      enabled: true,
      strength: 1,
      outwardsOnly: false,
      aspectRatio: 1,
    },
    alpha: {
      target: 0,
      decay: 0.0228,
      min: 0.001,
    },
  },
  fSepP: {
    params: {
      enabled: false,
      strength: 1,
      outwardsOnly: false,
      aspectRatio: 1,
    },
    alpha: {
      target: 0,
      decay: 0.0228,
      min: 0.001,
    },
  },
  fSepP2: {
    params: {
      enabled: false,
      strength: 1,
      outwardsOnly: false,
      aspectRatio: 1,
    },
    alpha: {
      target: 0,
      decay: 0.0228,
      min: 0.001,
    },
  },
  fKeepInVp: {
    params: {enabled: true, strength: 1, aspectRatio: 1, ellipse: true},
    alpha: {
      target: 0,
      decay: 0.0228,
      min: 0.001,
    },
  },
} as const;

export default function useWordCloud(
  words: string[],
  opts?: WordCloudOpts,
): Ref<Required<WordCloudProps>> {
  const o = merge<
    {},
    Required<Omit<WordCloudProps, 'words'>>,
    WordCloudOpts | undefined
  >(Object.create(null), wordCloudDefaultOpts, opts);

  return ref({
    words,
    ...o,
  });
}

interface BaseForceApplyOpts {
  eng: MinkowskiDiffEngine<WordNode>;
  vpBb: BoundingBox;
  vpEl: Ellipse;
}

let forceCounter = 0;
export abstract class ForceBase<T extends WordCloudBaseForceParams> {
  readonly id = `force-${forceCounter++}`;
  protected nodes: WordNode[] = [];

  private readonly trgTimeBefore: ForceTrigger[];
  private trgTimeBeforeIndex = 0;
  private readonly trgTimeAfter: ForceTrigger[];
  private trgTimeAfterIndex = 0;

  constructor(
    protected readonly p: T,
    triggers?: ForceTrigger[],
  ) {
    if (!triggers) {
      this.trgTimeBefore = [];
      this.trgTimeAfter = [];
    } else {
      this.trgTimeBefore = triggers
        .filter((t) => t.type == 'time-before')
        .sort((t1, t2) => t1.value - t2.value);
      this.trgTimeAfter = triggers
        .filter((t) => t.type == 'time-after')
        .sort((t1, t2) => t1.value - t2.value);
    }
  }

  abstract apply(alpha: number, t: number, opts: BaseForceApplyOpts): void;

  get enabled(): boolean {
    return this.p.enabled;
  }

  execTriggersTimeBefore(s: Simulation, t: number, alpha: number) {
    while (
      this.trgTimeBefore[this.trgTimeBeforeIndex] &&
      this.trgTimeBefore[this.trgTimeBeforeIndex].value === t
    ) {
      this.trgTimeBefore[this.trgTimeBeforeIndex++].callback(s, this, t, alpha);
    }
  }

  execTriggersTimeAfter(s: Simulation, t: number, alpha: number) {
    while (
      this.trgTimeAfter[this.trgTimeAfterIndex] &&
      this.trgTimeAfter[this.trgTimeAfterIndex].value === t
    ) {
      this.trgTimeAfter[this.trgTimeAfterIndex++].callback(s, this, t, alpha);
    }
  }

  resetTriggers() {
    this.trgTimeBeforeIndex = 0;
    this.trgTimeAfterIndex = 0;
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

export type BaseWordNodeDatumForce = ForceBase<WordCloudBaseForceParams>;

// Not exactly gravity, it just pulls node towards the origin.
export class ForceGravity extends ForceBase<WordCloudBaseForceParams> {
  // Reusable temp vector.
  private t1: Vec2 = {x: 0, y: 0};
  apply(alpha: number, _t: number) {
    for (let i = 0; i < this.nodes.length - 1; i++) {
      const n = this.nodes[i];
      // Math.max to prevent division by zero
      const d = Math.max(Math.sqrt(n.pos.x * n.pos.x + n.pos.y * n.pos.y), 1);
      const vl = n.vl[this.id];
      this.t1.x = (n.pos.x / d) * alpha * -this.p.strength;
      this.t1.y = (n.pos.y / d) * alpha * -this.p.strength;

      vl.x += this.t1.x;
      vl.y += this.t1.y;
    }
  }
}

export class ForceSepWordNodeDatum extends ForceBase<WordCloudSeparationForceOpts> {
  // Reusable temp vectors.
  private t1: Vec2 = {x: 0, y: 0};
  private t2: Vec2 = {x: 0, y: 0};
  private t3: Vec2 = {x: 0, y: 0};
  constructor(
    private readonly type: 'velocity' | 'position',
    p: WordCloudSeparationForceOpts,
    triggers?: ForceTrigger[],
  ) {
    super(p, triggers);
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

  apply(alpha: number, t: number, opts: BaseForceApplyOpts) {
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

export class ForceKeepInVP extends ForceBase<WordCloudKeepInVpForceOpts> {
  // Reusable temp bounding box
  private t1: BoundingBox = {
    xmin: 0,
    xmax: 0,
    ymin: 0,
    ymax: 0,
  };
  // Reusable temp reference to a vector
  private t2: Vec2Ref = {ref: 0, x: 0, y: 0};
  constructor(p: WordCloudKeepInVpForceOpts, triggers?: ForceTrigger[]) {
    super(p, triggers);
  }

  apply(alpha: number, t: number, opts: BaseForceApplyOpts) {
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
          // TODO: calculate how much to cut off
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

export class Simulation {
  private nodes: WordNode[] = [];
  private bodies: Body<WordNode>[] = [];
  private data = new Map<string, {node: WordNode; body: Body<WordNode>}>();
  eng: MinkowskiDiffEngine<WordNode>;
  private forces: ForceBase<WordCloudBaseForceParams>[] = [];
  private alphas: ForceAlphas = {};
  private alphaSettings = new Map<string, WordCloudForceAlphaSettings>();
  private t = 0;
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

  constructor(private debugPolys: Vec2[][]) {
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
    f: ForceBase<WordCloudBaseForceParams>,
  ) {
    n.vl[f.id] = n.vl[f.id] || {x: 0, y: 0};
    n.vl[f.id].x = 0;
    n.vl[f.id].y = 0;
    n.p[f.id] = n.p[f.id] || {x: 0, y: 0};
    n.p[f.id].x = 0;
    n.p[f.id].y = 0;
  }

  get time(): number {
    return this.t;
  }

  get forceAlphas(): ForceAlphas {
    return {...this.alphas};
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
    f: ForceBase<WordCloudBaseForceParams>,
    a: WordCloudForceAlphaSettings,
  ): this {
    this.forces.push(f);
    this.alphaSettings.set(f.id, a);
    return this;
  }

  clear() {
    this.t = 0;
    this.eng.updateData([]);
    this.forces.forEach((f) => f.clear());
    this.forces.splice(0, this.forces.length);
    this.nodes.splice(0, this.nodes.length);
    this.bodies.splice(0, this.bodies.length);
    this.data.clear();
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
    this.t = 0;
    this.forces.forEach((f) => {
      f.resetTriggers();
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

  setAlpha(
    force: BaseWordNodeDatumForce | string,
    alpha: number,
    opts?: Partial<Omit<WordCloudForceAlphaSettings, 'alphaInit'>>,
  ) {
    const id = typeof force === 'string' ? force : force.id;
    this.alphas[id] = alpha;
    if (opts) {
      const alphaSettings = this.alphaSettings.get(id);
      if (alphaSettings) {
        Object.assign(alphaSettings, opts);
      }
    }
  }

  tick() {
    this.eng.checkCollisions();

    // Apply forces
    this.forces.forEach((f) => {
      const a = this.alphas[f.id];

      // Run before triggers
      f.execTriggersTimeBefore(this, this.t, a);

      const aMin = this.alphaSettings.get(f.id)?.min || 0;
      if (f.enabled && a >= aMin) {
        f.apply(a, this.t, this.applyOpts);
      }
    });

    // Update nodes' totals and position
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

      n.pos.x += dx;
      n.pos.y += dy;
      // NOTE: MinkowskiDiffEngine shares pos with nodes
      //       so there's no need to call updateShapePos()
      // if (n.body) Body.translate(n.body, {x: dx, y: dy});
      // this.eng.updateShapePos(n.id, dx, dy);
    });

    // Update alphas
    this.forces.forEach((f) => {
      const s = this.alphaSettings.get(f.id);
      if (s) {
        const aMin = s.min || 0;
        if (this.alphas[f.id] >= aMin) {
          this.alphas[f.id] += (s.target - this.alphas[f.id]) * s.decay;
        }
      }

      // Run after triggers
      f.execTriggersTimeAfter(this, this.t, this.alphas[f.id]);
    });

    this.t++;
  }
}

export function forceGravity(
  p: WordCloudBaseForceParams,
  triggers?: ForceTrigger[],
): ForceGravity {
  return new ForceGravity(p, triggers);
}

export function forceSep(
  type: 'velocity' | 'position',
  p: WordCloudSeparationForceOpts,
  triggers?: ForceTrigger[],
): ForceSepWordNodeDatum {
  return new ForceSepWordNodeDatum(type, p, triggers);
}

export function forceKeepInVP(
  p: WordCloudKeepInVpForceOpts,
  triggers?: ForceTrigger[],
): ForceKeepInVP {
  return new ForceKeepInVP(p, triggers);
}
