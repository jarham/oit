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
    Draggable(
      v-model='data.perspectives'
      group='perspectives'
      item-key='id'
      handle='.drag-handle'
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
import {useStore} from '@/stores/main';
import {storeToRefs} from 'pinia';
import Draggable from 'vuedraggable';
import PerspectiveEditor from '@/components/PerspectiveEditor.vue';
import TitledNotes from '@/components/TitledNotes.vue';
import ModalArgumentEditor from '@/components/ModalArgumentEditor.vue';
import {ref} from 'vue';
import type {Argument, ArgumentKind, Perspective} from '@/model';
import {useConfirmDialog} from '@/vue-plugins/plugin-confirm-dialog';

const {t} = useI18n();
const tc = (s: string) => t(`component.inquiry-editor.${s}`);

const store = useStore();
const {data, dirty} = storeToRefs(store);

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
</script>
