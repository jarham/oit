<!-- SPDX-License-Identifier: BSD-2-Clause
     Copyright (c) 2022, Jari Hämäläinen, Carita Kiili and Julie Coiro -->
<template lang="pug">
.word-cloud
  .word-cloud-body(ref='elWordCloud')
</template>

<script setup lang="ts">
import * as d3 from 'd3';
import Flatten from '@flatten-js/core';
import {computed, onBeforeUnmount, onMounted, ref} from 'vue';
import * as kld from 'kld-intersections';
console.log(kld);

interface Props {
  // words as \n separated string
  words: string;
  collisionShape?: 'rectangle' | 'ellipse';
  showCollisionShape?: boolean;
  showSepV?: boolean;
  showSepP?: boolean;
  showSimInfo?: boolean;
  simBreakPoint?: number | undefined;
  px?: number;
  py?: number;
  fCharge?: boolean;
  fChargeStrength?: number;
  fX?: boolean;
  fXStrength?: number;
  fY?: boolean;
  fYStrength?: number;
  fSepV?: boolean;
  fSepVOutOnly?: boolean;
  fSepVStrength?: number;
  fSepVAlpha?: 'direct' | 'bell' | 'ccc^3';
  fSepP?: boolean;
  fSepPOutOnly?: boolean;
  fSepPStrength?: number;
  fSepPAlpha?: 'direct' | 'bell' | 'ccc^3';
  simAutoRun?: boolean;
  simAlphaTarget?: number;
  simAlphaDecay?: number;
  simAlphaMin?: number;
}
const props = withDefaults(defineProps<Props>(), {
  collisionShape: 'rectangle',
  showCollisionShape: false,
  showSepV: false,
  showSepP: false,
  showSimInfo: false,
  simBreakPoint: undefined,
  px: 30,
  py: 20,
  fCharge: true,
  fChargeStrength: -30,
  fX: true,
  fXStrength: 0.02,
  fY: true,
  fYStrength: 0.02,
  fSepV: true,
  fSepVOutOnly: true,
  fSepVStrength: 1,
  fSepVAlpha: 'bell',
  fSepP: false,
  fSepPOutOnly: true,
  fSepPStrength: 1,
  fSepPAlpha: 'bell',
  simAutoRun: true,
  simAlphaTarget: 0,
  simAlphaDecay: 0.0228,
  simAlphaMin: 0.001,
});

const emit = defineEmits(['breakpoint', 'simulation-end']);

const elWordCloud = ref<HTMLDivElement>();
const cloudWords = computed(() =>
  props.words
    .split('\n')
    .map((w) => w.trim())
    .filter((w) => !!w)
    .map((w) => ({
      text: w,
      size: 25,
    })),
);

let width = 0;
let height = 0;
let scx = 0;
let scy = 0;
let svg: d3.Selection<SVGSVGElement, undefined, null, undefined> | null = null;
let simulation: d3.Simulation<WordNodeDatum, WordNodeLinkDatum> | null = null;
let nodeGroup: d3.Selection<
  SVGGElement,
  WordNodeDatum,
  null,
  undefined
> | null = null;
let linkGroup: d3.Selection<
  SVGGElement,
  WordNodeLinkDatum,
  null,
  undefined
> | null = null;
let simInfo: d3.Selection<SVGGElement, undefined, null, undefined>;
let simInfoT: d3.Selection<SVGTextElement, undefined, null, undefined>;
let simInfoAlpha: d3.Selection<SVGTextElement, undefined, null, undefined>;
let simInfoCenter: d3.Selection<SVGTextElement, undefined, null, undefined>;
let nodes: WordNodeDatum[] = [];
let links: WordNodeLinkDatum[] = [];
let reheat = false;
let t = 0;

interface WordNodeDatum extends d3.SimulationNodeDatum {
  id: string;
  word: string;
  collision: boolean;
  br: Flatten.Box;
  el: kld.Ellipse;
  x: number;
  y: number;
  vx: number;
  vy: number;
  index: number;
  type: 'word' | 'center';
  cvx: number;
  cvy: number;
  cpx: number;
  cpy: number;
}
interface WordNodeLinkDatum extends d3.SimulationLinkDatum<WordNodeDatum> {
  distance: number;
  source: WordNodeDatum;
  target: WordNodeDatum;
}

