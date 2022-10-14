// SPDX-License-Identifier: BSD-2-Clause
// Copyright (c) 2022, Jari Hämäläinen, Carita Kiili and Julie Coiro
import * as d3 from 'd3';
import Flatten from '@flatten-js/core';
import {ref} from 'vue';
import type {Ref} from 'vue';
import type {PartialDeep} from 'type-fest';
import merge from 'lodash.merge';

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
}

export const wordCloudCollisionShapes = ['rectangle', 'ellipse'] as const;
export type WordCloudCollisionShape = typeof wordCloudCollisionShapes[number];

export interface WordCloudForceAlphaSettings {
  target: number;
  decay: number;
  min: number;
}

export interface WordCloudBaseForceParams {
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
    showCollRectangle: boolean;
    showCollEllipse: boolean;
    showCollPolygon: boolean;
    showSepV: boolean;
    showSepP: boolean;
    showSimInfo: boolean;
  };
  fCharge?: WordCloudBaseForceOpts<WordCloudBaseForceParams>;
  fX?: WordCloudBaseForceOpts<WordCloudBaseForceParams>;
  fY?: WordCloudBaseForceOpts<WordCloudBaseForceParams>;
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
    showCollRectangle: false,
    showCollEllipse: false,
    showCollPolygon: false,
    showSepV: false,
    showSepP: false,
    showSimInfo: false,
  },
  fCharge: {
    params: {strength: 1},
    alpha: {
      target: 0,
      decay: 0.0228,
      min: 0.001,
    },
  },
  fX: {
    params: {strength: 1},
    alpha: {
      target: 0,
      decay: 0.0228,
      min: 0.001,
    },
  },
  fY: {
    params: {strength: 1},
    alpha: {
      target: 0,
      decay: 0.0228,
      min: 0.001,
    },
  },
  fSepV: {
    params: {
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
    params: {strength: 1},
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

export abstract class ForceWordNodeDatum<T extends WordCloudBaseForceParams> {
  protected nodes: WordNodeDatum[] = [];

  constructor(
    protected readonly p: Ref<T>,
    private readonly cs: Ref<WordCloudCollisionShape>,
  ) {}
  abstract apply(alpha: number, t: number, fi: number): void;

  initialize(newNodes: WordNodeDatum[], random: () => number) {
    this.nodes = newNodes;
  }

  protected d(wd1: WordNodeDatum, wd2: WordNodeDatum, dMin = 1): number {
    const d =
      this.cs.value === 'rectangle'
        ? this.dRectangle(wd1, wd2)
        : this.dEllipse(wd1, wd2);
    return Math.max(d, dMin);
  }

  private dRectangle(wd1: WordNodeDatum, wd2: WordNodeDatum): number {
    if (wd1.br.intersect(wd1.br)) return 0;
    wd1.br.toSegments()[0].ps.y
  }

  private dEllipse(wd1: WordNodeDatum, wd2: WordNodeDatum): number {}
}
export type BaseWordNodeDatumForce =
  ForceWordNodeDatum<WordCloudBaseForceParams>;

export class ForceChargeWordNodeDatum extends ForceWordNodeDatum<WordCloudBaseForceParams> {
  apply(alpha: number, t: number, fi: number) {
    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        const wd1 = this.nodes[i];
        const wd2 = this.nodes[j];
      }
    }
  }
}

export interface ForceCombined extends d3.Force<WordNodeDatum, any> {
  add(f: BaseWordNodeDatumForce, p: WordCloudForceAlphaSettings): ForceCombined;
  t(): number;
  alpha(alpha: number): ForceCombined;
}

interface ForceData {
  f: BaseWordNodeDatumForce;
  p: WordCloudForceAlphaSettings;
  alpha: number;
}

export function forceCombined(): ForceCombined {
  let nodes: WordNodeDatum[];
  const forceData: ForceData[] = [];
  let t = 0;
  const fn: ForceCombined = (alpha: number) => {
    forceData.forEach((fd, fi) => {
      if (fd.alpha < fd.p.min) return;
      fd.f.apply(fd.alpha, t, fi);
      fd.alpha += (fd.p.target - fd.alpha) * fd.p.decay;
    });
    t++;
  };
  fn.add = function (
    this: ForceCombined,
    a: BaseWordNodeDatumForce,
    p: WordCloudForceAlphaSettings,
  ) {
    forceData.push({f: a, p, alpha: 1});
    return this;
  };
  fn.t = () => t;
  fn.alpha = function (alpha: number) {
    forceData.forEach((fd) => (fd.alpha = alpha));
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

  return fn;
}

export function forceCharge(
  p: Ref<WordCloudBaseForceParams>,
  cs: Ref<WordCloudCollisionShape>,
): ForceChargeWordNodeDatum {
  return new ForceChargeWordNodeDatum(p, cs);
}
