<!-- SPDX-License-Identifier: BSD-2-Clause
     Copyright (c) 2023, Jari Hämäläinen, Carita Kiili and Julie Coiro -->
<template lang="pug">
.perspective-palette
  .perspective-palette-body(ref='elPerspectivePalette')
    .perspective-palette-placeholder.justify-content-center.align-items-center(
      :class='!currentSvg ? "d-flex" : "d-none"'
    )
      .spinner-border.text-primary(role='status' style='width: 100px; height: 100px')
  Teleport(to='body')
    .perspective-palette-measuring(ref='elMeasuring')
</template>

<script setup lang="ts">
import {onBeforeUnmount, onMounted, ref, watch} from 'vue';
import {
  isMsgNodePositionResult,
  perspectivePaletteDefaultOpts,
} from '@/composition/PerspectivePalette';
import type {
  MsgNodePosition,
  PerspectivePaletteProps,
  WordNode,
} from '@/composition/PerspectivePalette';
import {ellipse2poly} from '@/lib/math-utils';
import type {Vec2} from '@symcode-fi/minkowski-collision';
import {cloneDeep} from '@/utils';
import {useSupportedLocales} from '@/vue-plugins/plugin-supported-locales';
import gsap from 'gsap';

// Worker for computing word positions on background
const worker = new Worker(
  new URL('../composition/PerspectivePaletteWorker.ts', import.meta.url),
  {type: 'module'},
);
let workerLocale: string | undefined;
let workerSize: 'l' | 'm' | 's' | undefined;
let workerNodes: WordNode[] | undefined;

// withDefaults doesn't seem to support ...perspectivePaletteDefaultOpts
const props = withDefaults(defineProps<PerspectivePaletteProps>(), {
  shapePadding: () => cloneDeep(perspectivePaletteDefaultOpts.shapePadding),
  viewportPadding: () =>
    cloneDeep(perspectivePaletteDefaultOpts.viewportPadding),
  sepConstantAspectRatio: 1,
  sepAutoViewportAspectRatio: true,
});

watch(
  () => [props.locale, props.size],
  () => {
    positionNodes();
    showPalette();
  },
);

const elPerspectivePalette = ref<HTMLDivElement>();
const elMeasuring = ref<HTMLDivElement>();
const currentSvg = ref<SVGSVGElement | undefined>();
let currentSvgLocale: string | undefined;
let currentSvgSize: 'l' | 'm' | 's' | undefined;

let nodeCounter = 0;

let allNodes: Record<
  string,
  Record<'l' | 'm' | 's', WordNode[]>
> = Object.fromEntries(
  useSupportedLocales().map((l) => {
    return [
      l,
      {
        l: [],
        m: [],
        s: [],
      },
    ];
  }),
);
let nodes: WordNode[] = allNodes[props.locale]['l'];

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

const texts: SVGTextElement[] = [];
const tweens: GSAPTween[] = [];

interface SizeSpec {
  w: number;
  h: number;
  size: 'l' | 'm' | 's';
}
const paletteSizes: Readonly<Readonly<SizeSpec>[]> = [
  {w: 740, h: 500, size: 'l'},
  {w: 600, h: 500, size: 'm'},
  {w: 490, h: 600, size: 's'},
] as const;
const palettes = paletteSizes.map((ps) => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  // viewBox = 'minX minY width height'
  svg.setAttributeNS(
    null,
    'viewBox',
    `${ps.w / -2} ${ps.h / -2} ${ps.w} ${ps.h}`,
  );
  svg.classList.add('perspective-palette-svg');
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
  el.setAttributeNS(null, 'cx', '0');
  el.setAttributeNS(null, 'cy', '0');
  el.setAttributeNS(null, 'rx', `${ps.w / 2}`);
  el.setAttributeNS(null, 'ry', `${ps.h / 2}`);
  el.setAttributeNS(null, 'stroke-width', '0');
  el.classList.add('perspective-palette-ellipse');
  svg.appendChild(el);
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.classList.add('perspective-palette-words');
  svg.appendChild(g);

  return {
    ...ps,
    svg,
    g,
    el,
  };
});

const getOrCreateSvgText = (i: number): SVGTextElement => {
  if (i < texts.length) return texts[i];

  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  text.setAttributeNS(null, 'text-anchor', 'middle');
  text.setAttributeNS(null, 'dy', '0.3em');
  texts.push(text);
  return text;
};

