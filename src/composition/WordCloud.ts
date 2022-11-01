// SPDX-License-Identifier: BSD-2-Clause
// Copyright (c) 2022, Jari Hämäläinen, Carita Kiili and Julie Coiro
import * as d3 from 'd3';
import Flatten from '@flatten-js/core';
import {ref} from 'vue';
import type {Ref} from 'vue';
import type {PartialDeep} from 'type-fest';
import merge from 'lodash.merge';
import {minVPolygon, minVRectangle, segmentNormalize} from '@/lib/math-utils';

export interface WordNodeDatum extends d3.SimulationNodeDatum {
  word: string;
  // Center coordinates
  x: number;
  y: number;
  // Ellipse radii
  rx: number;
  ry: number;
  // Total velocity
  vx: number;
  vy: number;
  // Velocities created by forces
  v: [number, number][];
  // Absolute position changes created by forces
  p: [number, number][];
  // Bounding box, including padding
  br: Flatten.Box;
  // Bounding ellipse approximation as a polygon, including padding
  be: Flatten.Polygon;
  // distances cache, updated before running forces (distance, normalized segment, segment)
  cDist: [number, Flatten.Segment, Flatten.Segment][];
  // collision cache, updated before running forces
  cColl: boolean[];
}

export interface DebugLineDatum extends d3.SimulationNodeDatum {
  // start
  x: number;
  y: number;
  // end
  x2: number;
  y2: number;
  stroke: string;
  show?: boolean;
}

export type ForceAlphas = Record<string, number>;

export interface SimData {
  alphas: ForceAlphas;
}

export const wordCloudCollisionShapes = [
  'rectangle',
  'polygon',
  'ellipse',
] as const;
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
  fnAlpha: 'direct' | 'bell' | 'bump' | 'ccc^3' | 'sigmoid';
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
  px?: number;
  py?: number;
  simulation?: {
    run: boolean;
    breakPoint: number | null;
    ellipseVertexCount: number;
    alpha: WordCloudForceAlphaSettings;
  };
  debugInfo?: {
    hideAll: boolean;
    showCollRectangle: boolean;
    showCollEllipse: boolean;
    showCollPolygon: boolean;
    showLineDist: boolean;
    showSepV: boolean;
    showSepP: boolean;
    showSimInfo: boolean;
  };
  fCharge?: WordCloudBaseForceOpts<WordCloudBaseForceParams>;
  fX?: WordCloudBaseForceOpts<WordCloudCYForceParams>;
  fY?: WordCloudBaseForceOpts<WordCloudCYForceParams>;
  fSepV?: WordCloudBaseForceOpts<WordCloudSeparationForceOpts>;
  fSepP?: WordCloudBaseForceOpts<WordCloudSeparationForceOpts>;
  fKeepInVp?: WordCloudBaseForceOpts<WordCloudBaseForceParams>;
}

export type WordCloudOpts = PartialDeep<Omit<WordCloudProps, 'words'>>;

