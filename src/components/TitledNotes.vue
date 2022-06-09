<!-- SPDX-License-Identifier: BSD-2-Clause
     Copyright (c) 2022, Jari Hämäläinen, Carita Kiili and Julie Coiro -->
<template lang="pug">
.titled-notes.tabbed-box
  .d-inline-block.tabbed-box-tab.p-1.ms-3.title {{ title }}
  .tabbed-box-body.p-1
    textarea.form-control.notes(
      :value='modelValue'
      :class='{"notes-resizable": resizable}'
      :rows='rows'
      :placeholder='placeholder || ""'
      @input='onInput'
    )
</template>

<script setup lang="ts">
import {isHtmlTextareaElement} from '../utils';

interface Props {
  modelValue: string;
  title: string;
  placeholder: string;
  rows?: number;
  resizable?: boolean;
}
defineProps<Props>();
const emit = defineEmits<{
  (event: 'update:model-value', value: string): void;
}>();

const onInput = (evt: Event) => {
  const target = evt.target;
  if (!isHtmlTextareaElement(target)) return;
  emit('update:model-value', target.value);
};
</script>

<style lang="scss">
.titled-notes {
  .title {
    min-width: 40ch;
  }
  .notes {
    resize: none;
    &.notes-resizable {
      resize: vertical;
    }
  }
}
</style>
