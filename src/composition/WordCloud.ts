// SPDX-License-Identifier: BSD-2-Clause
// Copyright (c) 2022, Jari Hämäläinen, Carita Kiili and Julie Coiro
import * as d3 from 'd3';
import {ref} from 'vue';
import type {Ref} from 'vue';
import type {PartialDeep} from 'type-fest';
import merge from 'lodash.merge';
import {Body, Collision, Detector} from 'matter-js';
import {Vec2} from '@/lib/math-utils';

export interface WordNode extends d3.SimulationNodeDatum {
  id: string;
  word: string;
  // Center coordinates
  pos: Vec2;
  // Half width and height; and ellipse radii (note: ellipse is approximated)
  h: Vec2;
  // Velocities created by forces
  v: Record<string, Vec2>;
  // Total velocity
  vt: Vec2;
  // Absolute position changes created by "forces"
  p: Record<string, Vec2>;
  // Total absolute position change
  pt: Vec2;
  // Ellipse approximation vertices
  vertices: Vec2[];
  body?: Body;
}

export interface DebugLineDatum extends d3.SimulationNodeDatum {
  // start
  a: Vec2;
  // end
  b: Vec2;
  stroke: string;
  show?: boolean;
}

export type ForceAlphas = Record<string, number>;

export interface SimData {
  alphas: ForceAlphas;
}

export const wordCloudCollisionShapes = ['rectangle', 'polygon'] as const;
export type WordCloudCollisionShape = typeof wordCloudCollisionShapes[number];

export interface WordCloudForceAlphaSettings {
  target: number;
  decay: number;
  min: number;
}

export interface WordCloudBaseForceParams {
  enabled: boolean;
  strength: number;
}

export interface WordCloudBaseForceOpts<T extends WordCloudBaseForceParams> {
  params: T;
  alpha: WordCloudForceAlphaSettings;
}

export interface WordCloudSeparationForceOpts extends WordCloudBaseForceParams {
  outwardsOnly: boolean;
}

export interface WordCloudCYForceParams extends WordCloudBaseForceParams {
  x?: number | null;
  y?: number | null;
}

// NOTE: because Vue doesn't support importing props interface until 3.3
//       WordCloudProps if defined in files:
//       - src/composition/WordCloud.ts
//       - src/components/WordCloud.vue
interface WordCloudProps {
  words: string[];
  collisionShape?: WordCloudCollisionShape;
  shapePadding?: Vec2;
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
  fX?: WordCloudBaseForceOpts<WordCloudCYForceParams>;
  fY?: WordCloudBaseForceOpts<WordCloudCYForceParams>;
  fSepV?: WordCloudBaseForceOpts<WordCloudSeparationForceOpts>;
  fSepP?: WordCloudBaseForceOpts<WordCloudSeparationForceOpts>;
  fKeepInVp?: WordCloudBaseForceOpts<WordCloudBaseForceParams>;
}

export type WordCloudOpts = PartialDeep<Omit<WordCloudProps, 'words'>>;

