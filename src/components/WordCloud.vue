<!-- SPDX-License-Identifier: BSD-2-Clause
     Copyright (c) 2022, Jari Hämäläinen, Carita Kiili and Julie Coiro -->
<template lang="pug">
.word-cloud
  .word-cloud-body(ref='elWordCloud')
</template>

<script setup lang="ts">
import * as d3 from 'd3';
import {onBeforeUnmount, onMounted, ref, watch} from 'vue';
import {
  forceGravity,
  forceKeepInVP,
  forceSep,
  Simulation,
  wordCloudDefaultOpts,
} from '@/composition/WordCloud';
import type {
  SimData,
  WordCloudBaseForceOpts,
  WordCloudSeparationForceOpts,
  WordCloudBaseForceParams,
  WordNode,
} from '@/composition/WordCloud';
import {ellipse2poly} from '@/lib/math-utils';
import type {Body, MinDistResult, Vec2} from '@symcode-fi/minkowski-collision';
import {cloneDeep} from '@/utils';

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
  fKeepInVp?: WordCloudBaseForceOpts<WordCloudBaseForceParams>;
  sepConstantAspectRatio?: number;
  sepAutoViewportAspectRatio?: boolean;
}

// withDefaults doesn't seem to support ...wordCloudDefaultOpts
const props = withDefaults(defineProps<WordCloudProps>(), {
  shapePadding: () => cloneDeep(wordCloudDefaultOpts.shapePadding),
  viewportPadding: () => cloneDeep(wordCloudDefaultOpts.viewportPadding),
  simulation: () => cloneDeep(wordCloudDefaultOpts.simulation),
  debugInfo: () => cloneDeep(wordCloudDefaultOpts.debugInfo),
  fGravity: () => cloneDeep(wordCloudDefaultOpts.fGravity),
  fGravity2: () => cloneDeep(wordCloudDefaultOpts.fGravity2),
  fSepV: () => cloneDeep(wordCloudDefaultOpts.fSepV),
  fSepV2: () => cloneDeep(wordCloudDefaultOpts.fSepV2),
  fSepP: () => cloneDeep(wordCloudDefaultOpts.fSepP),
  fSepP2: () => cloneDeep(wordCloudDefaultOpts.fSepP2),
  fKeepInVp: () => cloneDeep(wordCloudDefaultOpts.fKeepInVp),
  sepConstantAspectRatio: 1,
  sepAutoViewportAspectRatio: true,
});
const emit = defineEmits<{
  (event: 'breakpoint'): void;
  (event: 'simulation-end'): void;
  (event: 'simulation-update', simData: SimData): void;
}>();

watch(
  () => [props.debugInfo, props.simulation, props.shapePadding],
  () => {
    updateDimensions();
    updateData();
  },
  {deep: true},
);
watch(
  () => props.words,
  () => {
    reset();
  },
  {deep: true},
);

const elWordCloud = ref<HTMLDivElement>();

let debugPolys: Vec2[][] = [];
const sim = new Simulation(debugPolys);
// Just for timing, with 0 decay it'll run until manually stoppped
const d3Simulation = d3.forceSimulation().alphaDecay(0).stop();
let running = false;
let skipStep = false;

let nodeCounter = 0;

let nodeMaxWidth = 10;
let nodeMaxHeight = 10;
let width = 0;
let height = 0;
let nodes: WordNode[] = [];

const svg = d3.create('svg').attr('viewBox', [0, 0, width, height]);
// TODO: w/o cast
const nodeGroup = svg
  .append<SVGGElement>('g')
  .attr('class', 'word-nodes') as unknown as d3.Selection<
  SVGGElement,
  WordNode,
  null,
  undefined
>;

const fGravity = forceGravity(props.fGravity.params, [
  {
    type: 'time-before',
    value: 8,
    callback: (s, f, _t, _a) => {
      s.setAlpha(f, 1, {decay: 0.15});
    },
  },
]);
const fGravity2 = forceGravity(props.fGravity2.params);
const fSepV = forceSep('velocity', props.fSepV.params);
const fSepV2 = forceSep('velocity', props.fSepV2.params);
const fSepP = forceSep('position', props.fSepP.params);
const fSepP2 = forceSep('position', props.fSepP2.params);
const fKeepInVp = forceKeepInVP(props.fKeepInVp.params);

const fIdNameMapping = {
  [fGravity.id]: 'gravity',
  [fGravity2.id]: 'gravity2',
  [fSepV.id]: 'sepV',
  [fSepV2.id]: 'sepV2',
  [fSepP.id]: 'sepP',
  [fSepP2.id]: 'sepP2',
  [fKeepInVp.id]: 'keepInVp',
} as const;

const sepForces = [fSepV, fSepV2, fSepP];

/**
 * Update viewbox dimensions.
 */
