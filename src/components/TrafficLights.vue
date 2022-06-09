<!-- SPDX-License-Identifier: BSD-2-Clause
     Copyright (c) 2022, Jari Hämäläinen, Carita Kiili and Julie Coiro -->
<template lang="pug">
.d-flex.flex-column.traffic-lights.border-secondary.rounded-3.align-self-start
  button.border-secondary.rounded-circle.traffic-light(
    v-for='l in lights'
    :class='{[l.class]: true, on: modelValue === l.reliability}'
    :title='l.tooltip'
    :aria-label='l.ariaLabel'
    @click='toggleLight(l.reliability)'
  )
</template>

<script setup lang="ts">
import {computed, ref} from 'vue';
import {useI18n} from 'vue-i18n';
import type {Reliability} from '../model';
import {reliabilityValues} from '../model';

interface Props {
  modelValue: Reliability | null;
}
const props = defineProps<Props>();
const emit = defineEmits<{
  (event: 'update:modelValue', value: Reliability | null): void;
  (event: 'modified'): void;
}>();

const {t} = useI18n();
const tc = (s: string) => t(`component.traffic-lights.${s}`);

const lights = computed(() =>
  reliabilityValues.map((rv) => ({
    reliability: rv,
    tooltip: tc(`btn.source-evaluation-${rv}.title`),
    ariaLabel: tc(`btn.source-evaluation-${rv}.aria-label`),
    class: `traffic-light-${rv}`,
  })),
);
const toggleLight = (r: Reliability) => {
  if (r === props.modelValue) emit('update:modelValue', null);
  else emit('update:modelValue', r);
  emit('modified');
};
</script>

<style lang="scss">
.traffic-lights {
  border: 1pt solid;
  padding: 1pt;
}
.traffic-light {
  border: 1pt solid;
  width: 24px;
  height: 24px;
  &:not(:last-child) {
    margin-bottom: 1pt;
  }
}
.traffic-light-questionable {
  background-color: #7f0000;
  &.on {
    background-color: #ff0000;
  }
}
.traffic-light-somewhat-reliable {
  background-color: #7f6000;
  &.on {
    background-color: #ffdf00;
  }
}
.traffic-light-reliable {
  background-color: #005828;
  &.on {
    background-color: #08f170;
  }
}
</style>
