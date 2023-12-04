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
import type {Vec2} from '@symcode-fi/minkowski-collision';
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

let minWidth = 10;
let minHeight = 10;
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
  width = Math.max(r.width, minWidth);
  height = Math.min(Math.max(r.height, minHeight), 500);
  svg.attr('viewBox', [-width / 2, -height / 2, width, height]);
  sim.setViewportSize(width, height, props.viewportPadding.x, props.viewportPadding.y);
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

  reset();

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

/**
 * Reset to starting state.
 */
const reset = () => {
  sim.reset();
  updateDimensions();

  nodes = props.words.map((word, n) => {
    const cx = Math.cos(n) * (n + 5) * 2;
    const cy = Math.sin(n) * (n + 5) * 2;
    return {
      id: `word-node-${nodeCounter++}`,
      index: n,
      word: word,
      pos: {
        x: cx,
        y: cy,
      },
      h: {
        x: 0,
        y: 0,
      },
      vl: {},
      vlt: {
        x: cx,
        y: cy,
      },
      p: {},
      pt: {
        x: cx,
        y: cy,
      },
      v: [],
      vms: [],
      vmsn: [],
    };
  });

  updateData();
  // Another dimension update because minWidth and minHeight
  // can update after we get nodes created.
  updateDimensions();
  sim.initialize(nodes);
  const ap = props.sepAutoViewportAspectRatio
    ? (width / height) * props.sepConstantAspectRatio
    : props.sepConstantAspectRatio;
  sepForces.forEach((sf) => sf.setAspectRatio(ap));
};

const updateData = () => {
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

  if (sim.time === 0) updateNodeDimensions();

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
  minWidth = 0;
  minHeight = 0;
  nodeGroup.selectAll<SVGTextElement, WordNode>('text').each((wd1, i, g) => {
    const r = g[i].getBBox();
    const w = r.width + props.shapePadding.x;
    const h = r.height + props.shapePadding.y;
    wd1.h.x = w / 2;
    wd1.h.y = h / 2;
    if (w > minWidth) minWidth = Math.ceil(w);
    if (h > minHeight) minHeight = Math.ceil(w);

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
