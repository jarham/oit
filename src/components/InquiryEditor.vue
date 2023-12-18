<!-- SPDX-License-Identifier: BSD-2-Clause
     Copyright (c) 2022, Jari Hämäläinen, Carita Kiili and Julie Coiro -->
<template lang="pug">
section.inquiry-editor
  TitledNotes.mb-3(
    :title='tc("claim.title")'
    :model-value='data.claim'
    :placeholder='tc("claim.placeholder")'
    @update:model-value='store.updateClaim($event)'
  )
  section
    Sortable.claim-perspective-list(
      :list='data.perspectives'
      tag='div'
      item-key='id'
      :options='sortableOptions'
      @end='onSortableEnd'
    )
      template(#item='{element: p}')
        PerspectiveEditor(
          :key='p.id'
          :perspective='p'
          @add-argument-for='store.addArgument(p, "for")'
          @add-argument-against='store.addArgument(p, "against")'
          @remove-argument-for='onRemoveArgument(p, "for", $event)'
          @remove-argument-against='onRemoveArgument(p, "against", $event)'
          @remove='onRemovePerspective(p)'
          @edit-argument-for='onEditArgument("for", $event)'
          @edit-argument-against='onEditArgument("against", $event)'
          @move-argument='onMoveArgument'
          @modified='dirty = true'
        )
  button.btn.btn-sm.btn-oit-add.w-100.mb-2(
    @click='store.addPerspective()'
  ) {{ tc('btn.perspective-add.text') }}
  TitledNotes(
    :title='tc("conclusion.title")'
    :model-value='data.conclusion'
    :placeholder='tc("conclusion.placeholder")'
    :rows='10'
    @update:model-value='store.updateConclusion($event)'
  )
  ModalArgumentEditor(
    ref='mdlArgEditor'
    :argument='jstArgument'
    :kind='jstKind'
    @modified='dirty = true'
  )
</template>

<script setup lang="ts">
import {useI18n} from 'vue-i18n';
import {type MoveArgumentOpts, useStore} from '@/stores/main';
import {storeToRefs} from 'pinia';
import PerspectiveEditor from '@/components/PerspectiveEditor.vue';
import TitledNotes from '@/components/TitledNotes.vue';
import ModalArgumentEditor from '@/components/ModalArgumentEditor.vue';
import {computed, ref} from 'vue';
import type {Argument, ArgumentKind, Perspective} from '@/model';
import {useConfirmDialog} from '@/vue-plugins/plugin-confirm-dialog';
import {Sortable} from 'sortablejs-vue3';
import {type SortableEvent, type SortableOptions} from 'sortablejs';

const {t} = useI18n();
const tc = (s: string) => t(`component.inquiry-editor.${s}`);

const store = useStore();
const {data, dirty} = storeToRefs(store);

const sortableOptions = ref<SortableOptions>({
  animation: 300,
  group: 'perspectives',
  handle: '.drag-handle',
});

const mdlArgEditor = ref<InstanceType<typeof ModalArgumentEditor>>();

const dlgConfirm = useConfirmDialog();

const emptyArgument = {
  argument: '',
  source: '',
  reliability: null,
  justification: '',
  id: `arg-placeholder}`,
};
const jstArgument = ref<Argument>(emptyArgument);
const jstKind = ref<ArgumentKind>('against');

const onEditArgument = (kind: ArgumentKind, argument: Argument) => {
  jstArgument.value = argument;
  jstKind.value = kind;
  mdlArgEditor.value?.show();
};

const onMoveArgument = (moveOpts: MoveArgumentOpts) => {
  store.moveArgument(moveOpts);
};

const onRemovePerspective = async (p: Perspective) => {
  const confirmed = await dlgConfirm.confirm('perspective-remove');
  if (!confirmed) return;
  store.removePerspective(p);
};

const onRemoveArgument = async (
  target: Perspective,
  kind: ArgumentKind,
  arg: Argument,
) => {
  const confirmed = await dlgConfirm.confirm(`argument-${kind}-remove`);
  if (!confirmed) return;
  store.removeArgument(target, kind, arg);
};

const onSortableEnd = (event: SortableEvent) => {
  const fromIndex = event.oldIndex;
  const toIndex = event.newIndex;

  if (typeof fromIndex === 'number' && typeof toIndex === 'number') {
    // Remove the dragged element to prevent duplicates. We force Vue
    // to refresh the list by changing moved perspectives's id but Vue
    // may not / will not take care of elements moved outside Vue.
    event.item.remove();
    store.movePerspective(fromIndex, toIndex);
  }
};

// we need quotation marks because the value is assigned to
// in css to ::before pseudo element's content.
const txtNoPerspectives = computed(
  () => `"${t('component.perspective-editor.placeholder.no-perspectives')}"`,
);
</script>
<style lang="scss">
.claim-perspective-list:empty {
  border-radius: var(--bs-border-radius-sm);
  margin-bottom: 0.25rem;
  padding: 4px 8px;
  border: 1px dashed var(--bs-secondary);
  position: relative;
  opacity: 0.65;
  &::before {
    position: absolute;
    display: block;
    align-items: center;
    justify-content: center;
    top: 50%;
    left: 0;
    right: 0;
    transform: translateY(-50%);
    display: block;
    content: v-bind(txtNoPerspectives);
    font-size: 0.875rem;
    text-align: center;
    color: var(--bs-secondary);
  }
}
</style>
