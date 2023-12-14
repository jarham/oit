// SPDX-License-Identifier: BSD-2-Clause
// Copyright (c) 2023, Jari Hämäläinen, Carita Kiili and Julie Coiro
import {
  type Body,
  type MinDistResult,
  type Vec2,
} from '@symcode-fi/minkowski-collision';
import {type WordNode} from './word-node';
import merge from 'lodash.merge';
import {cloneDeep} from '@/utils';
import {
  ForceKeepInVP,
  ForceSeparate,
  type PerspectivePaletteBaseForceOpts,
  type PerspectivePaletteKeepInVpForceOpts,
  type PerspectivePaletteSeparationForceOpts,
  Simulation,
  forceKeepInVP,
  forceSep,
} from './word-node-force-simulation';

interface WordNodePositioningOpts {
  viewportPadding?: Vec2;
  fSepV?: PerspectivePaletteBaseForceOpts<PerspectivePaletteSeparationForceOpts>;
  fSepV2?: PerspectivePaletteBaseForceOpts<PerspectivePaletteSeparationForceOpts>;
  fSepP?: PerspectivePaletteBaseForceOpts<PerspectivePaletteSeparationForceOpts>;
  fSepP2?: PerspectivePaletteBaseForceOpts<PerspectivePaletteSeparationForceOpts>;
  fKeepInVp?: PerspectivePaletteBaseForceOpts<PerspectivePaletteKeepInVpForceOpts>;
  sepConstantAspectRatio?: number;
  sepAutoViewportAspectRatio?: boolean;
}

const wordNodePositioningDefaultOpts: Required<WordNodePositioningOpts> = {
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

export interface MsgWordNodePositionCompute {
  msgName: 'MsgWordNodePositionCompute';
  nodes: WordNode[];
  vpWidth: number;
  vpHeight: number;
}
export interface MsgWordNodePositionResult {
  msgName: 'MsgWordNodePositionResult';
  nodes: WordNode[];
}
export type MsgWordNodePosition =
  | MsgWordNodePositionCompute
  | MsgWordNodePositionResult;

export const isMsgWordNodePositionCompute = (
  o: any,
): o is MessageEvent<MsgWordNodePositionCompute> =>
  !!o &&
  typeof o === 'object' &&
  o.type === 'message' &&
  !!o.data &&
  typeof o.data === 'object' &&
  o.data.msgName === 'MsgWordNodePositionCompute' &&
  Array.isArray(o.data.nodes) &&
  typeof o.data.vpWidth === 'number' &&
  typeof o.data.vpHeight === 'number';

export const isMsgNodePositionResult = (
  o: any,
): o is MessageEvent<MsgWordNodePositionResult> =>
  !!o &&
  typeof o === 'object' &&
  o.type === 'message' &&
  !!o.data &&
  typeof o.data === 'object' &&
  o.data.msgName === 'MsgWordNodePositionResult' &&
  Array.isArray(o.data.nodes);

export class WordNodePositioning {
  private fSepV: ForceSeparate;
  private fSepV2: ForceSeparate;
  private fSepP: ForceSeparate;
  private fSepP2: ForceSeparate;
  private fKeepInVp: ForceKeepInVP;
  private sepForces: ForceSeparate[];
  private sim = new Simulation();

  private opts: Required<WordNodePositioningOpts>;

  constructor(opts?: WordNodePositioningOpts) {
    this.opts = merge<
      {},
      Required<WordNodePositioningOpts>,
      WordNodePositioningOpts | undefined
    >(Object.create(null), wordNodePositioningDefaultOpts, opts);

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
