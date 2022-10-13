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
  // Velocity
  vx: number;
  vy: number;
  // Bounding box, including padding
  br: Flatten.Box;
  // Bounding ellipse approximation as a polygon, including padding
  be: Flatten.Polygon;
}

export const wordCloudCollisionShapes = ['rectangle', 'ellipse'] as const;
export type WordCloudCollisionShape = typeof wordCloudCollisionShapes[number];

export interface WordCloudForceAlphaParams {
  target: number;
  decay: number;
  min: number;
}

export interface WordCloudBaseForceOpts {
  strength: number;
  alpha: WordCloudForceAlphaParams;
}

export interface WordCloudSeparationForceOpts extends WordCloudBaseForceOpts {
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
    alpha: WordCloudForceAlphaParams;
  };
  debugInfo?: {
    showCollRectangle: boolean;
    showCollEllipse: boolean;
    showCollPolygon: boolean;
    showSepV: boolean;
    showSepP: boolean;
    showSimInfo: boolean;
  };
  fCharge?: WordCloudBaseForceOpts;
  fX?: WordCloudBaseForceOpts;
  fY?: WordCloudBaseForceOpts;
  fSepV?: WordCloudSeparationForceOpts;
  fSepP?: WordCloudSeparationForceOpts;
  fKeepInVp?: WordCloudBaseForceOpts;
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
    strength: 1,
    alpha: {
      target: 0,
      decay: 0.0228,
      min: 0.001,
    },
  },
  fX: {
    strength: 1,
    alpha: {
      target: 0,
      decay: 0.0228,
      min: 0.001,
    },
  },
  fY: {
    strength: 1,
    alpha: {
      target: 0,
      decay: 0.0228,
      min: 0.001,
    },
  },
  fSepV: {
    strength: 1,
    alpha: {
      target: 0,
      decay: 0.0228,
      min: 0.001,
    },
    outwardsOnly: true,
    fnAlpha: 'sigmoid',
  },
  fSepP: {
    strength: 1,
    alpha: {
      target: 0,
      decay: 0.0228,
      min: 0.001,
    },
    outwardsOnly: true,
    fnAlpha: 'sigmoid',
  },
  fKeepInVp: {
    strength: 1,
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

export abstract class ForceWordNodeDatum {
  protected nodes: WordNodeDatum[] = [];

  constructor(private readonly opts: Ref<WordCloudBaseForceOpts>) {}
  abstract apply(alpha: number): void;

  initialize(newNodes: WordNodeDatum[], random: () => number) {
    this.nodes = newNodes;
  }
}

class ForceChargeWordNodeDatum extends ForceWordNodeDatum {
  apply(alpha: number) {}
}

export interface ForceCombined extends d3.Force<WordNodeDatum, any> {
  add(f: ForceWordNodeDatum, p: WordCloudForceAlphaParams): ForceCombined;
  t(): number;
  alpha(alpha: number): ForceCombined;
}

interface ForceData {
  f: ForceWordNodeDatum;
  p: WordCloudForceAlphaParams;
  alpha: number;
}

export function forceCombined(): ForceCombined {
  let nodes: WordNodeDatum[];
  const forceData: ForceData[] = [];
  let t = 0;
  const fn: ForceCombined = (alpha: number) => {
    forceData.forEach((fd) => {
      if (fd.alpha < fd.p.min) return;
      fd.f.apply(fd.alpha);
      fd.alpha += (fd.p.target - fd.alpha) * fd.p.decay;
    });
    t++;
  };
  fn.add = function (
    this: ForceCombined,
    a: ForceWordNodeDatum,
    p: WordCloudForceAlphaParams,
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
  };

  return fn;
}

export function forceCharge(
  opts: Ref<WordCloudBaseForceOpts>,
): ForceWordNodeDatum {
  return new ForceChargeWordNodeDatum(opts);
}