const updateDimensions = () => {
  if (!elWordCloud.value || !svg) return;
  const div = elWordCloud.value;
  const r = div.getBoundingClientRect();
  width = Math.max(r.width, nodeMaxWidth);
  height = Math.min(Math.max(r.height, nodeMaxHeight), 500);
  svg.attr('viewBox', [-width / 2, -height / 2, width, height]);
  sim.setViewportSize(
    width,
    height,
    props.viewportPadding.x,
    props.viewportPadding.y,
  );
};

/**
 * Create word cloud.
 */
const create = () => {
  if (!elWordCloud.value) return;

  const n = svg.node();
  if (n) elWordCloud.value.appendChild(n);
  else return dispose();

  sim
    .addForce(fGravity, props.fGravity.alpha)
    .addForce(fGravity2, props.fGravity2.alpha)
    .addForce(fSepP, props.fSepP.alpha)
    .addForce(fSepP2, props.fSepP2.alpha)
    .addForce(fSepV, props.fSepV.alpha)
    .addForce(fSepV2, props.fSepV2.alpha)
    .addForce(fKeepInVp, props.fKeepInVp.alpha);

  // reset();

  d3Simulation.on('tick', onTick);
};

/**
 * Dispose word cloud
 */
const dispose = () => {
  nodeGroup.node()?.remove();
  svg.node()?.remove();
  nodes.splice(0, nodes.length);
  sim.clear();
  d3Simulation.stop();
  d3Simulation.on('tick', null);
};

onMounted(create);
onBeforeUnmount(dispose);

const createNodes = () => {
  nodes = props.words.map((word, n) => {
    return {
      id: `word-node-${nodeCounter++}`,
      index: n,
      word: word,
      pos: {
        x: 0,
        y: 0,
      },
      h: {
        x: 0,
        y: 0,
      },
      vl: {},
      vlt: {
        x: 0,
        y: 0,
      },
      p: {},
      pt: {
        x: 0,
        y: 0,
      },
      v: [],
    };
  });

  // One update data call is required to get text sizes.
  updateData(true);
};

