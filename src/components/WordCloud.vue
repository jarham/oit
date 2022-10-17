<!-- SPDX-License-Identifier: BSD-2-Clause
     Copyright (c) 2022, Jari Hämäläinen, Carita Kiili and Julie Coiro -->
<template lang="pug">
.word-cloud
  .word-cloud-body(ref='elWordCloud')
</template>

<script setup lang="ts">
import * as d3 from 'd3';
import Flatten from '@flatten-js/core';
import {computed, onBeforeUnmount, onMounted, ref, toRef, watch} from 'vue';
import {
  forceCharge,
  ForceChargeWordNodeDatum,
  forceCombined,
  forceXY,
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
  WordNodeDatum,
} from '@/composition/WordCloud';
import {ellipse2poly} from '@/lib/math-utils';
import cloneDeep from 'lodash.clonedeep';

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
  fX?: WordCloudBaseForceOpts<WordCloudCYForceParams>;
  fY?: WordCloudBaseForceOpts<WordCloudCYForceParams>;
  fSepV?: WordCloudBaseForceOpts<WordCloudSeparationForceOpts>;
  fSepP?: WordCloudBaseForceOpts<WordCloudSeparationForceOpts>;
  fKeepInVp?: WordCloudBaseForceOpts<WordCloudBaseForceParams>;
}

// withDefaults doesn't seem to support ...wordCloudDefaultOpts
const props = withDefaults(defineProps<WordCloudProps>(), {
  collisionShape: wordCloudDefaultOpts.collisionShape,
  px: wordCloudDefaultOpts.px,
  py: wordCloudDefaultOpts.py,
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
  () => [
    props.collisionShape,
    props.debugInfo,
    props.simulation,
    props.px,
    props.py,
  ],
  () => draw(),
  {deep: true},
);

const elWordCloud = ref<HTMLDivElement>();
const collisionShape = toRef(props, 'collisionShape');
const fChargeParams = ref(toRef(props, 'fCharge').value.params);
const fXParams = ref(toRef(props, 'fX').value.params);
const fYParams = ref(toRef(props, 'fY').value.params);

let width = 0;
let height = 0;
let t = 0;
let nodes: WordNodeDatum[] = [];
let lines: DebugLineDatum[] = [];

let svg: d3.Selection<SVGSVGElement, undefined, null, undefined>;
let simulation: d3.Simulation<WordNodeDatum, any>;
let nodeGroup: d3.Selection<SVGGElement, WordNodeDatum, null, undefined>;
let lineGroup: d3.Selection<SVGGElement, DebugLineDatum, null, undefined>;

let fCombined: ForceCombined;
let fCharge: BaseWordNodeDatumForce;
let fX: BaseWordNodeDatumForce;
let fY: BaseWordNodeDatumForce;
let fSepV: BaseWordNodeDatumForce;
let fSepP: BaseWordNodeDatumForce;
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
  dispose();

  if (!elWordCloud.value) return;
  svg = d3.create('svg').attr('viewBox', [0, 0, width, height]);
  updateDimensions();

  t = 0;

  fCharge = forceCharge(fChargeParams, collisionShape);
  fX = forceXY(fXParams, collisionShape);
  fY = forceXY(fYParams, collisionShape);
  fCombined = forceCombined()
    .debugLines(lines)
    .add(fCharge, {...props.fCharge.alpha}, 'charge')
    .add(fX, {...props.fX.alpha}, 'x')
    .add(fY, {...props.fY.alpha}, 'y');

  simulation = d3
    .forceSimulation<WordNodeDatum>()
    .alphaTarget(props.simulation.alpha.target)
    .alphaDecay(props.simulation.alpha.decay)
    .alphaMin(props.simulation.alpha.min)
    .force('combined', fCombined);

  // TODO: w/o cast
  nodeGroup = svg
    .append<SVGGElement>('g')
    .attr('class', 'nodes') as unknown as d3.Selection<
    SVGGElement,
    WordNodeDatum,
    null,
    undefined
  >;

  // TODO: w/o cast
  lineGroup = svg
    .append<SVGGElement>('g')
    .attr('class', 'lines') as unknown as d3.Selection<
    SVGGElement,
    DebugLineDatum,
    null,
    undefined
  >;

  const n = svg.node();
  if (n) elWordCloud.value.appendChild(n);
  else return dispose();

  update(true);
};

/**
 * Dispose word cloud
 */
const dispose = () => {
  if (simulation) simulation.stop();
  if (svg) svg.node()?.remove();
  nodes.splice(0, nodes.length);
};

