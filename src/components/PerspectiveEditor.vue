<!-- SPDX-License-Identifier: BSD-2-Clause
     Copyright (c) 2022, Jari Hämäläinen, Carita Kiili and Julie Coiro -->
<template lang="pug">
.d-flex.flex-column.claim-perspective.mb-2
  .d-flex.justify-content-between.claim-perspective-titles.px-2
    .d-block.rounded-top.border.border-bottom-0.p-1.claim-perspective-title.flex-grow-1.w-100.me-2-last-0.position-relative(
      v-for='(title, i) in titles'
    )
      .d-block(
        :class='{"drag-handle": i === 0}'
      ) {{ title }}
      button.btn-close.btn-sm.ms-auto.position-absolute.mt-1(
        v-if='i === 0'
        style='top: 0; right: 0;'
        :aria-label='tc("btn.perspective-remove.aria-label")'
        :title='tc("btn.perspective-remove.title")'
        @click='$emit("remove")'
      )
  .d-flex.justify-content-between.claim-perspective-body.rounded.border.px-2.py-1
    .d-flex.flex-column.w-100.me-1
      textarea.form-control.mb-1(
        v-model='perspective.name'
        rows='2'
        :placeholder='tc("placeholder.perspective")'
        @input='$emit("modified")'
      )
      textarea.form-control(
        v-model='perspective.questions'
        rows='5'
        :placeholder='tc("placeholder.questions")'
        @input='$emit("modified")'
      )
    .d-flex.flex-column.w-100.me-1
      Draggable(
        v-model='perspective.argumentsFor'
        group='arguments'
        item-key='id'
        handle='.drag-handle'
      )
        template(v-slot:item='{element: argument}')
          ArgumentEditor(
            :argument='argument'
            kind='for'
            @remove-argument-for='$emit("remove-argument-for", $event)'
            @modified='$emit("modified")'
          )
      button.btn.btn-sm.btn-success.w-100(
        @click='$emit("add-argument-for")'
      ) {{ tc('btn.argument-for-add.text') }}
    .d-flex.flex-column.w-100.me-1
      Draggable(
        v-model='perspective.argumentsAgainst'
        group='arguments'
        item-key='id'
        handle='.drag-handle'
      )
        template(v-slot:item='{element: argument}')
          ArgumentEditor(
            :argument='argument'
            kind='against'
            @remove-argument-against='$emit("remove-argument-against", $event)'
            @modified='$emit("modified")'
          )
      button.btn.btn-sm.btn-success.w-100(
        @click='$emit("add-argument-against")'
      ) {{ tc('btn.argument-against-add.text') }}
    .d-flex.flex-column.w-100
      textarea.form-control(
        v-model='perspective.synthesis'
        rows='8'
        :placeholder='tc("placeholder.synthesis")'
        @input='$emit("modified")'
      )
</template>

<script setup lang="ts">
import {computed} from 'vue';
import {useI18n} from 'vue-i18n';
import type {Perspective, Argument} from '../model';
import Draggable from 'vuedraggable';
import ArgumentEditor from '@/components/ArgumentEditor.vue';

interface Props {
  perspective: Perspective;
}
defineProps<Props>();
defineEmits<{
  (event: 'add-argument-for'): void;
  (event: 'add-argument-against'): void;
  (event: 'remove-argument-for', argument: Argument): void;
  (event: 'remove-argument-against', argument: Argument): void;
  (event: 'remove'): void;
  (event: 'modified'): void;
}>();

const {t} = useI18n();
const tc = (s: string) => t(`component.perspective-editor.${s}`);

const titles = computed(() =>
  ['perspective', 'arguments-for', 'arguments-against', 'synthesis'].map(
    (prs) => tc(`text.heading.${prs}`),
  ),
);
</script>

<style>
.claim-perspective textarea {
  resize: none;
}
</style>