export const wordCloudDefaultOpts: Required<Omit<WordCloudProps, 'words'>> = {
  collisionShape: 'rectangle',
  shapePadding: {
    x: 40,
    y: 40,
  },
  shapePolyVertexCount: 16,
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
    params: {enabled: false, strength: 1},
    alpha: {
      target: 0,
      decay: 0.0228,
      min: 0.001,
    },
  },
  fX: {
    params: {enabled: false, strength: 1},
    alpha: {
      target: 0,
      decay: 0.0228,
      min: 0.001,
    },
  },
  fY: {
    params: {enabled: false, strength: 1},
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
      outwardsOnly: true,
    },
    alpha: {
      target: 0,
      decay: 0.0228,
      min: 0.001,
    },
  },
  fSepP: {
    params: {
      enabled: true,
      strength: 1,
      outwardsOnly: true,
    },
    alpha: {
      target: 0,
      decay: 0.0228,
      min: 0.001,
    },
  },
  fKeepInVp: {
    params: {enabled: true, strength: 1},
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

let forceCounter = 0;
export abstract class ForceBase<T extends WordCloudBaseForceParams> {
  readonly id = `force-${forceCounter++}`;
  protected nodes: WordNode[] = [];

  constructor(
    protected readonly p: T,
    private readonly cs: Ref<WordCloudCollisionShape>,
  ) {}

  abstract apply(
    alpha: number,
    t: number,
    collisionData: Map<string, NodeCollisionData>,
  ): void;

  get enabled(): boolean {
    return this.p.enabled;
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

export class ForceGravity extends ForceBase<WordCloudBaseForceParams> {
  apply(alpha: number, t: number) {
    for (let i = 0; i < this.nodes.length - 1; i++) {
      const wd1 = this.nodes[i];
      // for (let j = i + 1; j < this.nodes.length; j++) {
      //   const wd2 = this.nodes[j];
      //   const v2 = wd2.v[fi];
      //   // const [d, s] = this.d(wd1, wd2);
      //   // segmentNormalize(s);
      //   const [dn, s] = wd1.cDist[j];
      //   const d = Math.max(1, dn);

      //   const fx =
      //     (alpha * (this.p.value.strength * (s.end.x - s.start.x))) / (d * d);
      //   const fy =
      //     (alpha * (this.p.value.strength * (s.end.y - s.start.y))) / (d * d);

      //   v1[0] += fx;
      //   v1[1] += fy;
      //   v2[0] -= fx;
      //   v2[1] -= fy;
      // }
    }
  }

  // updateDebug(
  //   alpha: number,
  //   t: number,
  //   fi: number,
  //   debugLines: DebugLineDatum[],
  // ) {
  //   // for (let i = 0; i < this.nodes.length - 1; i++) {
  //   //   const wd1 = this.nodes[i];
  //   //   for (let j = i + 1; j < this.nodes.length; j++) {
  //   //     const wd2 = this.nodes[j];
  //   //     // const [d, s] = this.d(wd1, wd2);
  //   //     const [_, __, s] = wd1.cDist[j];
  //   //     const l = debugLines[i + j * this.nodes.length];
  //   //     l.x = s.start.x;
  //   //     l.y = s.start.y;
  //   //     l.x2 = s.end.x;
  //   //     l.y2 = s.end.y;
  //   //     l.show = true;
  //   //   }
  //   // }
  // }
}
export class ForceXYWordNodeDatum extends ForceBase<WordCloudCYForceParams> {
  private readonly calcX: boolean;
  private readonly calcY: boolean;
  private readonly tx: number;
  private readonly ty: number;

  constructor(p: WordCloudCYForceParams, cs: Ref<WordCloudCollisionShape>) {
    super(p, cs);
    this.calcX = typeof this.p.x === 'number' && Number.isFinite(this.p.x);
    this.tx = this.p.x || 0;
    this.calcY = typeof this.p.y === 'number' && Number.isFinite(this.p.y);
    this.ty = this.p.x || 0;
  }

  apply(alpha: number, t: number) {
    for (let i = 0; i < this.nodes.length; i++) {
      const wd1 = this.nodes[i];
      // https://www.wolframalpha.com/input?i=plot+0.5%2F%281%2B2%5E%28-0.1x+%2B+10%29%29+from+-10+to+150
      // const dv = (alpha * 0.5) / (1 + Math.pow(2, 0.1 * Math.abs(d) + 10));
      const v = wd1.v[this.id];
      if (this.calcX) {
        const d = this.tx - wd1.pos.x;
        const dv =
          this.p.strength *
          alpha *
          Math.log10(Math.abs(0.1 * d) + 1) *
          Math.sign(d);
        v.x += dv;
      }
      if (this.calcY) {
        const d = this.ty - wd1.pos.y;
        const dv =
          this.p.strength *
          alpha *
          Math.log10(Math.abs(0.1 * d) + 1) *
          Math.sign(d);
        v.y += dv || 0;
      }
    }
  }
}

export class ForceSepWordNodeDatum extends ForceBase<WordCloudSeparationForceOpts> {
  constructor(
    private readonly type: 'velocity' | 'position',
    p: WordCloudSeparationForceOpts,
    cs: Ref<WordCloudCollisionShape>,
  ) {
    super(p, cs);
  }

  apply(
    alpha: number,
    t: number,
    collisionData: Map<string, NodeCollisionData>,
  ) {
    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      const vp = this.type === 'velocity' ? node.v[this.id] : node.p[this.id];
      const cd = collisionData.get(node.id);
      if (!cd || cd.collisions.length === 0) continue;

      cd.collisions.forEach((c) => {
        const str = this.p.strength / 100;
        const m = Math.max((alpha * str * c.depth) / 2, 1);
        if (c.bodyA.label === node.id) {
          vp.x += m * c.normal.x;
          vp.y += m * c.normal.y;
        } else {
          vp.x -= m * c.normal.x;
          vp.y -= m * c.normal.y;
        }
      });
    }
  }
}

export class ForceKeepInVP extends ForceBase<WordCloudBaseForceParams> {
  constructor(p: WordCloudBaseForceParams, cs: Ref<WordCloudCollisionShape>) {
    super(p, cs);
  }

  apply(
    alpha: number,
    t: number,
    collisionData: Map<string, NodeCollisionData>,
  ) {
    // This is a very special force: it'll "nullify" the effect of
    // other forces pushing node outside of the viewport. It should
    // be the last force applied.
    this.nodes.forEach((n) => {
      let dx = 0;
      let dy = 0;
      Object.entries(n.v).forEach(([id, v]) => {
        if (id !== this.id) {
          dx += v.x;
          dy += v.y;
        }
      });
      Object.entries(n.p).forEach(([id, p]) => {
        if (id !== this.id) {
          dx += p.x;
          dy += p.y;
        }
      });

      const newPos = {x: n.pos.x + dx, y: n.pos.y + dy};
    });
  }
}

interface ForceData {
  f: BaseWordNodeDatumForce;
  p: WordCloudForceAlphaSettings;
  alpha: number;
  name: string;
}

interface NodeCollisionData {
  // time of last update
  t: number;
  // Collisions of the node
  collisions: Collision[];
}

export class Simulation {
  private nodes: WordNode[] = [];
  private bodies: Body[] = [];
  private data = new Map<string, {node: WordNode; body: Body}>();
  private detector = Detector.create();
  private collisionData = new Map<string, NodeCollisionData>();
  private forces: ForceBase<WordCloudBaseForceParams>[] = [];
  private alphas: ForceAlphas = {};
  private alphaSettings = new Map<string, WordCloudForceAlphaSettings>();
  private t = 0;
  private vDecay = 0.4;

  private static resetNodeForce(
    n: WordNode,
    f: ForceBase<WordCloudBaseForceParams>,
  ) {
    n.v[f.id] = n.v[f.id] || {x: 0, y: 0};
    n.v[f.id].x = 0;
    n.v[f.id].y = 0;
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
    this.bodies.splice(0, this.bodies.length);
    this.data.clear();
    this.collisionData.clear();

    this.nodes.forEach((n) => {
      const body = Body.create({
        label: n.id,
        type: 'poly',
        position: {x: n.pos.x, y: n.pos.y},
        vertices: n.vertices.map((v) => ({x: v.x, y: v.y})),
      });
      this.bodies.push(body);
      this.data.set(n.id, {node: n, body});
      n.body = body;
    });
    Detector.clear(this.detector);
    Detector.setBodies(this.detector, this.bodies);
  }

  addForce(
    f: ForceBase<WordCloudBaseForceParams>,
    a: WordCloudForceAlphaSettings,
  ): this {
    this.forces.push(f);
    this.alphaSettings.set(f.id, a);
    // if (this.forces.length === 6) {
    //   setInterval(() => console.log(`sim fkeep alpha decay: ${a.decay}`), 1000);
    // }
    return this;
  }

  clear() {
    this.t = 0;
    Detector.clear(this.detector);
    this.forces.forEach((f) => f.clear());
    this.forces.splice(0, this.forces.length);
    this.nodes.splice(0, this.nodes.length);
    this.bodies.splice(0, this.bodies.length);
    this.data.clear();
    this.collisionData.clear();
    this.alphaSettings.clear();
  }

  initialize(newNodes: WordNode[]) {
    this.nodes = newNodes;
    this.updateBodies();
    this.forces.forEach((f) => f.initialize(this.nodes));
    this.reset();
  }

  reset() {
    this.t = 0;
    this.forces.forEach((f) => {
      this.alphas[f.id] = 1;
      this.nodes.forEach((n) => {
        Simulation.resetNodeForce(n, f);
        for (const nf of Object.keys(n.v)) {
          if (this.forces.findIndex((f) => f.id === nf) === -1) {
            delete n.v[nf];
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

  private updateCollisionData(coll: Collision, node: WordNode) {
    let cdata = this.collisionData.get(node.id);
    if (!cdata) {
      cdata = {
        t: this.t,
        collisions: [],
      };
      this.collisionData.set(node.id, cdata);
    } else if (cdata.t < this.t) {
      cdata.t = this.t;
      cdata.collisions.splice(0, cdata.collisions.length);
    }

    cdata.collisions.push(coll);
  }

  tick() {
    console.log('tick');
    // Update collisions
    const collisions = Detector.collisions(this.detector);
    collisions.forEach((c) => {
      if (!c.collided) return;

      let data = this.data.get(c.bodyA.label);
      if (data) this.updateCollisionData(c, data.node);
      data = this.data.get(c.bodyB.label);
      if (data) this.updateCollisionData(c, data.node);
    });
    for (const cdata of this.collisionData.values()) {
      if (cdata.t < this.t) {
        cdata.t = this.t;
        cdata.collisions.splice(0, cdata.collisions.length);
      }
    }

    // Apply forces
    this.forces.forEach((f) => {
      const a = this.alphas[f.id];
      const aMin = this.alphaSettings.get(f.id)?.min || 0;
      if (f.enabled && a >= aMin) {
        f.apply(a, this.t, this.collisionData);
      }
    });

    // Update nodes' totals and position
    this.nodes.forEach((n) => {
      n.vt.x = 0;
      n.vt.y = 0;
      Object.values(n.v).forEach((v) => {
        n.vt.x += v.x;
        n.vt.y += v.y;

        // Velocity decay
        v.x *= 1 - this.vDecay;
        v.y *= 1 - this.vDecay;
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

      const dx = n.vt.x + n.pt.x;
      const dy = n.vt.y + n.pt.y;

      n.pos.x += dx;
      n.pos.y += dy;
      if (n.body) Body.translate(n.body, {x: dx, y: dy});
    });

    // Update alphas
    this.forces.forEach((f) => {
      const s = this.alphaSettings.get(f.id);
      if (!s) return;

      const aMin = s.min || 0;
      if (this.alphas[f.id] < aMin) return;

      this.alphas[f.id] += (s.target - this.alphas[f.id]) * s.decay;
    });

    this.t++;
  }
}

// export function forceCombined(): ForceCombined {
//   let nodes: WordNode[];
//   let lines: DebugLineDatum[] = [];
//   const forceData: ForceData[] = [];
//   const collisionThreshold = 1;
//   let t = 0;
//   let vd = 0.4;
//   let lastVd = 0;
//   let running = true;
//   let cs: WordCloudCollisionShape = 'rectangle';
//   const fn: ForceCombined = function (alpha: number) {
//     fn.beforeTick();

//     let run = false;
//     forceData.forEach((fd, fi) => {
//       if (fd.alpha < fd.p.min || !fd.f.enabled) return;
//       fd.f.apply(fd.alpha, t, fi, lines);
//       fd.alpha += (fd.p.target - fd.alpha) * fd.p.decay;
//       run = true;
//     });
//     running = run;
//     t++;
//     nodes.forEach((n) => {
//       const tv = n.v.reduce(
//         (prev, cur) => [cur[0] + prev[0], cur[1] + prev[1]],
//         [0, 0],
//       );
//       n.vx = tv[0];
//       n.vy = tv[1];
//     });
//   };
//   fn.beforeTick = function () {
//     for (let i = 0; i < nodes.length; i++) {
//       const wd1 = nodes[i];

//       // Velocity decay
//       if (t > lastVd) {
//         wd1.v.forEach((v) => {
//           v[0] *= 1 - vd;
//           v[1] *= 1 - vd;
//         });
//         lastVd = t;
//       }

//       // Distance + collision to self
//       wd1.cDist[i] = [0, new Flatten.Segment(), new Flatten.Segment()];
//       wd1.cColl[i] = true;

//       // Distance + collision to others
//       for (let j = i + 1; j < nodes.length; j++) {
//         const wd2 = nodes[j];
//         const [d, s] = distWordNodeDatum(wd1, wd2, cs);
//         const ns = s.clone();
//         segmentNormalize(ns);

//         wd1.cDist[j][0] = d;
//         wd1.cDist[j][1] = ns;
//         wd1.cDist[j][2] = s;
//         wd1.cColl[j] = d < collisionThreshold;

//         wd2.cDist[i][0] = d;
//         wd2.cDist[i][1] = ns.reverse();
//         wd2.cDist[i][2] = s.reverse();
//         wd2.cColl[i] = d < collisionThreshold;
//       }
//     }
//     return this;
//   };
//   fn.add = function (
//     this: ForceCombined,
//     a: BaseWordNodeDatumForce,
//     p: WordCloudForceAlphaSettings,
//     name: string,
//   ) {
//     forceData.push({f: a, p, alpha: 1, name});
//     return this;
//   };
//   fn.t = () => t;
//   fn.alpha = function (alpha: number) {
//     forceData.forEach((fd) => (fd.alpha = alpha));
//     return this;
//   };
//   fn.debugLines = function (debugLines: DebugLineDatum[]) {
//     lines = debugLines;
//     return this;
//   };
//   fn.updateDebug = function () {
//     fn.beforeTick();
//     forceData.forEach((fd, fi) => {
//       fd.f.updateDebug(fd.alpha, t, fi, lines);
//     });
//     return this;
//   };
//   fn.initialize = (newNodes: WordNode[], random: () => number) => {
//     nodes = newNodes;
//     forceData.forEach((force) => {
//       force.f.initialize && force.f.initialize(nodes, random);
//     });
//     nodes.forEach((n) => {
//       n.v = Array.from(Array(forceData.length).keys()).map(() => [0, 0]);
//       n.p = Array.from(Array(forceData.length).keys()).map(() => [0, 0]);
//     });
//   };
//   fn.alphas = () =>
//     Object.fromEntries(
//       forceData.map((fd, i) => [fd.name || `f-${i}`, fd.alpha]),
//     );
//   fn.velocityDecay = function (d: number) {
//     vd = d;
//     return this;
//   };
//   fn.running = () => running;
//   fn.collisionShape = function (s: WordCloudCollisionShape) {
//     cs = s;
//     return this;
//   };
//   return fn;
// }

export function forceGravity(
  p: WordCloudBaseForceParams,
  cs: Ref<WordCloudCollisionShape>,
): ForceGravity {
  return new ForceGravity(p, cs);
}

export function forceXY(
  p: WordCloudCYForceParams,
  cs: Ref<WordCloudCollisionShape>,
): ForceXYWordNodeDatum {
  return new ForceXYWordNodeDatum(p, cs);
}

export function forceSep(
  type: 'velocity' | 'position',
  p: WordCloudSeparationForceOpts,
  cs: Ref<WordCloudCollisionShape>,
): ForceSepWordNodeDatum {
  return new ForceSepWordNodeDatum(type, p, cs);
}

export function forceKeepInVP(
  p: WordCloudBaseForceParams,
  cs: Ref<WordCloudCollisionShape>,
): ForceKeepInVP {
  // setInterval(() => console.log('ForceKeepInVP:this.enabled', p.enabled), 1000);
  // setInterval(() => console.log('ForceKeepInVP:this.strength', p.strength), 1000);
  return new ForceKeepInVP(p, cs);
}

export function time<T>(id: string, fn: () => T) {
  const t1 = performance.now();
  const r: T = fn();
  const t2 = performance.now();
  console.log(`time ${id}:`, t2 - t1);
  return r;
}