const updateContainer = () => {
  if (!elWordCloud.value || !svg) return;
  const div = elWordCloud.value;
  const r = div.getBoundingClientRect();
  width = r.width;
  height = r.height;
  svg.attr('viewBox', [-width / 2, -height / 2, width, height]);
  scx = 0;
  scy = 0;
  console.log(
    `updateContainer: width=${width}, height=${height}, scx=${scx}, scy=${scy}`,
  );
};

function distDatum(a: WordNodeDatum, b: WordNodeDatum): number {
  return Math.sqrt((a.x || 0) - (b.x || 0) * (a.y || 0) - (b.y || 0));
}

/**
 * Calculate shortest distance from point to line.
 *
 * @param x0 Point's x
 * @param y0 Point's y
 * @param x1 Line's x1
 * @param y1 Line's y1
 * @param x2 Line's x2
 * @param y2 Line's y2
 */
function distPointLine(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  return (
    Math.abs((x2 - x1) * (y1 - y0) - (x1 - x0) * (y2 - y1)) /
    Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))
  );
}

function distDatumBox(a: WordNodeDatum, b: WordNodeDatum): number {
  const c = a.br.intersect(a.br);
  if (c) return 0;

  // Check every box corner point's distance to line on the other box.
  // Do it "both ways", ie. 1) a's points, b's lines, 2) b's points, a's lines
  let d = Number.POSITIVE_INFINITY;
  let lines = [
    [b.br.xmin, b.br.ymin, b.br.xmax, b.br.ymin],
    [b.br.xmax, b.br.ymin, b.br.xmax, b.br.ymax],
    [b.br.xmax, b.br.ymax, b.br.xmin, b.br.ymax],
    [b.br.xmin, b.br.ymax, b.br.xmin, b.br.ymin],
  ];
  [
    [a.br.xmin, a.br.ymin],
    [a.br.xmax, a.br.ymin],
    [a.br.xmax, a.br.ymax],
    [a.br.xmin, a.br.ymax],
  ].forEach(([x0, y0]) => {
    lines.forEach(([x1, y1, x2, y2]) => {
      const d2 = distPointLine(x0, y0, x1, y1, x2, y2);
      if (d2 < d) d = d2;
    });
  });
  lines = [
    [a.br.xmin, a.br.ymin, a.br.xmax, a.br.ymin],
    [a.br.xmax, a.br.ymin, a.br.xmax, a.br.ymax],
    [a.br.xmax, a.br.ymax, a.br.xmin, a.br.ymax],
    [a.br.xmin, a.br.ymax, a.br.xmin, a.br.ymin],
  ];
  [
    [b.br.xmin, b.br.ymin],
    [b.br.xmax, b.br.ymin],
    [b.br.xmax, b.br.ymax],
    [b.br.xmin, b.br.ymax],
  ].forEach(([x0, y0]) => {
    lines.forEach(([x1, y1, x2, y2]) => {
      const d2 = distPointLine(x0, y0, x1, y1, x2, y2);
      if (d2 < d) d = d2;
    });
  });

  return d;
}

// type StrFn = (() => number) & ((strength: number) => ForceSeparate);
type StrFn = {(): number; (strength: number): ForceSeparate};
interface ForceSeparate extends d3.Force<WordNodeDatum, any> {
  strength(this: ForceSeparate): number;
  strength(this: ForceSeparate, str: number): ForceSeparate;
}