export const wordCloudDefaultOpts: Required<Omit<WordCloudProps, 'words'>> = {
  collisionShape: 'rectangle',
  px: 40,
  py: 40,
  simulation: {
    run: false,
    breakPoint: null,
    ellipseVertexCount: 10,
    alpha: {
      target: 0,
      decay: 0.0228,
      min: 0.001,
    },
  },
  debugInfo: {
    hideAll: false,
    showCollRectangle: false,
    showCollEllipse: false,
    showCollPolygon: false,
    showLineDist: false,
    showSepV: false,
    showSepP: false,
    showSimInfo: false,
  },
  fCharge: {
    params: {enabled: true, strength: 1},
    alpha: {
      target: 0,
      decay: 0.0228,
      min: 0.001,
    },
  },
  fX: {
    params: {enabled: true, strength: 1},
    alpha: {
      target: 0,
      decay: 0.0228,
      min: 0.001,
    },
  },
  fY: {
    params: {enabled: true, strength: 1},
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
      fnAlpha: 'sigmoid',
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
      fnAlpha: 'sigmoid',
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

function distWordNodeDatum(
  wd1: WordNodeDatum,
  wd2: WordNodeDatum,
  cs: WordCloudCollisionShape,
  collisionThreshold = 0.01,
  dMin = 0,
): [number, Flatten.Segment] {
  const [d, s] =
    cs === 'rectangle'
      ? minVRectangle(wd1.br, wd2.br)
      : minVPolygon(wd1.be, wd2.be);
  if (d < collisionThreshold && cs === 'ellipse') {
    // Overlap
    const nd = Math.max(d, dMin);
    const cs = new Flatten.Segment(
      new Flatten.Point(wd1.x, wd1.y),
      new Flatten.Point(wd2.x, wd2.y),
    );
    segmentNormalize(cs);
    return [nd, cs];
  }
  return [Math.max(d, dMin), s];
}

export abstract class ForceWordNodeDatum<T extends WordCloudBaseForceParams> {
  protected nodes: WordNodeDatum[] = [];

  constructor(
    protected readonly p: Ref<T>,
    private readonly cs: Ref<WordCloudCollisionShape>,
  ) {}
  abstract apply(
    alpha: number,
    t: number,
    fi: number,
    debugLines: DebugLineDatum[],
  ): void;
  abstract updateDebug(
    alpha: number,
    t: number,
    fi: number,
    debugLines: DebugLineDatum[],
  ): void;

  get enabled(): boolean {
    return this.p.value.enabled;
  }

  initialize(newNodes: WordNodeDatum[], random: () => number) {
    this.nodes = newNodes;
  }

  protected d(
    wd1: WordNodeDatum,
    wd2: WordNodeDatum,
    dMin = 1,
  ): [number, Flatten.Segment] {
    const [d, s] =
      this.cs.value === 'rectangle'
        ? minVRectangle(wd1.br, wd2.br)
        : minVPolygon(wd1.be, wd2.be);
    if (d < 0.01 && this.cs.value === 'ellipse') {
      // Overlap
      const nd = Math.max(d, dMin);
      const cs = new Flatten.Segment(
        new Flatten.Point(wd1.x, wd1.y),
        new Flatten.Point(wd2.x, wd2.y),
      );
      segmentNormalize(cs);
      return [nd, cs];
    }
    return [Math.max(d, dMin), s];
  }
}
export type BaseWordNodeDatumForce =
  ForceWordNodeDatum<WordCloudBaseForceParams>;

export class ForceChargeWordNodeDatum extends ForceWordNodeDatum<WordCloudBaseForceParams> {
  apply(alpha: number, t: number, fi: number, debugLines: DebugLineDatum[]) {
    for (let i = 0; i < this.nodes.length - 1; i++) {
      const wd1 = this.nodes[i];
      const v1 = wd1.v[fi];
      for (let j = i + 1; j < this.nodes.length; j++) {
        const wd2 = this.nodes[j];
        const v2 = wd2.v[fi];
        // const [d, s] = this.d(wd1, wd2);
        // segmentNormalize(s);
        const [dn, s] = wd1.cDist[j];
        const d = Math.max(1, dn);

        const fx =
          (alpha * (this.p.value.strength * (s.end.x - s.start.x))) / (d * d);
        const fy =
          (alpha * (this.p.value.strength * (s.end.y - s.start.y))) / (d * d);

        v1[0] += fx;
        v1[1] += fy;
        v2[0] -= fx;
        v2[1] -= fy;
      }
    }
  }

  updateDebug(
    alpha: number,
    t: number,
    fi: number,
    debugLines: DebugLineDatum[],
  ) {
    for (let i = 0; i < this.nodes.length - 1; i++) {
      const wd1 = this.nodes[i];
      for (let j = i + 1; j < this.nodes.length; j++) {
        const wd2 = this.nodes[j];
        // const [d, s] = this.d(wd1, wd2);
        const [_, __, s] = wd1.cDist[j];

        const l = debugLines[i + j * this.nodes.length];
        l.x = s.start.x;
        l.y = s.start.y;
        l.x2 = s.end.x;
        l.y2 = s.end.y;
        l.show = true;
      }
    }
  }
}
export class ForceXYWordNodeDatum extends ForceWordNodeDatum<WordCloudCYForceParams> {
  private readonly calcX: boolean;
  private readonly calcY: boolean;
  private readonly tx: number;
  private readonly ty: number;

  constructor(
    p: Ref<WordCloudCYForceParams>,
    cs: Ref<WordCloudCollisionShape>,
  ) {
    super(p, cs);
    this.calcX =
      typeof this.p.value.x === 'number' && Number.isFinite(this.p.value.x);
    this.tx = this.p.value.x || 0;
    this.calcY =
      typeof this.p.value.y === 'number' && Number.isFinite(this.p.value.y);
    this.ty = this.p.value.x || 0;
  }

  apply(alpha: number, t: number, fi: number, debugLines: DebugLineDatum[]) {
    for (let i = 0; i < this.nodes.length; i++) {
      const wd1 = this.nodes[i];
      const v1 = wd1.v[fi];
      // https://www.wolframalpha.com/input?i=plot+0.5%2F%281%2B2%5E%28-0.1x+%2B+10%29%29+from+-10+to+150
      // const dv = (alpha * 0.5) / (1 + Math.pow(2, 0.1 * Math.abs(d) + 10));
      if (this.calcX) {
        const d = this.tx - wd1.x;
        const dv =
          this.p.value.strength *
          alpha *
          Math.log10(Math.abs(0.1 * d) + 1) *
          Math.sign(d);
        v1[0] += dv;
      }
      if (this.calcY) {
        const d = this.ty - wd1.y;
        const dv =
          this.p.value.strength *
          alpha *
          Math.log10(Math.abs(0.1 * d) + 1) *
          Math.sign(d);
        v1[1] += dv || 0;
      }
    }
  }

  updateDebug(
    alpha: number,
    t: number,
    fi: number,
    debugLines: DebugLineDatum[],
  ) {}
}
export class ForceSepWordNodeDatum extends ForceWordNodeDatum<WordCloudSeparationForceOpts> {
  constructor(
    private readonly type: 'velocity' | 'position',
    p: Ref<WordCloudSeparationForceOpts>,
    cs: Ref<WordCloudCollisionShape>,
  ) {
    super(p, cs);
  }

  apply(alpha: number, t: number, fi: number, debugLines: DebugLineDatum[]) {
    for (let i = 0; i < this.nodes.length - 1; i++) {
      const wd1 = this.nodes[i];
      const v1 = wd1.v[fi];
      for (let j = i + 1; j < this.nodes.length; j++) {
        const wd2 = this.nodes[j];

        const c = wd1.cColl[j];
        if (!c) continue;

        const v2 = wd2.v[fi];

        const [dn, s] = wd1.cDist[j];
        const d = Math.max(1, dn);

        const dx = wd1.x - wd2.x;
        const dy = wd1.y - wd2.y;

        const outwardsX = Math.sign(wd1.x) === Math.sign(dx);
        const outwardsY = Math.sign(wd1.y) === Math.sign(dy);

        const tot = Math.abs(dx) / d + Math.abs(dy) / d;
        const mx = Math.abs(dx / d / tot);
        const my = Math.abs(dy / d / tot);
        const ff = (() => {
          if (this.p.value.fnAlpha === 'ccc^3') {
            return Math.min(Math.pow(t, 3), 30);
          } else if (this.p.value.fnAlpha === 'bell') {
            // Needs a bit of scaling (compared to 'ccc^3')
            return (
              10 *
              ((1 / (0.2 * Math.sqrt(2 * Math.PI))) *
                Math.pow(Math.E, -0.5 * Math.pow((2 * alpha - 1) / 2, 2)))
            );
          } else if (this.p.value.fnAlpha === 'bump') {
            // Needs a bit of scaling (compared to 'ccc^3')
            return alpha > 0.2 && alpha < 1
              ? Math.exp(1 / (1 - Math.pow(2.5 * (1 - alpha) - 1.5, 2))) * 2
              : 0;
          } else if (this.p.value.fnAlpha === 'sigmoid') {
            // Needs a bit of scaling (compared to 'ccc^3')
            return (1 / (1 + Math.pow(Math.E, -12 * (1 - alpha - 0.5)))) * 50;
          }
          // Needs a bit of scaling (compared to 'ccc^3')
          return alpha * 25;
        })();
        const f = (1 / (dx * dx + dy * dy)) * ff;
        const af = Math.max(c ? f : 0);

        const fx = this.p.value.strength * af * (mx * dx);
        const fy = this.p.value.strength * af * (my * dy);

        if (outwardsX || !this.p.value.outwardsOnly) {
          if (this.type === 'velocity') {
            v1[0] += fx;
            v2[0] -= fx;
          } else {
            wd1.x += fx;
            wd2.x -= fx;
          }
        }
        if (outwardsY || !this.p.value.outwardsOnly) {
          if (this.type === 'velocity') {
            v1[1] += fy;
            v2[1] -= fy;
          } else {
            wd1.y += fy;
            wd2.y -= fy;
          }
        }
      }
    }
  }

  updateDebug(
    alpha: number,
    t: number,
    fi: number,
    debugLines: DebugLineDatum[],
  ) {}
}

export interface ForceCombined extends d3.Force<WordNodeDatum, any> {
  beforeTick(): ForceCombined;
  add(
    f: BaseWordNodeDatumForce,
    p: WordCloudForceAlphaSettings,
    name: string,
  ): ForceCombined;
  t(): number;
  alpha(alpha: number): ForceCombined;
  debugLines(debugLines: DebugLineDatum[]): ForceCombined;
  updateDebug(): ForceCombined;
  alphas(): ForceAlphas;
  velocityDecay(vd: number): ForceCombined;
  running(): boolean;
  collisionShape(cs: WordCloudCollisionShape): ForceCombined;
}

interface ForceData {
  f: BaseWordNodeDatumForce;
  p: WordCloudForceAlphaSettings;
  alpha: number;
  name: string;
}

export function forceCombined(): ForceCombined {
  let nodes: WordNodeDatum[];
  let lines: DebugLineDatum[] = [];
  const forceData: ForceData[] = [];
  const collisionThreshold = 1;
  let t = 0;
  let vd = 0.4;
  let lastVd = 0;
  let running = true;
  let cs: WordCloudCollisionShape = 'rectangle';
  const fn: ForceCombined = function (alpha: number) {
    fn.beforeTick();

    let run = false;
    forceData.forEach((fd, fi) => {
      if (fd.alpha < fd.p.min || !fd.f.enabled) return;
      fd.f.apply(fd.alpha, t, fi, lines);
      fd.alpha += (fd.p.target - fd.alpha) * fd.p.decay;
      run = true;
    });
    running = run;
    t++;
    nodes.forEach((n) => {
      const tv = n.v.reduce(
        (prev, cur) => [cur[0] + prev[0], cur[1] + prev[1]],
        [0, 0],
      );
      n.vx = tv[0];
      n.vy = tv[1];
    });
  };
  fn.beforeTick = function () {
    for (let i = 0; i < nodes.length; i++) {
      const wd1 = nodes[i];

      // Velocity decay
      if (t > lastVd) {
        wd1.v.forEach((v) => {
          v[0] *= 1 - vd;
          v[1] *= 1 - vd;
        });
        lastVd = t;
      }

      // Distance + collision to self
      wd1.cDist[i] = [0, new Flatten.Segment(), new Flatten.Segment()];
      wd1.cColl[i] = true;

      // Distance + collision to others
      for (let j = i + 1; j < nodes.length; j++) {
        const wd2 = nodes[j];
        const [d, s] = distWordNodeDatum(wd1, wd2, cs);
        const ns = s.clone();
        segmentNormalize(ns);

        wd1.cDist[j][0] = d;
        wd1.cDist[j][1] = ns;
        wd1.cDist[j][2] = s;
        wd1.cColl[j] = d < collisionThreshold;

        wd2.cDist[i][0] = d;
        wd2.cDist[i][1] = ns.reverse();
        wd2.cDist[i][2] = s.reverse();
        wd2.cColl[i] = d < collisionThreshold;
      }
    }
    return this;
  };
  fn.add = function (
    this: ForceCombined,
    a: BaseWordNodeDatumForce,
    p: WordCloudForceAlphaSettings,
    name: string,
  ) {
    forceData.push({f: a, p, alpha: 1, name});
    return this;
  };
  fn.t = () => t;
  fn.alpha = function (alpha: number) {
    forceData.forEach((fd) => (fd.alpha = alpha));
    return this;
  };
  fn.debugLines = function (debugLines: DebugLineDatum[]) {
    lines = debugLines;
    return this;
  };
  fn.updateDebug = function () {
    fn.beforeTick();
    forceData.forEach((fd, fi) => {
      fd.f.updateDebug(fd.alpha, t, fi, lines);
    });
    return this;
  };
  fn.initialize = (newNodes: WordNodeDatum[], random: () => number) => {
    nodes = newNodes;
    forceData.forEach((force) => {
      force.f.initialize && force.f.initialize(nodes, random);
    });
    nodes.forEach((n) => {
      n.v = Array.from(Array(forceData.length).keys()).map(() => [0, 0]);
      n.p = Array.from(Array(forceData.length).keys()).map(() => [0, 0]);
    });
  };
  fn.alphas = () =>
    Object.fromEntries(
      forceData.map((fd, i) => [fd.name || `f-${i}`, fd.alpha]),
    );
  fn.velocityDecay = function (d: number) {
    vd = d;
    return this;
  };
  fn.running = () => running;
  fn.collisionShape = function (s: WordCloudCollisionShape) {
    cs = s;
    return this;
  };
  return fn;
}

export function forceCharge(
  p: Ref<WordCloudBaseForceParams>,
  cs: Ref<WordCloudCollisionShape>,
): ForceChargeWordNodeDatum {
  return new ForceChargeWordNodeDatum(p, cs);
}

export function forceXY(
  p: Ref<WordCloudCYForceParams>,
  cs: Ref<WordCloudCollisionShape>,
): ForceChargeWordNodeDatum {
  return new ForceXYWordNodeDatum(p, cs);
}

export function forceSep(
  type: 'velocity' | 'position',
  p: Ref<WordCloudSeparationForceOpts>,
  cs: Ref<WordCloudCollisionShape>,
): ForceChargeWordNodeDatum {
  return new ForceSepWordNodeDatum(type, p, cs);
}

export function time<T>(id: string, fn: () => T) {
  const t1 = performance.now();
  const r: T = fn();
  const t2 = performance.now();
  console.log(`time ${id}:`, t2 - t1);
  return r;
}
