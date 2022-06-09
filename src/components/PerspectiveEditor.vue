<!-- SPDX-License-Identifier: BSD-2-Clause
     Copyright (c) 2022, Jari Hämäläinen, Carita Kiili and Julie Coiro -->
<template lang="pug">
.d-flex.flex-column.claim-perspective.mb-2.tabbed-box
  .d-flex.justify-content-between.claim-perspective-titles.px-2
    .d-block.tabbed-box-tab.p-1.claim-perspective-title.flex-grow-1.w-100.me-2-last-0.position-relative(
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
  .d-flex.justify-content-between.claim-perspective-body.tabbed-box-body.px-2
    .d-flex.flex-column.claim-perspective-column
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
    .d-flex.flex-column.claim-perspective-column
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
            @reliability-set='$emit("edit-argument-for", argument)'
          )
      button.btn.btn-sm.btn-success.w-100(
        @click='$emit("add-argument-for")'
      ) {{ tc('btn.argument-for-add.text') }}
    .d-flex.flex-column.claim-perspective-column
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
            @reliability-set='$emit("edit-argument-against", argument)'
          )
      button.btn.btn-sm.btn-success.w-100(
        @click='$emit("add-argument-against")'
      ) {{ tc('btn.argument-against-add.text') }}
    .d-flex.flex-column.claim-perspective-column
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
  (event: 'edit-argument-for', argument: Argument): void;
  (event: 'edit-argument-against', argument: Argument): void;
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

<style lang="scss">
@use '../../node_modules/bootstrap' as bs;
.claim-perspective textarea {
  resize: none;
}
.claim-perspective-column {
  width: 100% !important;
  padding-top: map-get(bs.$spacers, 1);
  padding-bottom: map-get(bs.$spacers, 1);
  &:not(:first-child) {
    padding-left: map-get(bs.$spacers, 1);
    border-left-color: bs.$dark;
    border-left-width: 1px;
    border-left-style: solid;
  }
  &:not(:last-child) {
    padding-right: calc(map-get(bs.$spacers, 1) + 1px);
  }
}
</style>