function forceBoxSeparationV(): ForceSeparate {
  let nodes: WordNodeDatum[] | null = null;
  let tf = 0;
  let str = 1;
  const f = (alpha: number) => {
    let colls = false;
    nodes?.forEach((wd1, i) => {
      wd1.cvx = 0;
      wd1.cvy = 0;
      nodes?.forEach((wd2, j) => {
        if (i === j) return;

        // const ints = kld.Intersection.intersect(wd1.el, wd2.el);
        // const c = ints.status === 'Intersection';
        const c =
          props.collisionShape === 'rectangle'
            ? wd1.br.intersect(wd2.br)
            : kld.Intersection.intersect(wd1.el, wd2.el).status ===
              'Intersection';

        // const c = wd1.br.intersect(wd2.br);

        colls ||= c;

        const dx = wd1.x - wd2.x;
        const dy = wd1.y - wd2.y;

        const outwardsX = Math.sign(wd1.x) === Math.sign(dx);
        const outwardsY = Math.sign(wd1.y) === Math.sign(dy);

        // const d = Math.sqrt(dx * dx + dy * dy);
        const d = distDatumBox(wd1, wd2) || 0.1;
        const tot = Math.abs(dx) / d + Math.abs(dy) / d;
        const mx = Math.abs(dx / d / tot);
        const my = Math.abs(dy / d / tot);
        const ff = (() => {
          if (props.fSepVAlpha === 'ccc^3') {
            return Math.min(Math.pow(tf, 3), 30);
          } else if (props.fSepVAlpha === 'bell') {
            // Needs a bit of scaling (compared to 'ccc^3')
            return (
              10 *
              ((1 / (0.2 * Math.sqrt(2 * Math.PI))) *
                Math.pow(Math.E, -0.5 * Math.pow((2 * alpha - 1) / 2, 2)))
            );
          }
          // Needs a bit of scaling (compared to 'ccc^3')
          return alpha * 25;
        })();
        const f = (1 / (dx * dx + dy * dy)) * ff;
        const af = Math.max(c ? f : 0);

        if (outwardsX || !props.fSepPOutOnly) {
          wd1.cvx += str * af * (mx * dx);
        }
        if (outwardsY || !props.fSepPOutOnly) {
          wd1.cvy += str * af * (my * dy);
        }
      });
      wd1.vx += wd1.cvx;
      wd1.vy += wd1.cvy;
    });
    tf = Math.max(tf + (colls ? 1 : -1), 0);
  };
  f.initialize = (newNodes: WordNodeDatum[]) => (nodes = newNodes);
  f.strength = function (this: ForceSeparate, s?: number) {
    if (typeof s === 'number') {
      str = s;
      return f;
    }
    return str;
  };
  // TODO: w/o cast
  return f as ForceSeparate;
}

function forceBoxSeparationP(): ForceSeparate {
  let nodes: WordNodeDatum[] | null = null;
  let str = 1;
  let tf = 0;
  const f = (alpha: number) => {
    let colls = false;
    nodes?.forEach((wd1, i) => {
      wd1.cpx = 0;
      wd1.cpy = 0;
      nodes?.forEach((wd2, j) => {
        if (i === j) return;

        const c =
          props.collisionShape === 'rectangle'
            ? wd1.br.intersect(wd2.br)
            : kld.Intersection.intersect(wd1.el, wd2.el).status ===
              'Intersection';

        colls ||= c;

        const dx = wd1.x - wd2.x;
        const dy = wd1.y - wd2.y;

        const outwardsX = Math.sign(wd1.x) === Math.sign(dx);
        const outwardsY = Math.sign(wd1.y) === Math.sign(dy);

        // const d = Math.sqrt(dx * dx + dy * dy);
        const d = distDatumBox(wd1, wd2) || 0.1;
        const tot = Math.abs(dx) / d + Math.abs(dy) / d;
        const mx = Math.abs(dx / d / tot);
        const my = Math.abs(dy / d / tot);
        const ff = (() => {
          if (props.fSepPAlpha === 'ccc^3') {
            return Math.min(Math.pow(tf, 3), 30);
          } else if (props.fSepPAlpha === 'bell') {
            // Needs a bit of scaling (compared to 'ccc^3')
            return (
              10 *
              ((1 / (0.2 * Math.sqrt(2 * Math.PI))) *
                Math.pow(Math.E, -0.5 * Math.pow((2 * alpha - 1) / 2, 2)))
            );
          }
          // Needs a bit of scaling (compared to 'ccc^3')
          return alpha * 25;
        })();
        const f = (1 / (dx * dx + dy * dy)) * ff;
        const af = Math.max(c ? f : 0);

        if (outwardsX || !props.fSepPOutOnly) {
          wd1.cpx += str * af * (mx * dx);
        }
        if (outwardsY || !props.fSepPOutOnly) {
          wd1.cpy += str * af * (my * dy);
        }
      });
      wd1.x += wd1.cpx;
      wd1.y += wd1.cpy;
    });
    tf = Math.max(tf + (colls ? 1 : -1), 0);
  };
  f.initialize = (newNodes: WordNodeDatum[]) => (nodes = newNodes);
  f.strength = function (this: ForceSeparate, s?: number) {
    if (typeof s === 'number') {
      str = s;
      return f;
    }
    return str;
  };
  // TODO: w/o cast
  return f as ForceSeparate;
}

