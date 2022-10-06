<!-- SPDX-License-Identifier: BSD-2-Clause
     Copyright (c) 2022, Jari Hämäläinen, Carita Kiili and Julie Coiro -->
<template lang="pug">
.word-cloud(@click='onClick')
  .word-cloud-body(ref='elWordCloud')
</template>

<script setup lang="ts">
import * as d3 from 'd3';
import Flatten from '@flatten-js/core';
import {computed, onBeforeUnmount, onMounted, ref} from 'vue';

interface Props {
  // words as \n separated string
  words: string;
}
const props = defineProps<Props>();

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
let nodes: WordNodeDatum[] = [];
let links: WordNodeLinkDatum[] = [];
let reheat = false;

interface WordNodeDatum extends d3.SimulationNodeDatum {
  id: string;
  word: string;
  collision: boolean;
  br: Flatten.Box;
  x: number;
  y: number;
  vx: number;
  vy: number;
  index: number;
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

function velocityWordNodeDatum(wd1: WordNodeDatum, i: number) {
  // wd.vx = (Math.cos(i) * i) / (tick / 4);
  // wd.vy = (Math.sin(i) * i) / (tick / 4);
  for (let j = 0; j < nodes.length; j++) {
    wd1.vx *= 0.2;
    wd1.vy *= 0.2;
    if (i === j) return;
    const wd2 = nodes[j];
    const dx = wd1.x - wd2.x;
    const dy = wd1.y - wd2.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    const t = dx / d + dy / d;
    const mx = dx / d / t;
    const my = dy / d / t;
    const f = (1 / (dx * dx + dy * dy)) * 100;
    const c = wd1.br.intersect(wd2.br);
    const af = Math.max(c ? 2 * f : f);

    wd1.vx += af * (mx * dx);
    wd1.vy += af * (my * dy);
  }
}

const createCloud = () => {
  disposeCloud();

  if (!elWordCloud.value) return;
  svg = d3.create('svg').attr('viewBox', [0, 0, width, height]);
  // .style('font', '10px sans-serif');

  updateContainer();

  simulation = d3.forceSimulation<WordNodeDatum>().alphaDecay(0.00001);

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

const update = () => {
  // TODO: check resize
  // if (needsLinkResize) resizePeersLinks();
  // console.log('update', nodes, linksActive);
  nodes = cloudWords.value.map((word, n) => {
    const cx = Math.cos(n) * n;
    const cy = Math.sin(n) * n;
    return {
      id: `word-${n}`,
      word: word.text,
      x: cx,
      y: cy,
      vx: Math.cos(n) * n,
      vy: Math.sin(n) * n,
      index: n,
      collision: false,
      // We get real values later after text has been added
      br: new Flatten.Box(cx, cy, cx, cy),
    };
  });
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

  simulation.restart();
  if (reheat) {
    reheat = false;
    simulation
      // "Reheat" simulation with restart() and alpha(1) on update
      // https://github.com/d3/d3-force#simulation_restart
      .alpha(1);
  }
  simulation.nodes(nodes).on('tick', () => {
    nodeGroup
      ?.selectAll<Element, WordNodeDatum>('text')
      .attr('x', (d) => d.x || 0)
      .attr('y', (d) => d.y || 0)
      // .attr('dx', (d) => ((d.x || 0) > scx ? '6' : '-6'))
      .each((wd, i, g) => {
        const r = g[i].getBoundingClientRect();
        wd.br.xmin = (wd.x || 0) - r.width / 2;
        wd.br.ymin = (wd.y || 0) - r.height / 2;
        wd.br.xmax = wd.br.xmin + r.width;
        wd.br.ymax = wd.br.ymin + r.height;
        wd.collision = false;

        for (let j = 0; j < i; j++) {
          const c = nodes[j].br.intersect(wd.br);
          nodes[j].collision ||= c;
          wd.collision ||= c;
        }
      })
      .each(velocityWordNodeDatum);
    nodeGroup
      ?.selectAll<Element, WordNodeDatum>('rect')
      .attr('x', (d) => d.br.xmin)
      .attr('y', (d) => d.br.ymin)
      .attr('width', (d) => d.br.xmax - d.br.xmin)
      .attr('stroke', (d) => (d.collision ? '#f00' : '#000'))
      .attr('height', (d) => d.br.ymax - d.br.ymin);
    linkGroup
      ?.selectAll<Element, WordNodeLinkDatum>('line')
      .attr('x1', (d) => d.source.x || 0)
      .attr('y1', (d) => d.source.y || 0)
      .attr('x2', (d) => d.target.x || 0)
      .attr('y2', (d) => d.target.y || 0);
  });

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
    },
    (update) => {
      update.selectAll<Element, WordNodeDatum>('text').text((d) => d.word);
    },
  );
};

onMounted(() => {
  createCloud();
});

onBeforeUnmount(() => {
  disposeCloud();
});

const onClick = () => {
  console.log('click');
  createCloud();
};

defineExpose({updateContainer, update, createCloud});
</script>
<style lang="scss">
.word-cloud-body {
  min-height: 500px;
  min-width: 100px;
}
</style>