const showPalette = (forceReanimate = false) => {
  if (props.size === 'none') return;

  // use s size for scaling
  const size = props.size === 'scaling' ? 's' : props.size;

  // Already showing?
  if (
    !forceReanimate &&
    currentSvgLocale === props.locale &&
    currentSvgSize === size
  ) {
    return;
  }

  // Remove old texts first, and kill tweens
  texts.forEach((t) => t.remove());
  tweens.forEach((t) => t.kill());
  tweens.splice(0, tweens.length);

  // Remove old svg
  currentSvg.value?.remove();
  currentSvg.value = undefined;
  currentSvgLocale = undefined;
  currentSvgSize = undefined;

  const localeNodes = allNodes[props.locale];
  const sizeNodes = localeNodes[size];
  if (sizeNodes.length === 0) {
    return;
  }

  // Select new svg
  const palette = palettes.find((p) => p.size === size);
  if (!palette) {
    console.error('Did not find palette for size', size);
    return;
  }

  currentSvg.value = palette.svg;

  for (let i = 0; i < sizeNodes.length; i++) {
    const node = sizeNodes[i];
    const text = getOrCreateSvgText(i);
    text.textContent = node.word;
    palette.g.appendChild(text);
    tweens.push(
      gsap.fromTo(
        text,
        {
          x: 0,
          y: 0,
        },
        {
          x: node.pos.x,
          y: node.pos.y,
          duration: 0.4,
          ease: 'power2.out',
        },
      ),
    );
    tweens.push(
      gsap.fromTo(
        palette.el,
        {
          rx: 0,
          ry: 0,
        },
        {
          rx: palette.w / 2,
          ry: palette.h / 2,
          duration: 0.25,
          ease: 'power2.out',
        },
      ),
    );
  }
  elPerspectivePalette.value?.appendChild(currentSvg.value);
  currentSvgLocale = props.locale;
  currentSvgSize = size;
};

const positionNodes = () => {
  if (workerLocale || workerSize) return; // Already working
  if (props.size === 'none') return;

  // use s size for scaling
  const size = props.size === 'scaling' ? 's' : props.size;

  const localeNodes = allNodes[props.locale];
  const sizes: ('l' | 'm' | 's')[] = ['l', 'm', 's'];
  sizes.sort((a, b) => {
    if (size === a) return -1;
    if (size === b) return 1;
    return 0;
  });
  for (const s of sizes) {
    const sizeNodes = localeNodes[s];
    const paletteSize = paletteSizes.find((ps) => ps.size === s);
    if (paletteSize && sizeNodes.length === 0) {
      workerLocale = props.locale;
      workerSize = s;
      workerNodes = createNodes(props.words[props.locale]);
      worker.postMessage({
        msgName: 'MsgNodePositionCompute',
        nodes: workerNodes,
        vpWidth: paletteSize.w,
        vpHeight: paletteSize.h,
      });
      return;
    }
  }
};

/**
 * Create perspective palette.
 */
const create = () => {
  if (!elPerspectivePalette.value || !elMeasuring.value) return;

  elMeasuring.value.appendChild(offScreenSvg);

  worker.onmessage = (ev: MessageEvent<MsgNodePosition>) => {
    if (isMsgNodePositionResult(ev)) {
      if (workerLocale && workerSize) {
        const nodes = workerNodes;
        if (nodes && nodes.length === ev.data.nodes.length) {
          for (let i = 0; i < nodes.length; i++) {
            const nTarget = nodes[i];
            const nSource = ev.data.nodes[i];
            nTarget.pos.x = nSource.pos.x;
            nTarget.pos.y = nSource.pos.y;
          }
          allNodes[workerLocale][workerSize] = nodes;
        } else {
          console.error(
            'No worker nodes, or worker and main nodes length mismatch!',
          );
        }
      } else {
        console.error('Worker locale or size is undefined!');
      }
      workerLocale = undefined;
      workerSize = undefined;
      workerNodes = undefined;

      positionNodes();
      showPalette();
    }
  };
  positionNodes();
};

/**
 * Dispose perspective palette
 */
const dispose = () => {
  worker.terminate();
  tweens.forEach((t) => t.kill());
  tweens.splice(0, tweens.length);
  texts.forEach((t) => t.remove());
  texts.splice(0, texts.length);
  offScreenSvgText.remove();
  offScreenSvg.remove();
  palettes.forEach((p) => {
    p.el.remove();
    p.g.remove();
    p.svg.remove();
  });
  palettes.splice(0, palettes.length);
  Object.entries(allNodes).forEach(([_locale, sizeNodes]) => {
    Object.entries(sizeNodes).forEach(([_size, nodes]) => {
      nodes.splice(0, nodes.length);
    });
  });
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

defineExpose({showPalette});
</script>
<style lang="scss">
.perspective-palette-body {
  min-height: 100px;
  min-width: 100px;
}
.perspective-palette-measuring {
  position: absolute;
  top: 0;
  left: 0;
  width: 0;
  height: 0;
  overflow: hidden;
}
.perspective-palette-ellipse {
  fill: var(--bs-primary);
}
.perspective-palette-words {
  fill: var(--bs-white);
}
.perspective-palette-words,
.perspective-palette-measuring {
  font-family: var(--bs-body-font-family);
  font-size: calc(var(--bs-body-font-size) * 1.1);
}
</style>