function velocityWordNodeDatum(wd1: WordNodeDatum, i: number) {
  // wd.vx = (Math.cos(i) * i) / (tick / 4);
  // wd.vy = (Math.sin(i) * i) / (tick / 4);
  for (let j = 0; j < nodes.length; j++) {
    // wd1.vx *= 0.2;
    // wd1.vy *= 0.2;
    if (i === j) continue;
    const wd2 = nodes[j];
    const dx = wd1.x - wd2.x;
    const dy = wd1.y - wd2.y;
    // const d = Math.sqrt(dx * dx + dy * dy);
    const d = distDatumBox(wd1, wd2) || 0.00001;
    const t = dx / d + dy / d;
    const mx = dx / d / t;
    const my = dy / d / t;
    const f = (1 / (dx * dx + dy * dy)) * 10;
    const c = wd1.br.intersect(wd2.br);
    const af = Math.max(c ? 2 * f : f);

    wd1.vx += af * (mx * dx);
    wd1.vy += af * (my * dy);
  }
}

let forceCharge: d3.ForceManyBody<WordNodeDatum>;
let forceX: d3.ForceX<d3.SimulationNodeDatum>;
let forceY: d3.ForceY<d3.SimulationNodeDatum>;
let forceSepV: ForceSeparate;
let forceSepP: ForceSeparate;

const updateForces = () => {
  forceCharge.strength(props.fCharge ? props.fChargeStrength : 0);
  forceX.strength(props.fX ? props.fXStrength : 0);
  forceY.strength(props.fY ? props.fYStrength : 0);
  forceSepV.strength(props.fSepV ? props.fSepVStrength : 0);
  forceSepP.strength(props.fSepP ? props.fSepPStrength : 0);
};

const createCloud = () => {
  disposeCloud();

  t = 0;

  if (!elWordCloud.value) return;
  svg = d3.create('svg').attr('viewBox', [0, 0, width, height]);
  // .style('font', '10px sans-serif');

  updateContainer();

  forceCharge = d3.forceManyBody<WordNodeDatum>();
  forceX = d3.forceX();
  forceY = d3.forceY();
  forceSepV = forceBoxSeparationV();
  forceSepP = forceBoxSeparationP();
  updateForces();

  simulation = d3
    .forceSimulation<WordNodeDatum>()
    .alphaTarget(props.simAlphaTarget)
    .alphaDecay(props.simAlphaDecay)
    .alphaMin(props.simAlphaMin)
    .force('charge', forceCharge)
    .force('x', forceX)
    .force('y', forceY)
    .force('separateV', forceSepV)
    .force('separateP', forceSepP);

  // TODO: w/o cast (d3.Selection is the problem in create() above)
  nodeGroup = svg.append('g').attr('class', 'nodes') as unknown as d3.Selection<
    SVGGElement,
    WordNodeDatum,
    null,
    undefined
  >;

  // TODO: w/o cast (d3.Selection is the problem in create() above)
  linkGroup = svg
    .append('g')
    .attr('stroke', '#777')
    .attr('stroke-opacity', 0.6)
    .attr('fill', 'none')
    .attr('class', 'links') as unknown as d3.Selection<
    SVGGElement,
    WordNodeLinkDatum,
    null,
    undefined
  >;

  simInfo = svg.append('g');
  simInfoT = simInfo
    .append('text')
    .attr('stroke', '#00f')
    .attr('x', 0)
    .attr('y', 0)
    .attr('font-size', 'smaller')
    .attr('font-weight', 100)
    .text('');
  simInfoAlpha = simInfo
    .append('text')
    .attr('stroke', '#00f')
    .attr('x', 0)
    .attr('y', 0)
    .attr('font-size', 'smaller')
    .attr('font-weight', 100)
    .text('');
  simInfoCenter = simInfo
    .append('text')
    .attr('stroke', '#0f0')
    .attr('x', 0)
    .attr('y', 0)
    .attr('font-size', 'smaller')
    .attr('font-weight', 100)
    .text('🞨');

  const n = svg.node();
  if (n) elWordCloud.value.appendChild(n);
  else return disposeCloud();

  reheat = true;
  update();
};

