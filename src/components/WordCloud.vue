<!-- SPDX-License-Identifier: BSD-2-Clause
     Copyright (c) 2022, Jari Hämäläinen, Carita Kiili and Julie Coiro -->
<template lang="pug">
.word-cloud
  .word-cloud-body(ref='elWordCloud')
</template>

<script setup lang="ts">
import * as d3 from 'd3';
import {computed, nextTick, onBeforeUnmount, onMounted, ref, toRef, watch} from 'vue';
import {
  forceSep,
  Simulation,
  wordCloudDefaultOpts,
} from '@/composition/WordCloud';
import type {
  DebugLineDatum,
  ForceCombined,
  BaseWordNodeDatumForce,
  SimData,
  WordCloudBaseForceOpts,
  WordCloudCollisionShape,
  WordCloudForceAlphaSettings,
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
  fCharge?: WordCloudBaseForceOpts<WordCloudBaseForceParams>;
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
  fCharge: () => cloneDeep(wordCloudDefaultOpts.fCharge),
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
    fCombined.collisionShape(props.collisionShape);
    updateDimensions();
    updateData();
  },
);

const elWordCloud = ref<HTMLDivElement>();
const collisionShape = toRef(props, 'collisionShape');
const fChargeParams = ref(toRef(props, 'fCharge').value.params);
const fXParams = ref(toRef(props, 'fX').value.params);
const fYParams = ref(toRef(props, 'fY').value.params);
const fSepVParams = ref(toRef(props, 'fSepV').value.params);
const fSepPParams = ref(toRef(props, 'fSepP').value.params);

const simulation = new Simulation();
// simulation.addForce(forceSep('position', fSepVParams, collisionShape));
// Just for timing, with 0 decay it'll run until manually stoppped
const d3Simulation = d3.forceSimulation().alphaDecay(0).stop();
d3Simulation.on('tick', () => onTick());
let running = false;
let skipStep = false;

let nodeCounter = 0;

let width = 0;
let height = 0;
let nodes: WordNode[] = [];

let svg: d3.Selection<SVGSVGElement, undefined, null, undefined>;
let nodeGroup: d3.Selection<SVGGElement, WordNode, null, undefined>;

let fCombined: ForceCombined;
let fCharge: BaseWordNodeDatumForce;
let fX: BaseWordNodeDatumForce;
let fY: BaseWordNodeDatumForce;
let fSepV: BaseWordNodeDatumForce = forceSep(
  'velocity',
  fSepVParams,
  collisionShape,
);
let fSepP: BaseWordNodeDatumForce = forceSep(
  'position',
  fSepPParams,
  collisionShape,
);
let fKeepInVp: BaseWordNodeDatumForce;

/**
 * Update viewbox dimensions.
 */
const updateDimensions = () => {
  if (!elWordCloud.value || !svg) return;
  const div = elWordCloud.value;
  const r = div.getBoundingClientRect();
  width = r.width;
  height = 500;
  svg.attr('viewBox', [-width / 2, -height / 2, width, height]);
};

/**
 * Create word cloud.
 */
const create = () => {
  if (!elWordCloud.value) return;
  svg = d3.create('svg').attr('viewBox', [0, 0, width, height]);
  simulation.addForce(fSepP);

  // fCharge = forceCharge(fChargeParams, collisionShape);
  // fX = forceXY(fXParams, collisionShape);
  // fY = forceXY(fYParams, collisionShape);
  // fSepV = forceSep('velocity', fSepVParams, collisionShape);
  // fSepP = forceSep('position', fSepPParams, collisionShape);
  // fCombined = forceCombined()
  //   .debugLines(lines)
  //   .collisionShape(props.collisionShape)
  //   .add(fCharge, {...props.fCharge.alpha}, 'charge')
  //   .add(fX, {...props.fX.alpha}, 'x')
  //   .add(fY, {...props.fY.alpha}, 'y');

  // simulation = d3
  //   .forceSimulation<WordNode>()
  //   .alphaTarget(props.simulation.alpha.target)
  //   .alphaDecay(props.simulation.alpha.decay)
  //   .alphaMin(props.simulation.alpha.min)
  //   .force('combined', fCombined);

  // TODO: w/o cast
  nodeGroup = svg
    .append<SVGGElement>('g')
    .attr('class', 'word-nodes') as unknown as d3.Selection<
    SVGGElement,
    WordNode,
    null,
    undefined
  >;

  const n = svg.node();
  if (n) elWordCloud.value.appendChild(n);
  else return dispose();

  reset();
};

/**
 * Dispose word cloud
 */
const dispose = () => {
  // if (simulation) simulation.stop();
  if (nodeGroup) nodeGroup.node()?.remove();
  if (svg) svg.node()?.remove();
  nodes.splice(0, nodes.length);
  simulation.clear();
  d3Simulation.stop();
  d3Simulation.on('tick', null);
};

onMounted(create);
onBeforeUnmount(dispose);

/**
 * Reset to starting state.
 */
const reset = () => {
  simulation.reset();
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

  updateDimensions();
  updateData();
  simulation.initialize(nodes);
};

const updateData = () => {
  console.log('updateData');
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
  if (skipStep) {
    skipStep = false;
    return;
  }
  simulation.tick();
  updateData();
  // emit('simulation-update', {
  //   alphas: fCombined.alphas(),
  // });
  // if (!fCombined.running()) {
  //   emit('simulation-end');
  // }
};

const updateNodeDimensions = () => {
  console.log('updateNodeDimensions');
  nodeGroup?.selectAll<Element, WordNode>('text').each((wd1, i, g) => {
    const r = g[i].getBoundingClientRect();
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
