<template lang="pug">
section.argument-editor
  .d-flex
    textarea.form-control.mb-1(
      v-model='argument.argument'
      rows='6'
      :placeholder='tc(`placeholder.argument-${kind}`)'
      @input='$emit("modified")'
    ).me-1
    .d-flex.flex-column
      button.btn-close.btn-sm.align-self-center.mb-1(
        :aria-label='tc(`btn.argument-${kind}-remove.aria-label`)'
        :title='tc(`btn.argument-${kind}-remove.aria-label`)'
        @click='onRemove'
      )
      TrafficLights.mb-1(
        v-model='argument.reliability'
        @modified='$emit("modified")'
      )
      .btn.drag-handle.px-0
        i.bi.bi-grip-vertical.fs-5
  input.form-control.mb-1(
    v-model='argument.source'
    type='text'
    :placeholder='tc(`placeholder.source-${kind}`)'
    @input='$emit("modified")'
  )
</template>

<script setup lang="ts">
import {useI18n} from 'vue-i18n';
import type {Argument, ArgumentKind} from '@/model';
import TrafficLights from '@/components/TrafficLights.vue';

interface Props {
  argument: Argument;
  kind: ArgumentKind;
}
const props = defineProps<Props>();

const emit = defineEmits<{
  (event: 'remove-argument-for', argument: Argument): void;
  (event: 'remove-argument-against', argument: Argument): void;
  (event: 'modified'): void;
}>();

const {t} = useI18n();
const tc = (s: string) => t(`component.argument-editor.${s}`);

const onRemove = () => {
  if (props.kind === 'for') emit('remove-argument-for', props.argument);
  else emit('remove-argument-against', props.argument);
};
</script>