const disposeCloud = () => {
  if (simulation) simulation.stop();
  simulation = null;
  if (svg) svg.node()?.remove();
  svg = null;
  nodeGroup = null;
  nodes.splice(0, nodes.length);
};

const updateNodes = () => {
  nodeGroup
    ?.selectAll<Element, WordNodeDatum>('text')
    .attr('x', (d) => d.x || 0)
    .attr('y', (d) => d.y || 0)
    // .attr('dx', (d) => ((d.x || 0) > scx ? '6' : '-6'))
    .each((wd1, i, g) => {
      const r = g[i].getBoundingClientRect();
      wd1.br.xmin = (wd1.x || 0) - (r.width + props.px) / 2;
      wd1.br.ymin = (wd1.y || 0) - (r.height + props.py) / 2;
      wd1.br.xmax = wd1.br.xmin + r.width + props.px;
      wd1.br.ymax = wd1.br.ymin + r.height + props.py;

      wd1.collision = false;

      wd1.el = kld.ShapeInfo.ellipse({
        cx: wd1.br.xmin + (wd1.br.xmax - wd1.br.xmin) / 2,
        cy: wd1.br.ymin + (wd1.br.ymax - wd1.br.ymin) / 2,
        rx: (wd1.br.xmax - wd1.br.xmin) / 2,
        ry: (wd1.br.ymax - wd1.br.ymin) / 2,
      });

      for (let j = 0; j < i; j++) {
        const wd2 = nodes[j];
        const c =
          props.collisionShape === 'rectangle'
            ? wd1.br.intersect(wd2.br)
            : kld.Intersection.intersect(wd1.el, wd2.el).status ===
              'Intersection';
        wd1.collision ||= c;
        wd2.collision ||= c;
      }
    });
  // .each(velocityWordNodeDatum);
  nodeGroup
    ?.selectAll<Element, WordNodeDatum>('rect')
    .attr('x', (d) => d.br.xmin)
    .attr('y', (d) => d.br.ymin)
    .attr('width', (d) => d.br.xmax - d.br.xmin)
    .attr('height', (d) => d.br.ymax - d.br.ymin)
    .attr('display', () =>
      props.collisionShape === 'rectangle' && props.showCollisionShape
        ? null
        : 'none',
    )
    .attr('stroke', (d) => (d.collision ? '#f00' : '#000'));
  nodeGroup
    ?.selectAll<Element, WordNodeDatum>('ellipse')
    .attr('cx', (d) => d.el.args[0].x)
    .attr('cy', (d) => d.el.args[0].y)
    .attr('rx', (d) => d.el.args[1])
    .attr('ry', (d) => d.el.args[2])
    .attr('display', () =>
      props.collisionShape === 'ellipse' && props.showCollisionShape
        ? null
        : 'none',
    )
    .attr('stroke', (d) => (d.collision ? '#f00' : '#000'));

  nodeGroup
    ?.selectAll<Element, WordNodeDatum>('line.f-sep-v')
    .attr('x1', (d) => d.x)
    .attr('y1', (d) => d.y)
    .attr('x2', (d) => d.x + d.cvx * 10)
    .attr('y2', (d) => d.y + d.cvy * 10)
    .attr('display', () => (props.showSepV ? null : 'none'));
  nodeGroup
    ?.selectAll<Element, WordNodeDatum>('line.f-sep-p')
    .attr('x1', (d) => d.x)
    .attr('y1', (d) => d.y)
    .attr('x2', (d) => d.x + d.cpx * 10)
    .attr('y2', (d) => d.y + d.cpy * 10)
    .attr('display', () => (props.showSepP ? null : 'none'));
};

