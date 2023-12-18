<!-- SPDX-License-Identifier: BSD-2-Clause
     Copyright (c) 2022, Jari Hämäläinen, Carita Kiili and Julie Coiro -->
<template lang="pug">
.d-flex.flex-column.claim-perspective.mb-2.tabbed-box(
  :data-perspective-id='perspective.id'
)
  .d-flex.justify-content-between.claim-perspective-titles.px-2
    .d-block.tabbed-box-tab.p-1.claim-perspective-title.flex-grow-1.w-100.me-2-last-0.position-relative(
      v-for='(title, i) in titles'
      :key='`perspective-${perspective.id}-title-${title}`'
    )
      .d-flex.align-items-center.me-4(
        :class='{"drag-handle": i === 0}'
      ) {{ title }}
        i.bi.bi-grip-horizontal.fs-5.ms-3(v-if='i === 0')
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
      Sortable(
        :list='perspective.argumentsFor'
        tag='div'
        item-key='id'
        :options='sortableOptions'
        :data-perspective-id='props.perspective.id'
        :data-argument-list='"for"'
        @end='onSortableEnd'
      )
        template(#item='{element: argument}')
          ArgumentEditor(
            :argument='argument'
            kind='for'
            @remove-argument-for='$emit("remove-argument-for", $event)'
            @modified='$emit("modified")'
            @reliability-set='$emit("edit-argument-for", argument)'
          )
      button.btn.btn-sm.btn-oit-add.w-100(
        @click='$emit("add-argument-for")'
      ) {{ tc('btn.argument-for-add.text') }}
    .d-flex.flex-column.claim-perspective-column
      Sortable(
        :list='perspective.argumentsAgainst'
        tag='div'
        item-key='id'
        :options='sortableOptions'
        :data-perspective-id='props.perspective.id'
        :data-argument-list='"against"'
        @end='onSortableEnd'
      )
        template(#item='{element: argument}')
          ArgumentEditor(
            :argument='argument'
            kind='against'
            @remove-argument-against='$emit("remove-argument-against", $event)'
            @modified='$emit("modified")'
            @reliability-set='$emit("edit-argument-against", argument)'
          )
      button.btn.btn-sm.btn-oit-add.w-100(
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
import {computed, ref} from 'vue';
import {useI18n} from 'vue-i18n';
import {isArgumentKind, type Argument, type Perspective} from '../model';
import ArgumentEditor from '@/components/ArgumentEditor.vue';
import {Sortable} from 'sortablejs-vue3';
import {type SortableEvent, type Options as SortableOptions} from 'sortablejs';
import {type MoveArgumentOpts} from '@/stores/main';

interface Props {
  perspective: Perspective;
}
const props = defineProps<Props>();

const emit = defineEmits<{
  (event: 'add-argument-for'): void;
  (event: 'add-argument-against'): void;
  (event: 'remove-argument-for', argument: Argument): void;
  (event: 'remove-argument-against', argument: Argument): void;
  (event: 'edit-argument-for', argument: Argument): void;
  (event: 'edit-argument-against', argument: Argument): void;
  (event: 'move-argument', opts: MoveArgumentOpts): void;
  (event: 'remove'): void;
  (event: 'modified'): void;
}>();

const sortableOptions = ref<SortableOptions>({
  animation: 300,
  group: 'arguments',
  handle: '.drag-handle',
});

const onSortableEnd = (event: SortableEvent) => {
  const fromPrsId = event.from.dataset.perspectiveId;
  const fromArgKind = event.from.dataset.argumentList;
  const fromIndex = event.oldIndex;
  const toPrsId = event.to.dataset.perspectiveId;
  const toArgKind = event.to.dataset.argumentList;
  const toIndex = event.newIndex;

  if (
    typeof fromPrsId === 'string' &&
    typeof toPrsId === 'string' &&
    isArgumentKind(fromArgKind) &&
    isArgumentKind(toArgKind) &&
    typeof fromIndex === 'number' &&
    typeof toIndex === 'number'
  ) {
    // Remove the dragged element to prevent duplicates. We force Vue
    // to refresh the list by changing moved argument's id but Vue
    // may not / will not take care of elements moved outside Vue.
    event.item.remove();
    emit('move-argument', {
      fromPrsId,
      fromArgKind,
      fromIndex,
      toPrsId,
      toArgKind,
      toIndex,
    });
  }
};

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