const update = (reheat = false) => {
  nodes = props.words.map((word, n) => {
    const cx = Math.cos(n) * (n + 30) * 2;
    const cy = Math.sin(n) * (n + 30) * 2;
    return {
      word: word,
      x: cx,
      y: cy,
      rx: 0,
      ry: 0,
      vx: 0,
      vy: 0,
      v: [],
      p: [],
      // We get real values later after text has been added
      br: new Flatten.Box(cx, cy, cx, cy),
      be: new Flatten.Polygon(),
    };
  });
  lines = Array.from(Array(nodes.length * nodes.length).keys()).map(() => ({
    x: 0,
    y: 0,
    x2: 0,
    y2: 0,
    stroke: '#0f0',
    show: false,
  }));
  fCombined.debugLines(lines);

  if (props.simulation.run) simulation.restart();
  else simulation.stop();

  if (reheat) {
    simulation.alpha(1);
    fCombined.alpha(1);
  }

  // Using join instead of enter/exit/merge
  // See: https://observablehq.com/@d3/selection-join
  const ngs = nodeGroup.selectAll<Element, WordNodeDatum>('g').data(nodes);
  ngs.join(
    // Using enter fn prevents "doule adding titles"
    (enter) => {
      const g = enter
        .append('g')
        // .style('pointer-events', (d) =>
        //   d.type === gtypes.server ? 'none' : 'auto',
        // )
        // .style('user-select', 'none')
        .style('cursor', 'default');
      // .call(drag(simulation));
      g.append('text')
        .attr('stroke', '#000')
        .attr('stroke-width', 0.5)
        .attr('dy', '0.3em')
        .attr('text-anchor', 'middle')
        .text((d) => d.word);
      g.append('rect')
        .attr('fill', 'none')
        .attr('stroke', '#000')
        .attr('stroke-width', 0.5);
      g.append('ellipse')
        .attr('fill', 'none')
        .attr('stroke', '#000')
        .attr('stroke-width', 0.5);
      g.append('polygon')
        .attr('fill', 'none')
        .attr('stroke', '#000')
        .attr('stroke-width', 0.5);
      // g.append('line')
      //   .attr('class', 'f-sep-v')
      //   .attr('stroke', '#f00')
      //   .attr('stroke-width', 2.5);
      // g.append('line')
      //   .attr('class', 'f-sep-p')
      //   .attr('stroke', '#0f0')
      //   .attr('stroke-width', 2.5);
    },
    (update) => {
      update.selectAll<Element, WordNodeDatum>('text').text((d) => d.word);
    },
  );

  lineGroup.selectAll('line').data(lines).join('line');

  simulation
    .nodes(nodes)
    .on('tick', onTick)
    .on('end', () => emit('simulation-end'));

  draw();
  emit('simulation-update', {
    alphas: fCombined.alphas(),
  });
};

const onTick = () => {
  draw();
  emit('simulation-update', {
    alphas: fCombined.alphas(),
  });
};

const updateNodeDimensions = () => {
  // Calculate bounding box and ellipse and update collision data
  nodeGroup?.selectAll<Element, WordNodeDatum>('text').each((wd1, i, g) => {
    const r = g[i].getBoundingClientRect();
    wd1.rx = (r.width + props.px) / 2;
    wd1.ry = (r.height + props.py) / 2;
    wd1.br.xmin = wd1.x - wd1.rx;
    wd1.br.ymin = wd1.y - wd1.ry;
    wd1.br.xmax = wd1.br.xmin + r.width + props.px;
    wd1.br.ymax = wd1.br.ymin + r.height + props.py;

    wd1.be = new Flatten.Polygon(
      ellipse2poly(
        wd1.x,
        wd1.y,
        wd1.rx,
        wd1.ry,
        0,
        props.simulation.ellipseVertexCount,
      ),
    );
  });
};