const updateSimInfo = () => {
  simInfo?.attr('display', () => (props.showSimInfo ? null : 'none'));
  simInfoT
    ?.attr('x', width / -2)
    .attr('y', height / 2 - 5)
    .text(`t: ${t}`);
  const a = Number.parseFloat(simulation?.alpha() as any);
  simInfoAlpha
    ?.attr('x', width / -2)
    .attr('y', height / 2 - 25)
    .attr('stroke', a > (simulation?.alphaMin() || 0) ? '#0f0' : '#f00')
    .text(`α: ${a.toFixed(6)}`);
};

const onTick = (c?: number) => {
  if (typeof c === 'number') t += c;
  else t++;
  updateNodes();
  updateSimInfo();
  linkGroup
    ?.selectAll<Element, WordNodeLinkDatum>('line')
    .attr('x1', (d) => d.source.x || 0)
    .attr('y1', (d) => d.source.y || 0)
    .attr('x2', (d) => d.target.x || 0)
    .attr('y2', (d) => d.target.y || 0);
  if (t === props.simBreakPoint) {
    simulation?.stop();
    emit('breakpoint');
  }
};

const update = () => {
  // TODO: check resize
  // if (needsLinkResize) resizePeersLinks();
  // console.log('update', nodes, linksActive);
  nodes = cloudWords.value.map((word, n) => {
    const cx = Math.cos(n) * (n + 10) * 2;
    const cy = Math.sin(n) * (n + 10) * 2;
    return {
      id: `word-${n}`,
      word: word.text,
      x: cx,
      y: cy,
      vx: 0,
      vy: 0,
      cvx: 0,
      cvy: 0,
      cpx: 0,
      cpy: 0,
      index: n,
      collision: false,
      // We get real values later after text has been added
      br: new Flatten.Box(cx, cy, cx, cy),
      el: kld.ShapeInfo.ellipse({cx: 0, cy: 0, rx: 0, ry: 0}),
      type: 'word',
    };
  });
  console.log(nodes);
  links = links.splice(0, links.length);
  nodes.forEach((source, i) => {
    nodes.forEach((target, j) => {
      if (i !== j) {
        links.push({
          source,
          target,
          distance: 300,
        });
      }
    });
  });

  if (!simulation || !linkGroup || !nodeGroup) return;

  if (props.simAutoRun) simulation.restart();
  else simulation.stop();
  if (reheat) {
    reheat = false;
    simulation
      // "Reheat" simulation with restart() and alpha(1) on update
      // https://github.com/d3/d3-force#simulation_restart
      .alpha(1);
  }
  simulation.nodes(nodes).on('tick', onTick);
  simulation.nodes(nodes).on('end', () => emit('simulation-end'));

  // Using join instead of enter/exit/merge
  // See: https://observablehq.com/@d3/selection-join
  // linkGroup.selectAll('line').data(links).join('line');

  const ngs = nodeGroup
    .selectAll<Element, WordNodeDatum>('g')
    .data(nodes, (d) => d.id /* node id for d3 (key function) */);

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
        // .attr('transform', 'rotate(14)')
        .attr('id', (d) => d.id)
        .attr('text-anchor', 'middle')
        .text((d) => d.word);
      g.append('rect')
        .attr('fill', 'none')
        .attr('stroke', '#000')
        // .attr('transform', 'rotate(14)')
        .attr('stroke-width', 0.5);
      g.append('ellipse')
        .attr('fill', 'none')
        .attr('stroke', '#000')
        // .attr('transform', 'rotate(14)')
        .attr('stroke-width', 0.5);
      g.append('line')
        .attr('class', 'f-sep-v')
        .attr('stroke', '#f00')
        .attr('stroke-width', 2.5);
      g.append('line')
        .attr('class', 'f-sep-p')
        .attr('stroke', '#0f0')
        .attr('stroke-width', 2.5);
    },
    (update) => {
      update.selectAll<Element, WordNodeDatum>('text').text((d) => d.word);
    },
  );
  updateNodes();
  updateSimInfo();
};

onMounted(() => {
  createCloud();
});

onBeforeUnmount(() => {
  disposeCloud();
});

defineExpose({
  updateContainer,
  update,
  createCloud,
  updateNodes: () => {
    updateNodes();
    updateSimInfo();
  },
  tick: (ticks?: number) => {
    // NOTE: simuation.tick()
    simulation?.tick(ticks);
    onTick(ticks);
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
