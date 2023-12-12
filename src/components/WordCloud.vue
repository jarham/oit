<!-- SPDX-License-Identifier: BSD-2-Clause
     Copyright (c) 2022, Jari Hämäläinen, Carita Kiili and Julie Coiro -->
<template lang="pug">
.word-cloud
  .word-cloud-body(ref='elWordCloud')
  Teleport(to='body')
    .word-cloud-measuring(ref='elMeasuring')
</template>

<script setup lang="ts">
import {onBeforeUnmount, onMounted, ref, watch} from 'vue';
import {
  isMsgNodePositionResult,
  wordCloudDefaultOpts,
} from '@/composition/WordCloud';
import type {MsgNodePosition, WordNode} from '@/composition/WordCloud';
import {ellipse2poly} from '@/lib/math-utils';
import type {Vec2} from '@symcode-fi/minkowski-collision';
import {cloneDeep} from '@/utils';

// Worker for computing word positions on background
const worker = new Worker(
  new URL('../composition/WordCloudWorker.ts', import.meta.url),
  {type: 'module'},
);

// NOTE: because Vue doesn't support importing props interface until 3.3
//       WordCloudProps if defined in files:
//       - src/composition/WordCloud.ts
//       - src/components/WordCloud.vue
interface WordCloudProps {
  words: string[];
  shapePadding?: Vec2;
  viewportPadding?: Vec2;
  shapePolyVertexCount: number;
  sepConstantAspectRatio?: number;
  sepAutoViewportAspectRatio?: boolean;
}

// withDefaults doesn't seem to support ...wordCloudDefaultOpts
const props = withDefaults(defineProps<WordCloudProps>(), {
  shapePadding: () => cloneDeep(wordCloudDefaultOpts.shapePadding),
  viewportPadding: () => cloneDeep(wordCloudDefaultOpts.viewportPadding),
  sepConstantAspectRatio: 1,
  sepAutoViewportAspectRatio: true,
});

watch(
  () => [props.shapePadding, props.viewportPadding],
  () => {
    // updateDimensions();
    // updateData();
  },
  {deep: true},
);
watch(
  () => props.words,
  () => {
    // reset();
  },
  {deep: true},
);

const elWordCloud = ref<HTMLDivElement>();
const elMeasuring = ref<HTMLDivElement>();

let nodeCounter = 0;

let nodes: WordNode[] = [];

// Offscreen svg and text for measuring word sizes.
// (Rendered on 0 x 0 div on top left corner.)
const offScreenSvg = document.createElementNS(
  'http://www.w3.org/2000/svg',
  'svg',
);
offScreenSvg.setAttributeNS(null, 'viewBox', '0 0 500 500');
const offScreenSvgText = document.createElementNS(
  'http://www.w3.org/2000/svg',
  'text',
);
offScreenSvgText.setAttributeNS(null, 'ext-anchor', 'middle');
offScreenSvgText.setAttributeNS(null, 'dy', '0.3em');
offScreenSvgText.textContent = 'foo';
offScreenSvg.appendChild(offScreenSvgText);

const paletteSizes: Readonly<Readonly<Vec2>[]> = [
  {x: 735, y: 500},
  {x: 595, y: 500},
] as const;
const palettes = paletteSizes.map((ps) => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  // viewBox = 'minX minY width height'
  svg.setAttributeNS(
    null,
    'viewBox',
    `${ps.x / -2} ${ps.y / -2} ${ps.x} ${ps.y}`,
  );
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
  el.setAttributeNS(null, 'cx', '0');
  el.setAttributeNS(null, 'cy', '0');
  el.setAttributeNS(null, 'rx', `${ps.x / 2}`);
  el.setAttributeNS(null, 'ry', `${ps.y / 2}`);
  el.setAttributeNS(null, 'fill', `#6c3d71`);
  el.setAttributeNS(null, 'stroke', `#6c3d71`);
  svg.appendChild(el);
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.classList.add('word-cloud-words');
  svg.appendChild(g);

  return {
    w: ps.x,
    h: ps.y,
    svg,
    g,
  };
});

/**
 * Create word cloud.
 */
const create = () => {
  if (!elWordCloud.value || !elMeasuring.value) return;

  elMeasuring.value.appendChild(offScreenSvg);

  const nodes = createNodes(props.words);

  worker.onmessage = (ev: MessageEvent<MsgNodePosition>) => {
    console.log('msg from worker:', ev);
    if (isMsgNodePositionResult(ev)) {
      ev.data.nodes.forEach((n) => {
        const text = document.createElementNS(
          'http://www.w3.org/2000/svg',
          'text',
        );
        text.setAttributeNS(null, 'text-anchor', 'middle');
        text.setAttributeNS(null, 'dy', '0.3em');
        text.setAttributeNS(null, 'x', `${n.pos.x}`);
        text.setAttributeNS(null, 'y', `${n.pos.y}`);
        text.textContent = n.word;
        palettes[0].g.appendChild(text);
      });
    }
  };
  worker.postMessage({
    msgName: 'MsgNodePositionCompute',
    nodes,
    vpWidth: 735,
    vpHeight: 500,
  });

  elWordCloud.value.appendChild(palettes[0].svg);
};

/**
 * Dispose word cloud
 */
const dispose = () => {
  offScreenSvgText.remove();
  offScreenSvg.remove();
  nodes.splice(0, nodes.length);
};

onMounted(create);
onBeforeUnmount(dispose);

const createNodeShape = (word: string): {h: Vec2; v: Vec2[]} => {
  const h: Vec2 = {x: 0, y: 0};
  offScreenSvgText.textContent = word;

  const r = offScreenSvgText.getBBox();
  const fw = r.width + props.shapePadding.x;
  const fh = r.height + props.shapePadding.y;
  h.x = fw / 2;
  h.y = fh / 2;

  const v = ellipse2poly(0, 0, h.x, h.y, 0, props.shapePolyVertexCount);

  return {h, v};
};

const createNodes = (words: string[]): WordNode[] => {
  return words.map<WordNode>((word, n) => {
    const {h, v} = createNodeShape(word);
    return {
      id: `word-node-${nodeCounter++}`,
      index: n,
      word: word,
      pos: {
        x: 0,
        y: 0,
      },
      h,
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
      v,
    };
  });
};
</script>
<style lang="scss">
.word-cloud-body {
  min-height: 500px;
  min-width: 100px;
  // background-color: var(--bs-primary);
  fill: var(--bs-white);
}
.word-cloud {
  border-radius: 50%;
  overflow: hidden;
}
.word-cloud-measuring {
  position: absolute;
  top: 0;
  left: 0;
  width: 0;
  height: 0;
  overflow: hidden;
}
.word-cloud-words,
.word-cloud-measuring {
  font-family: var(--bs-body-font-family);
  font-size: calc(var(--bs-body-font-size) * 1.1);
}
</style>
