// SPDX-License-Identifier: BSD-2-Clause
// Copyright (c) 2023, Jari Hämäläinen, Carita Kiili and Julie Coiro
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
  MinDistResult,
} from '@symcode-fi/minkowski-collision';
import {cloneDeep} from '@/utils';

// Word node data. Velocities and absolute position changes originated
// from D3 which was first tried in node positions and dropped later.
// D3's "force idea" remained for simulation that tries to separate
// nodes from each other and still keep all nodes inside given viewport.
export interface WordNode {
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

// Force alphas are used for node separation and "keep in viewport"
// force simulation.
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

interface ForceTrigger {
  type: 'time-before' | 'time-after';
  value: number;
  callback: (
    s: Simulation,
    f: BaseWordNodeDatumForce,
    t: number,
    alpha: number,
  ) => void;
}

interface PerspectivePaletteBaseForceOpts<
  T extends PerspectivePaletteBaseForceParams,
> {
  params: T;
  alpha: PerspectivePaletteForceAlphaSettings;
  triggers?: ForceTrigger[];
}

interface PerspectivePaletteSeparationForceOpts
  extends PerspectivePaletteBaseForceParams {
  outwardsOnly: boolean;
}

interface PerspectivePaletteKeepInVpForceOpts
  extends PerspectivePaletteBaseForceParams {
  ellipse?: boolean;
}

export interface PerspectivePaletteProps {
  words: Record<string, string[]>;
  locale: string;
  size: 'l' | 'm' | 's' | 'scaling' | 'none';
  shapePadding?: Vec2;
  viewportPadding?: Vec2;
  shapePolyVertexCount: number;
  sepConstantAspectRatio?: number;
  sepAutoViewportAspectRatio?: boolean;
}

export type PerspectivePaletteOpts = PartialDeep<
  Omit<PerspectivePaletteProps, 'words' | 'locale' | 'size'>
>;

export const perspectivePaletteDefaultOpts: Required<
  Omit<PerspectivePaletteProps, 'words' | 'locale' | 'size'>
> = {
  shapePadding: {
    x: 25,
    y: 25,
  },
  viewportPadding: {
    x: 3,
    y: 3,
  },
  shapePolyVertexCount: 12,
  sepConstantAspectRatio: 1.35,
  sepAutoViewportAspectRatio: true,
} as const;

export default function usePerspectivePalette(
  words: Record<string, string[]>,
  locale: string,
  size: 'l' | 'm' | 's' | 'scaling' | 'none',
  opts?: PerspectivePaletteOpts,
): Ref<Required<PerspectivePaletteProps>> {
  const o = merge<
    {},
    Required<Omit<PerspectivePaletteProps, 'words' | 'locale' | 'size'>>,
    PerspectivePaletteOpts | undefined
  >(Object.create(null), perspectivePaletteDefaultOpts, opts);

  return ref({
    words,
    locale,
    size,
    ...o,
  });
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

type BaseWordNodeDatumForce =
  ForceBase<PerspectivePaletteBaseForceParams>;

class ForceSeparate extends ForceBase<PerspectivePaletteSeparationForceOpts> {
  // Reusable temp vectors.
  private t1: Vec2 = {x: 0, y: 0};
  private t2: Vec2 = {x: 0, y: 0};
  private t3: Vec2 = {x: 0, y: 0};
  constructor(
    private readonly type: 'velocity' | 'position',
    p: PerspectivePaletteSeparationForceOpts,
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

class ForceKeepInVP extends ForceBase<PerspectivePaletteKeepInVpForceOpts> {
  // Reusable temp bounding box
  private t1: BoundingBox = {
    xmin: 0,
    xmax: 0,
    ymin: 0,
    ymax: 0,
  };
  // Reusable temp reference to a vector
  private t2: Vec2Ref = {ref: 0, x: 0, y: 0};
  constructor(
    p: PerspectivePaletteKeepInVpForceOpts,
    triggers?: ForceTrigger[],
  ) {
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

class Simulation {
  private nodes: WordNode[] = [];
  private bodies: Body<WordNode>[] = [];
  private data = new Map<string, {node: WordNode; body: Body<WordNode>}>();
  eng: MinkowskiDiffEngine<WordNode>;
  private forces: ForceBase<PerspectivePaletteBaseForceParams>[] = [];
  private alphas: ForceAlphas = {};
  private alphaSettings = new Map<
    string,
    PerspectivePaletteForceAlphaSettings
  >();
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

  get time(): number {
    return this.t;
  }

  get isIdle(): boolean {
    return this.idleCounter > 0;
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
    f: ForceBase<PerspectivePaletteBaseForceParams>,
    a: PerspectivePaletteForceAlphaSettings,
  ): this {
    this.forces.push(f);
    this.alphaSettings.set(f.id, a);
    return this;
  }

  clear() {
    this.t = 0;
    this.idleCounter = 0;
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
    this.idleCounter = 0;
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
    opts?: Partial<Omit<PerspectivePaletteForceAlphaSettings, 'alphaInit'>>,
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
      //       so there's no need to call updateShapePos()
      // if (n.body) Body.translate(n.body, {x: dx, y: dy});
      // this.eng.updateShapePos(n.id, dx, dy);
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

      // Run after triggers
      f.execTriggersTimeAfter(this, this.t, this.alphas[f.id]);
    });

    this.t++;
  }
}

function forceSep(
  type: 'velocity' | 'position',
  p: PerspectivePaletteSeparationForceOpts,
  triggers?: ForceTrigger[],
): ForceSeparate {
  return new ForceSeparate(type, p, triggers);
}

function forceKeepInVP(
  p: PerspectivePaletteKeepInVpForceOpts,
  triggers?: ForceTrigger[],
): ForceKeepInVP {
  return new ForceKeepInVP(p, triggers);
}

interface NodePositioningOpts {
  viewportPadding?: Vec2;
  fSepV?: PerspectivePaletteBaseForceOpts<PerspectivePaletteSeparationForceOpts>;
  fSepV2?: PerspectivePaletteBaseForceOpts<PerspectivePaletteSeparationForceOpts>;
  fSepP?: PerspectivePaletteBaseForceOpts<PerspectivePaletteSeparationForceOpts>;
  fSepP2?: PerspectivePaletteBaseForceOpts<PerspectivePaletteSeparationForceOpts>;
  fKeepInVp?: PerspectivePaletteBaseForceOpts<PerspectivePaletteKeepInVpForceOpts>;
  sepConstantAspectRatio?: number;
  sepAutoViewportAspectRatio?: boolean;
}

export const nodePositioningDefaultOpts: Required<NodePositioningOpts> = {
  viewportPadding: {
    x: 3,
    y: 3,
  },
  fSepV: {
    params: {
      enabled: true,
      strength: 20,
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
      strength: 30,
      outwardsOnly: false,
      aspectRatio: 1,
    },
    alpha: {
      target: 0,
      decay: 0.2,
      min: 0.001,
    },
  },
  fSepP: {
    params: {
      enabled: true,
      strength: 10,
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
      enabled: true,
      strength: 30,
      outwardsOnly: false,
      aspectRatio: 1,
    },
    alpha: {
      target: 0,
      decay: 0.2,
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
  sepConstantAspectRatio: 1.35,
  sepAutoViewportAspectRatio: true,
} as const;

export interface MsgNodePositionCompute {
  msgName: 'MsgNodePositionCompute';
  nodes: WordNode[];
  vpWidth: number;
  vpHeight: number;
}
export interface MsgNodePositionResult {
  msgName: 'MsgNodePositionResult';
  nodes: WordNode[];
}
export type MsgNodePosition = MsgNodePositionCompute | MsgNodePositionResult;

export const isMsgNodePositionCompute = (
  o: any,
): o is MessageEvent<MsgNodePositionCompute> =>
  !!o &&
  typeof o === 'object' &&
  o.type === 'message' &&
  !!o.data &&
  typeof o.data === 'object' &&
  o.data.msgName === 'MsgNodePositionCompute' &&
  Array.isArray(o.data.nodes) &&
  typeof o.data.vpWidth === 'number' &&
  typeof o.data.vpHeight === 'number';

export const isMsgNodePositionResult = (
  o: any,
): o is MessageEvent<MsgNodePositionResult> =>
  !!o &&
  typeof o === 'object' &&
  o.type === 'message' &&
  !!o.data &&
  typeof o.data === 'object' &&
  o.data.msgName === 'MsgNodePositionResult' &&
  Array.isArray(o.data.nodes);

export class NodePositioning {
  private fSepV: ForceSeparate;
  private fSepV2: ForceSeparate;
  private fSepP: ForceSeparate;
  private fSepP2: ForceSeparate;
  private fKeepInVp: ForceKeepInVP;
  private sepForces: ForceSeparate[];
  private sim = new Simulation();

  private opts: Required<NodePositioningOpts>;

  constructor(opts?: NodePositioningOpts) {
    this.opts = merge<
      {},
      Required<NodePositioningOpts>,
      NodePositioningOpts | undefined
    >(Object.create(null), nodePositioningDefaultOpts, opts);

    this.fSepV = forceSep('velocity', this.opts.fSepV.params);
    this.fSepV2 = forceSep('velocity', this.opts.fSepV2.params);
    this.fSepP = forceSep('position', this.opts.fSepP.params);
    this.fSepP2 = forceSep('position', this.opts.fSepP2.params);
    this.fKeepInVp = forceKeepInVP(this.opts.fKeepInVp.params);

    this.sepForces = [this.fSepV, this.fSepV2, this.fSepP, this.fSepP2];

    this.sim
      .addForce(this.fSepP, this.opts.fSepP.alpha)
      .addForce(this.fSepP2, this.opts.fSepP2.alpha)
      .addForce(this.fSepV, this.opts.fSepV.alpha)
      .addForce(this.fSepV2, this.opts.fSepV2.alpha)
      .addForce(this.fKeepInVp, this.opts.fKeepInVp.alpha);
  }

  dispose() {
    this.sim.clear();
  }

  positionNodes(nodes: WordNode[], width: number, height: number) {
    let nodeMaxWidth = Number.NEGATIVE_INFINITY;
    let nodeMaxHeight = Number.NEGATIVE_INFINITY;
    // Use half dims to find max dims
    nodes.forEach((n) => {
      if (n.h.x > nodeMaxWidth) nodeMaxWidth = n.h.x;
      if (n.h.y > nodeMaxWidth) nodeMaxHeight = n.h.y;
    });
    // Make half dims full ones
    nodeMaxWidth = Math.ceil(nodeMaxWidth * 2);
    nodeMaxHeight = Math.ceil(nodeMaxHeight * 2);

    const ap = this.opts.sepAutoViewportAspectRatio
      ? (width / height) * this.opts.sepConstantAspectRatio
      : this.opts.sepConstantAspectRatio;
    this.sepForces.forEach((sf) => sf.setAspectRatio(ap));

    this.sim.setViewportSize(
      width,
      height,
      this.opts.viewportPadding.x,
      this.opts.viewportPadding.y,
    );

    // Scale all to circle, use sy = y scaling factor (be sure to call updateDimensions() before this)
    const sy = width / height;
    const initNodes = nodes.map<WordNode>((n) => {
      const n2 = cloneDeep(n);
      n2.v.forEach((v) => (v.y *= sy));
      return n2;
    });

    // Start moving nodes to ellipse: Move each one from min safe distance
    // towards the origin. Move as close to origin as possible without hitting other nodes.
    // Try from multiple angles (48 different ones).
    const minSafeNodeDim = Math.max(nodeMaxWidth, nodeMaxHeight * sy) * 1.05;
    let minSafeDist = minSafeNodeDim;
    const t1: Vec2 = {x: 0, y: 0};
    const t2: Vec2 = {x: 0, y: 0};
    const closest: Vec2 = {x: 0, y: 0};
    const zero: Vec2 = {x: 0, y: 0};
    const mdr: MinDistResult = {d: 0, v1i: 0, v2i: 0, minPoint: {x: 0, y: 0}};
    let ba: Body<WordNode>;
    const angleStep = (2 * Math.PI) / 48;
    let minD2: number;
    // farthest vertex distance^2 from origin
    let maxD2 = Number.NEGATIVE_INFINITY;
    const simNodes: WordNode[] = [];

    initNodes.forEach((n, i) => {
      simNodes.push(n);
      this.sim.initialize(simNodes);
      ba = this.sim.findBody(n)!;
      if (i == 0) {
        // Shortcut for the first one: Jump to origin, or a bit off it
        n.pos.x = 15;
        n.pos.y = 15;
      } else {
        minD2 = Number.POSITIVE_INFINITY;
        for (let a = 0; a < 2 * Math.PI; a += angleStep) {
          // Binary search for closest possible positions from this angle
          // Initial position
          n.pos.x = minSafeDist * Math.cos(a);
          n.pos.y = minSafeDist * Math.sin(a);
          // binary search step vector
          t1.x = n.pos.x;
          t1.y = n.pos.y;
          // step vector multiplier
          let m = -0.5;
          // last known good position
          t2.x = n.pos.x;
          t2.y = n.pos.y;

          let wasHit = false;
          while (Math.abs(t1.x) > 0.8 || Math.abs(t1.y) > 0.8) {
            t1.x *= m;
            t1.y *= m;
            m = 0.5;
            n.pos.x += t1.x;
            n.pos.y += t1.y;

            this.sim.eng.checkBodyCollision(ba, true);
            const hit = this.sim.eng.collisionCount > 0;
            if (!hit) {
              t2.x = n.pos.x;
              t2.y = n.pos.y;
            }

            // If hit status changed, turn around
            if (wasHit != hit) {
              m = -0.5;
              wasHit = hit;
            }
          }
          // Set to last known good location
          n.pos.x = t2.x;
          n.pos.y = t2.y;

          // Record min dist to origin
          this.sim.eng.pointToBodyMinDist(
            zero,
            this.sim.eng.findBody(n.id)!,
            mdr,
          );
          if (mdr.d < minD2) {
            minD2 = mdr.d;
            closest.x = n.pos.x;
            closest.y = n.pos.y;
          }
        }

        // Use the position that was closest to origin
        n.pos.x = closest.x;
        n.pos.y = closest.y;
      }

      // Update min safe dist: vertex farthest from origin + minSafeNodeDim
      let updateMinSafeDist = false;
      n.v.forEach((v) => {
        t1.x = n.pos.x + v.x;
        t1.y = n.pos.y + v.y;
        const d2 = t1.x * t1.x + t1.y * t1.y;
        if (d2 > maxD2) {
          maxD2 = d2;
          updateMinSafeDist = true;
        }
      });
      if (updateMinSafeDist) {
        minSafeDist = Math.sqrt(maxD2) + minSafeNodeDim;
      }
    });

    // Center nodes by "full bounding box" (surrounding every node)
    t1.x = Number.POSITIVE_INFINITY;
    t1.y = Number.POSITIVE_INFINITY;
    t2.x = Number.NEGATIVE_INFINITY;
    t2.y = Number.NEGATIVE_INFINITY;
    initNodes.forEach((n) => {
      if (n.pos.x < t1.x) t1.x = n.pos.x;
      if (n.pos.x > t2.x) t2.x = n.pos.x;
      if (n.pos.y < t1.y) t1.y = n.pos.y;
      if (n.pos.y > t2.y) t2.y = n.pos.y;
    });
    t1.x = (t1.x + t2.x) / 2;
    t1.y = (t1.y + t2.y) / 2;
    maxD2 = Number.NEGATIVE_INFINITY;
    initNodes.forEach((n) => {
      n.pos.x -= t1.x;
      n.pos.y -= t1.y;
      const d2 = n.pos.x * n.pos.x + n.pos.y * n.pos.y;
      if (d2 > maxD2) maxD2 = d2;
    });

    // Scale up if possible
    const d = Math.sqrt(maxD2);
    const hw = width / 2 - this.opts.viewportPadding.x;
    const f = hw / d;
    if (f > 1) {
      initNodes.forEach((n) => {
        n.pos.x *= f;
        n.pos.y *= f;
      });
    }

    // Scale positions back to match ellipse
    for (let i = 0; i < nodes.length; i++) {
      const nInit = initNodes[i];
      const n = nodes[i];
      n.pos.x = nInit.pos.x;
      n.pos.y = nInit.pos.y / sy;
    }

    // Few sim rounds to ensure positions are good
    this.sim.initialize(nodes);
    for (let i = 0; i < 80; i++) {
      this.sim.tick();
      if (this.sim.isIdle) {
        break;
      }
    }
    this.sim.reset();
  }
}
