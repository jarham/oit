<!-- SPDX-License-Identifier: BSD-2-Clause
     Copyright (c) 2022, Jari Hämäläinen, Carita Kiili and Julie Coiro -->
<template lang="pug">
.word-cloud
  .word-cloud-body(ref='elWordCloud')
</template>

<script setup lang="ts">
import * as d3 from 'd3';
import cloud from 'd3-cloud';
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

let layout: ReturnType<typeof cloud> | null = null;
let elSvg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null = null;

const draw = (words: cloud.Word[]) => {
  // console.log(JSON.stringify(words));
  // console.log(`draw`, elWordCloud.value, layout);
  if (!elWordCloud.value || !layout) return;
  elSvg = d3.select(elWordCloud.value).append('svg');
  elSvg
    .attr('width', layout.size()[0])
    .attr('height', layout.size()[1])
    .append('g')
    .attr(
      'transform',
      'translate(' + layout.size()[0] / 2 + ',' + layout.size()[1] / 2 + ')',
    )
    .selectAll('text')
    .data(words)
    .enter()
    .append('text')
    .style('font-size', function (d) {
      return d.size + 'px';
    })
    .style('font-family', 'Impact')
    .attr('text-anchor', 'middle')
    .attr('transform', function (d) {
      return 'translate(' + [d.x, d.y] + ')rotate(' + d.rotate + ')';
    })
    .text((d) => d.text || '');
};

const resizeLayout = () => {
  if (!elWordCloud.value || !layout || !elSvg) return;
  clear();
  setup();

  // const w = elWordCloud.value.offsetWidth;
  // const h = elWordCloud.value.offsetHeight;
  // console.log(w, h);
  // layout.size([w, h]);
  // elSvg
  //   .attr('width', layout.size()[0])
  //   .attr('height', layout.size()[1])
  //   .append('g')
  //   .attr(
  //     'transform',
  //     'translate(' + layout.size()[0] / 2 + ',' + layout.size()[1] / 2 + ')',
  //   );
};

const setup = () => {
  if (!elWordCloud.value) return;
  const w = elWordCloud.value.offsetWidth;
  const h = elWordCloud.value.offsetHeight;

  layout = cloud()
    .size([w, h])
    .words(cloudWords.value)
    .padding(5)
    .rotate(() => Math.random() * 30 - 15)
    .font('Impact')
    .fontSize((d) => d.size || 10)
    .timeInterval((1000 / 60) * 3)
    .spiral('rectangular')
    .on('end', draw);

  layout.start();
};

const clear = () => {
  elSvg?.remove();
  layout?.stop();
  elSvg = null;
  layout = null;
};

onMounted(() => {
  setup();
});

onBeforeUnmount(() => {
  clear();
});

defineExpose({resizeLayout, setup, clear});
</script>
<style lang="scss">
.word-cloud-body {
  min-height: 500px;
  min-width: 100px;
}
</style>