const positionNodes = () => {
  const tm1 = performance.now();

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
  let simNodes: WordNode[] = [];

  initNodes.forEach((n, i) => {
    simNodes.push(n);
    sim.initialize(simNodes);
    ba = sim.findBody(n)!;
    if (i == 0) {
      // Shortcut for the first one: Jump to origin
      n.pos.x = 0;
      n.pos.y = 0;
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

          sim.eng.checkBodyCollision(ba, true);
          const hit = sim.eng.collisionCount > 0;
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
        sim.eng.pointToBodyMinDist(zero, sim.eng.findBody(n.id)!, mdr);
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
  // console.log('v center:', t1);
  maxD2 = Number.NEGATIVE_INFINITY;
  initNodes.forEach((n) => {
    n.pos.x -= t1.x;
    n.pos.y -= t1.y;
    const d2 = n.pos.x * n.pos.x + n.pos.y * n.pos.y;
    if (d2 > maxD2) maxD2 = d2;
  });

  // Scale up if possible
  const d = Math.sqrt(maxD2);
  const hw = width / 2 - props.viewportPadding.x;
  const f = hw / d;
  // console.log('f:', f);
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
  sim.initialize(nodes);
  for (let i = 0; i < 80; i++) {
    sim.tick();
  }
  sim.reset();

  const tm2 = performance.now();
  console.log(`Initial positioning took: ${tm2 - tm1} ms`);

  updateData();
};

/**
 * Reset to starting state.
 */
const reset = () => {
  sim.reset();
  updateDimensions();
  createNodes();
  positionNodes();

  // Another dimension update because nodeMaxWidth and nodeMaxHeight
  // can update after we get nodes created.
  updateDimensions();
  sim.initialize(nodes);
  const ap = props.sepAutoViewportAspectRatio
    ? (width / height) * props.sepConstantAspectRatio
    : props.sepConstantAspectRatio;
  sepForces.forEach((sf) => sf.setAspectRatio(ap));
};

const updateData = (updateNodeDims = false) => {
  nodeGroup
    .selectAll<SVGTextElement, WordNode>('text')
    .data(nodes)
    .join(
      (enter) => {
        return enter
          .append('text')
          .attr('text-anchor', 'middle')
          .attr('dy', '0.3em')
          .attr('x', (d) => d.pos.x)
          .attr('y', (d) => d.pos.y)
          .text((d) => d.word);
      },
      (update) => {
        return update
          .attr('x', (d) => d.pos.x)
          .attr('y', (d) => d.pos.y)
          .text((d) => d.word);
      },
      (exitNode) => {
        exitNode.remove();
      },
    );

  if (updateNodeDims || sim.time === 0) updateNodeDimensions();

  nodeGroup
    .selectAll<SVGRectElement, WordNode>('rect')
    .data(nodes)
    .join(
      (enter) => {
        return enter
          .append('rect')
          .attr('cursor', 'pointer')
          .attr('x', (d) => d.pos.x - d.h.x)
          .attr('y', (d) => d.pos.y - d.h.y)
          .attr('width', (d) => d.h.x * 2)
          .attr('height', (d) => d.h.y * 2)
          .attr('stroke', '#000')
          .attr('stroke-width', 0.5)
          .attr('fill', 'transparent')
          .attr('display', () =>
            !props.debugInfo.hideAll && props.debugInfo.showCollRectangle
              ? null
              : 'none',
          );
      },
      (update) => {
        return update
          .attr('x', (d) => d.pos.x - d.h.x)
          .attr('y', (d) => d.pos.y - d.h.y)
          .attr('width', (d) => d.h.x * 2)
          .attr('height', (d) => d.h.y * 2)
          .attr('display', () =>
            !props.debugInfo.hideAll && props.debugInfo.showCollRectangle
              ? null
              : 'none',
          );
      },
      (exitNode) => {
        exitNode.remove();
      },
    );

  nodeGroup
    .selectAll<SVGEllipseElement, WordNode>('ellipse')
    .data(nodes)
    .join(
      (enter) => {
        return enter
          .append('ellipse')
          .attr('cursor', 'pointer')
          .attr('rx', (d) => d.h.x)
          .attr('ry', (d) => d.h.y)
          .attr('cx', (d) => d.pos.x)
          .attr('cy', (d) => d.pos.y)
          .attr('stroke', '#000')
          .attr('stroke-width', 0.5)
          .attr('fill', 'transparent')
          .attr('display', () =>
            !props.debugInfo.hideAll && props.debugInfo.showCollEllipse
              ? null
              : 'none',
          );
      },
      (update) => {
        return update
          .attr('rx', (d) => d.h.x)
          .attr('ry', (d) => d.h.y)
          .attr('cx', (d) => d.pos.x)
          .attr('cy', (d) => d.pos.y)
          .attr('display', () =>
            !props.debugInfo.hideAll && props.debugInfo.showCollEllipse
              ? null
              : 'none',
          );
      },
      (exitNode) => {
        exitNode.remove();
      },
    );

  nodeGroup
    .selectAll<SVGPolygonElement, WordNode>('polygon')
    .data(nodes)
    .join(
      (enter) => {
        return enter
          .append('polygon')
          .attr('cursor', 'pointer')
          .attr('points', (d) =>
            d.v.map((v) => `${d.pos.x + v.x},${d.pos.y + v.y}`).join(' '),
          )
          .attr('stroke', '#000')
          .attr('stroke-width', 0.5)
          .attr('fill', 'transparent')
          .attr('display', () =>
            !props.debugInfo.hideAll && props.debugInfo.showCollPolygon
              ? null
              : 'none',
          );
      },
      (update) => {
        return update
          .attr('points', (d) =>
            d.v.map((v) => `${d.pos.x + v.x},${d.pos.y + v.y}`).join(' '),
          )
          .attr('display', () =>
            !props.debugInfo.hideAll && props.debugInfo.showCollPolygon
              ? null
              : 'none',
          );
      },
      (exitNode) => {
        exitNode.remove();
      },
    );
};

const onTick = () => {
  if (!skipStep) {
    sim.tick();
    updateData();
  }
  skipStep = false;
  emitAlphas();
};

const emitAlphas = () => {
  const alphas = Object.fromEntries(
    Object.entries(sim.forceAlphas).map(([k, a]) => [
      fIdNameMapping[k] || k,
      a,
    ]),
  );
  emit('simulation-update', {
    alphas,
  });
};

const updateNodeDimensions = () => {
  // Update minWidth and minHeight too
  nodeMaxWidth = 0;
  nodeMaxHeight = 0;
  nodeGroup.selectAll<SVGTextElement, WordNode>('text').each((wd1, i, g) => {
    const r = g[i].getBBox();
    const w = r.width + props.shapePadding.x;
    const h = r.height + props.shapePadding.y;
    wd1.h.x = w / 2;
    wd1.h.y = h / 2;
    if (w > nodeMaxWidth) nodeMaxWidth = Math.ceil(w);
    if (h > nodeMaxHeight) nodeMaxHeight = Math.ceil(w);

    wd1.v = ellipse2poly(0, 0, wd1.h.x, wd1.h.y, 0, props.shapePolyVertexCount);
  });
};

const start = () => {
  running = true;
  skipStep = false;
  d3Simulation.restart();
};

const stop = () => {
  running = false;
  skipStep = false;
  d3Simulation.stop();
};

const isRunning = () => running;

defineExpose({
  tick: (ticks?: number) => {
    ticks = ticks || 1;
    for (let i = 0; i < ticks; i++) {
      onTick();
    }
  },
  reset: () => {
    reset();
    if (running) {
      skipStep = true;
    } else {
      emitAlphas();
    }
  },
  stop,
  start,
  isRunning,
});
</script>
<style lang="scss">
.word-cloud-body {
  min-height: 500px;
  min-width: 100px;
  background-color: var(--bs-primary);
  fill: var(--bs-white);
}
.word-cloud {
  border-radius: 50%;
  overflow: hidden;
}
</style>
