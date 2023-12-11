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
      vms: [],
      vmsn: [],
    };
  });

  // One update data call is required to get text sizes.
  updateData(true);
};

const positionNodes = () => {
  const tm1 = performance.now();

  // Reposition nodes so that they're completely outside of the ellipse and that they don't collide.
  nodes.forEach((n, i) => {
    // width / 2 + minWidth / 2 = just outside the ellipse
    // + minWidth * 2 adds margin
    // + i * 2.5 * minWidth separates words from each other.
    n.pos.x = width / 2 + nodeMaxWidth * (nodes.length + 1 + i) * 4;
    n.pos.y = 0;
  });
  // Start moving nodes to ellipse: Move each one from just outside of the ellipse
  // towards the origin. Move as close to origin as possible without hitting other nodes.
  // Try from multiple angles (48 different ones).
  const t1: Vec2 = {x: 0, y: 0};
  const t2: Vec2 = {x: 0, y: 0};
  const t3: Vec2 = {x: 0, y: 0};
  const mdr: MinDistResult = {d: 0, v1i: 0, v2i: 0, minPoint: {x: 0, y: 0}};
  let ba: Body<WordNode>;
  let bb: Body<WordNode>;
  const rayStep = (2 * Math.PI) / 48;
  let d: number;
  let minD2: number;
  // sim.initialize(nodes);
  let simNodes: WordNode[] = [];

  nodes.forEach((n, i) => {
    simNodes.push(n);
    sim.initialize(simNodes);
    ba = sim.findBody(n)!;
    if (i == 0) {
      // Shortcut for the first one: Jump to origin
      n.pos.x = 0;
      n.pos.y = 0;
      return;
    }

    // Line cast
    minD2 = Number.POSITIVE_INFINITY;
    for (let a = 0; a < 2 * Math.PI; a += rayStep) {
      // Initial position
      n.pos.x = (width / 2 + nodeMaxWidth / 2) * Math.cos(a);
      n.pos.y = (height / 2 + nodeMaxHeight / 2) * Math.sin(a);
      // console.log(`Node ${n.word} init pos: (${n.pos.x}, ${n.pos.y})`);
      // Initial move vector
      d = Math.sqrt(n.pos.x * n.pos.x + n.pos.y * n.pos.y);
      t1.x = (n.pos.x / d) * (Math.min(nodeMaxHeight, nodeMaxWidth) / -2);
      t1.y = (n.pos.y / d) * (Math.min(nodeMaxHeight, nodeMaxWidth) / -2);

      while (true) {
        sim.eng.checkBodyCollision(ba, true);
        if (sim.eng.collisionCount > 0) {
          // Step back if we hit
          n.pos.x -= t1.x;
          n.pos.y -= t1.y;

          // Stop if move vector is already small enough
          if (Math.abs(t1.x) < 0.8 && Math.abs(t1.y) < 0.8) {
            break;
          }

          // Divide move vector to half
          t1.x /= 2;
          t1.y /= 2;
        } else {
          // Keep moving if no hits
          n.pos.x += t1.x;
          n.pos.y += t1.y;
        }
      }

      // Record min dist to origin
      sim.eng.pointToBodyMinDist(t2, sim.eng.findBody(n.id)!, mdr);
      if (mdr.d < minD2) {
        minD2 = mdr.d;
        t3.x = n.pos.x;
        t3.y = n.pos.y;
        // console.log(`Node ${n.word} suggested pos: (${n.pos.x}, ${n.pos.y})`);
      }
    }

    // Use the position that was closest to origin
    n.pos.x = t3.x;
    n.pos.y = t3.y;
    // console.log(`Node ${n.word} final pos: (${n.pos.x}, ${n.pos.y})`);
  });
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
