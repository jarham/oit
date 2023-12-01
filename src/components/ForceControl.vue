<template lang="pug">
.d-flex.mb-2.force-control
  label.input-group-title.input-group-title-sm(for='wc-f-y') {{ name }}
  .d-flex.flex-column
    .input-group.input-group-sm.input-group-titled
      .input-group-text
        input#wc-f-y.form-check-input.mt-0(
          type='checkbox'
          :checked='params.enabled'
          @change="onParamsChange('enabled', $event)"
        )
      label.input-group-text(for='wc-f-y-str') Str
      input#wc-f-y-str.form-control(
        type='number'
        :value='params.strength'
        @input="onParamsChange('strength', $event)"
      )
      label.input-group-text(for='wc-f-y-a-decay') α-decay
      input#wc-f-y-a-decay.form-control(
        type='number'
        min='0'
        max='1'
        step='0.001'
        :value='alphaSettings.decay'
        @input="onAlphaSettingsChange('decay', $event)"
      )
      label.input-group-text(for='wc-f-y-a-min') α-min
      input#wc-f-y-a-min.form-control(
        type='number'
        min='0'
        max='1'
        step='0.001'
        :value='alphaSettings.min'
        @input="onAlphaSettingsChange('min', $event)"
      )
      label.input-group-text(for='wc-f-y-a-target') α-target
      input#wc-f-y-a-target.form-control(
        type='number'
        :value='alphaSettings.target'
        min='0'
        max='1'
        step='0.001'
        @input="onAlphaSettingsChange('target', $event)"
      )
      .input-group-text α
      .input-group-text(
        :class='{"bg-teal-light": running}'
        style='min-width: 10ch;'
      ) {{ toFixed(alpha) }}
</template>

<script setup lang="ts">
import {computed} from 'vue';
import {toFixed} from '@/lib/math-utils';
import type {
  WordCloudBaseForceParams,
  WordCloudForceAlphaSettings,
} from '@/composition/WordCloud';
import {isHtmlInputElement} from '@/utils';

interface Props {
  name: string;
  params: WordCloudBaseForceParams;
  alphaSettings: WordCloudForceAlphaSettings;
  alpha: number;
}
const props = defineProps<Props>();

const emit = defineEmits<{
  (event: 'params-change', params: Partial<WordCloudBaseForceParams>): void;
  (
    event: 'alpha-settings-change',
    alphaSettings: Partial<WordCloudForceAlphaSettings>,
  ): void;
}>();

const running = computed(() => props.alpha >= props.alphaSettings.min);

const onParamsChange = (k: keyof WordCloudBaseForceParams, evt: Event) => {
  const t = evt.target;
  if (!isHtmlInputElement(t)) return;

  switch (k) {
    case 'strength':
      onNumberParamChange(k, t);
      break;
    case 'enabled':
      onBooleanParamChange(k, t);
      break;
  }
};

const onNumberParamChange = (
  k: keyof WordCloudBaseForceParams,
  t: HTMLInputElement,
) => {
  if (t.type !== 'number') {
    console.warn('onNumberParamChange: input type is not number', t);
    return;
  }
  const val = Number.parseFloat(t.value);
  emit('params-change', {[k]: val});
};

const onBooleanParamChange = (
  k: keyof WordCloudBaseForceParams,
  t: HTMLInputElement,
) => {
  if (t.type !== 'checkbox') {
    console.warn('onBooleanParamChange: input type is not checkbox', t);
    return;
  }
  emit('params-change', {[k]: t.checked});
};

const onAlphaSettingsChange = (
  k: keyof WordCloudForceAlphaSettings,
  evt: Event,
) => {
  const t = evt.target;
  if (!isHtmlInputElement(t)) return;

  switch (k) {
    case 'target':
    case 'decay':
    case 'min':
      onNumberAlphaSettingChange(k, t);
      break;
  }
};

const onNumberAlphaSettingChange = (
  k: keyof WordCloudForceAlphaSettings,
  t: HTMLInputElement,
) => {
  if (t.type !== 'number') {
    console.warn('onNumberAlphaSettingChange: input type is not number', t);
    return;
  }
  const val = Number.parseFloat(t.value);
  emit('alpha-settings-change', {[k]: val});
};
</script>

<style lang="scss">
.force-control .input-group-title {
  min-width: 6ch;
  max-width: 6ch;
}
.force-control .form-control {
  min-width: 11ch !important;
}
</style>
