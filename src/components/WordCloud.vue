<!-- SPDX-License-Identifier: BSD-2-Clause
     Copyright (c) 2022, Jari Hämäläinen, Carita Kiili and Julie Coiro -->
<template lang="pug">
.word-cloud
  .word-cloud-body(ref='elWordCloud')
</template>

<script setup lang="ts">
import * as d3 from 'd3';
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  toRef,
  watch,
} from 'vue';
import {
  forceGravity,
  forceKeepInVP,
  forceSep,
  forceXY,
  Simulation,
  wordCloudDefaultOpts,
} from '@/composition/WordCloud';
import type {
  BaseWordNodeDatumForce,
  SimData,
  WordCloudBaseForceOpts,
  WordCloudCollisionShape,
  WordCloudSeparationForceOpts,
  WordCloudBaseForceParams,
  WordCloudCYForceParams,
  WordNode,
} from '@/composition/WordCloud';
import {ellipse2poly} from '@/lib/math-utils';
import type {Vec2} from '@/lib/math-utils';
import cloneDeep from 'lodash.clonedeep';

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

// withDefaults doesn't seem to support ...wordCloudDefaultOpts
const props = withDefaults(defineProps<WordCloudProps>(), {
  collisionShape: wordCloudDefaultOpts.collisionShape,
  shapePadding: () => cloneDeep(wordCloudDefaultOpts.shapePadding),
  simulation: () => cloneDeep(wordCloudDefaultOpts.simulation),
  debugInfo: () => cloneDeep(wordCloudDefaultOpts.debugInfo),
  fGravity: () => cloneDeep(wordCloudDefaultOpts.fGravity),
  fX: () => cloneDeep(wordCloudDefaultOpts.fX),
  fY: () => cloneDeep(wordCloudDefaultOpts.fY),
  fSepV: () => cloneDeep(wordCloudDefaultOpts.fSepV),
  fSepP: () => cloneDeep(wordCloudDefaultOpts.fSepP),
  fKeepInVp: () => cloneDeep(wordCloudDefaultOpts.fKeepInVp),
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
  () => [props.collisionShape],
  () => {
    updateDimensions();
    updateData();
  },
);

const elWordCloud = ref<HTMLDivElement>();
const collisionShape = toRef(props, 'collisionShape');

const simulation = new Simulation();
// simulation.addForce(forceSep('position', fSepVParams, collisionShape));
// Just for timing, with 0 decay it'll run until manually stoppped
const d3Simulation = d3.forceSimulation().alphaDecay(0).stop();
let running = false;
let skipStep = false;

let nodeCounter = 0;

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

const fGravity = forceGravity(props.fGravity.params, collisionShape);
const fX = forceXY(props.fX.params, collisionShape);
const fY = forceXY(props.fY.params, collisionShape);
const fSepV = forceSep('velocity', props.fSepV.params, collisionShape);
const fSepP = forceSep('position', props.fSepP.params, collisionShape);
const fKeepInVp = forceKeepInVP(props.fKeepInVp.params, collisionShape);

const fIdNameMapping = {
  [fGravity.id]: 'gravity',
  [fX.id]: 'x',
  [fY.id]: 'y',
  [fSepV.id]: 'sepV',
  [fSepP.id]: 'sepP',
  [fKeepInVp.id]: 'keepInVp',
} as const;

/**
 * Update viewbox dimensions.
 */
const updateDimensions = () => {
  if (!elWordCloud.value || !svg) return;
  const div = elWordCloud.value;
  const r = div.getBoundingClientRect();
  width = Math.max(r.width, 10);
  height = 500;
  svg.attr('viewBox', [-width / 2, -height / 2, width, height]);
};

/**
 * Create word cloud.
 */
const create = () => {
  if (!elWordCloud.value) return;

  const n = svg.node();
  if (n) elWordCloud.value.appendChild(n);
  else return dispose();

  simulation
    .addForce(fGravity, props.fGravity.alpha)
    .addForce(fX, props.fX.alpha)
    .addForce(fY, props.fY.alpha)
    .addForce(fSepP, props.fSepP.alpha)
    .addForce(fSepV, props.fSepV.alpha)
    .addForce(fKeepInVp, props.fKeepInVp.alpha);

  reset();

  d3Simulation.on('tick', onTick);

  // requestAnimationFrame(ani);
};

/**
 * Dispose word cloud
 */
const dispose = () => {
  nodeGroup.node()?.remove();
  svg.node()?.remove();
  nodes.splice(0, nodes.length);
  simulation.clear();
  d3Simulation.stop();
  d3Simulation.on('tick', null);
  tPrev = Number.POSITIVE_INFINITY;
};

onMounted(create);
onBeforeUnmount(dispose);

/**
 * Reset to starting state.
 */
const reset = () => {
  simulation.reset();
  updateDimensions();

  nodes = props.words.map((word, n) => {
    const cx = Math.cos(n) * (n + 5) * 2;
    const cy = Math.sin(n) * (n + 5) * 2;
    return {
      id: `word-node-${nodeCounter++}`,
      word: word,
      pos: {
        x: cx,
        y: cy,
      },
      h: {
        x: 0,
        y: 0,
      },
      v: {},
      vt: {
        x: cx,
        y: cy,
      },
      p: {},
      pt: {
        x: cx,
        y: cy,
      },
      vertices: [],
    };
  });

  updateData();
  simulation.initialize(nodes);
};

const updateData = () => {
  // console.log('updateData');
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
        return update.attr('x', (d) => d.pos.x).attr('y', (d) => d.pos.y);
      },
    );

  if (simulation.time === 0) updateNodeDimensions();

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
          .attr('fill', 'transparent');
      },
      (update) => {
        return update
          .attr('rx', (d) => d.h.x)
          .attr('ry', (d) => d.h.y)
          .attr('cx', (d) => d.pos.x)
          .attr('cy', (d) => d.pos.y);
      },
    );
};

const onTick = () => {
  // ani(performance.now());
  if (!skipStep) {
    simulation.tick();
    updateData();
  }
  skipStep = false;
  emitAlphas();
};

const emitAlphas = () => {
  const alphas = Object.fromEntries(
    Object.entries(simulation.forceAlphas).map(([k, a]) => [
      fIdNameMapping[k] || k,
      a,
    ]),
  );
  emit('simulation-update', {
    alphas,
  });
};

const updateNodeDimensions = () => {
  console.log('updateNodeDimensions');
  nodeGroup.selectAll<SVGTextElement, WordNode>('text').each((wd1, i, g) => {
    const r = g[i].getBBox();
    wd1.h.x = (r.width + props.shapePadding.x) / 2;
    wd1.h.y = (r.height + props.shapePadding.y) / 2;

    wd1.vertices = ellipse2poly(
      wd1.pos.x,
      wd1.pos.y,
      wd1.h.x,
      wd1.h.y,
      0,
      props.shapePolyVertexCount,
    );
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

let tPrev: number;
let tTotal = 0;
let tCount = 0;
const ani = (t: number) => {
  if (tPrev === undefined) tPrev = t;
  else {
    tTotal += t - tPrev;
    tCount++;
  }
  console.log('step:', t - tPrev, tTotal > 0 ? tTotal / tCount : 0);
  tPrev = t;
  // if (tPrev < Number.POSITIVE_INFINITY) requestAnimationFrame(ani);
};

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
});
</script>
<style lang="scss">
.word-cloud-body {
  min-height: 500px;
  min-width: 100px;
}
</style>