const draw = () => {
  // Update svg text x and y, calculate bounding box and ellipse and update collision data
  updateNodeDimensions();
  fCombined.updateDebug();
  nodeGroup
    ?.selectAll<Element, WordNodeDatum>('text')
    .attr('x', (d) => d.x || 0)
    .attr('y', (d) => d.y || 0);
  // .attr('dx', (d) => ((d.x || 0) > scx ? '6' : '-6'))
  // .each((wd1, i, g) => {
  //   const r = g[i].getBoundingClientRect();
  //   wd1.rx = (r.width + props.px) / 2;
  //   wd1.ry = (r.height + props.py) / 2;
  //   wd1.br.xmin = wd1.x - wd1.rx;
  //   wd1.br.ymin = wd1.y - wd1.ry;
  //   wd1.br.xmax = wd1.br.xmin + r.width + props.px;
  //   wd1.br.ymax = wd1.br.ymin + r.height + props.py;

  //   wd1.be = new Flatten.Polygon(
  //     ellipse2poly(
  //       wd1.x,
  //       wd1.y,
  //       wd1.rx,
  //       wd1.ry,
  //       0,
  //       props.simulation.ellipseVertexCount,
  //     ),
  //   );

  //   // wd1.el = kld.ShapeInfo.ellipse({
  //   //   cx: wd1.br.xmin + (wd1.br.xmax - wd1.br.xmin) / 2,
  //   //   cy: wd1.br.ymin + (wd1.br.ymax - wd1.br.ymin) / 2,
  //   //   rx: (wd1.br.xmax - wd1.br.xmin) / 2,
  //   //   ry: (wd1.br.ymax - wd1.br.ymin) / 2,
  //   // });

  //   // for (let j = 0; j < i; j++) {
  //   //   const wd2 = nodes[j];
  //   //   const c =
  //   //     props.collisionShape === 'rectangle'
  //   //       ? wd1.br.intersect(wd2.br)
  //   //       : kld.Intersection.intersect(wd1.el, wd2.el).status ===
  //   //         'Intersection';
  //   //   wd1.collision ||= c;
  //   //   wd2.collision ||= c;
  //   // }
  // });
  nodeGroup
    ?.selectAll<Element, WordNodeDatum>('rect')
    .attr('x', (d) => d.br.xmin)
    .attr('y', (d) => d.br.ymin)
    .attr('width', (d) => d.br.xmax - d.br.xmin)
    .attr('height', (d) => d.br.ymax - d.br.ymin)
    .attr(
      'stroke-dasharray',
      props.collisionShape === 'rectangle' ? 'none' : '3,1',
    )
    .attr('stroke', props.collisionShape === 'rectangle' ? '#000' : '#555')
    .attr('display', () => (props.debugInfo.showCollRectangle ? null : 'none'));
  // .attr('stroke', (d) => (d.collision ? '#f00' : '#000'));
  nodeGroup
    ?.selectAll<Element, WordNodeDatum>('ellipse')
    .attr('cx', (d) => d.x)
    .attr('cy', (d) => d.y)
    .attr('rx', (d) => d.rx)
    .attr('ry', (d) => d.ry)
    .attr(
      'stroke-dasharray',
      props.collisionShape === 'ellipse' ? 'none' : '3,1',
    )
    .attr('stroke', props.collisionShape === 'ellipse' ? '#000' : '#555')
    .attr('display', () => (props.debugInfo.showCollEllipse ? null : 'none'));
  // .attr('stroke', (d) => (d.collision ? '#f00' : '#000'));
  nodeGroup
    ?.selectAll<Element, WordNodeDatum>('polygon')
    .attr('points', (d) => d.be.vertices.map((v) => `${v.x},${v.y}`).join(' '))
    .attr(
      'stroke-dasharray',
      props.collisionShape === 'ellipse' ? 'none' : '3,1',
    )
    .attr('stroke', props.collisionShape === 'ellipse' ? '#000' : '#555')
    .attr('display', () => (props.debugInfo.showCollPolygon ? null : 'none'));
  // .attr('display', () =>
  //   props.collisionShape === 'ellipse' && props.debugInfo.showCollisionShape
  //     ? null
  //     : 'none',
  // )
  // .attr('stroke', (d) => (d.collision ? '#f00' : '#000'));

  lineGroup
    .selectAll<Element, DebugLineDatum>('line')
    .attr('x1', (d) => d.x)
    .attr('y1', (d) => d.y)
    .attr('x2', (d) => d.x2)
    .attr('y2', (d) => d.y2)
    .attr('stroke', (d) => d.stroke)
    .attr('display', (d) => (d.show ? null : 'none'));
};

defineExpose({
  create,
  // update,
  tick: (ticks?: number) => {
    // NOTE: simuation.tick()
    ticks = ticks || 1;
    for (let i = 0; i < ticks; i++) {
      simulation?.tick();
    }
    onTick();
  },
  stop: () => simulation?.stop(),
  start: () => simulation?.restart(),
});
</script>
<style lang="scss">
.word-cloud-body {
  min-height: 500px;
  min-width: 100px;
}
</style>
