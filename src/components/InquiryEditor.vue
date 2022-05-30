<!-- SPDX-License-Identifier: BSD-2-Clause
     Copyright (c) 2022, Jari Hämäläinen, Carita Kiili and Julie Coiro -->
<template lang="pug">
section.view-main
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
      template(v-slot:item='{element: p}')
        PerspectiveEditor(
          :perspective='p'
          :key='p.id'
          @add-argument-for='store.addArgument(p, "for")'
          @add-argument-against='store.addArgument(p, "against")'
          @remove-argument-for='store.removeArgument(p, "for", $event)'
          @remove-argument-against='store.removeArgument(p, "against", $event)'
          @remove='store.removePerspective(p)'
          @edit-argument-for='onEditArgument(p, "for", $event)'
          @edit-argument-against='onEditArgument(p, "against", $event)'
          @modified='dirty = true'
        )
  button.btn.btn-sm.btn-success.w-100.mb-2(
    @click='store.addPerspective()'
  ) {{ tc('btn.perspective-add.text') }}
  TitledNotes(
    :title='tc("conclusion.title")'
    :model-value='data.notes'
    :placeholder='tc("conclusion.placeholder")'
    :rows='10'
    @update:model-value='store.updateNotes($event)'
  )
  ModalArgumentEditor(
    :argument='jstArgument'
    :kind='jstKind'
    ref='mdlArgEditor'
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

const {t} = useI18n();
const tc = (s: string) => t(`component.inquiry-editor.${s}`);

const store = useStore();
const {data, dirty} = storeToRefs(store);

const mdlArgEditor = ref<InstanceType<typeof ModalArgumentEditor>>();

const emptyArgument = {
  argument: '',
  source: '',
  reliability: null,
  justification: '',
  id: `arg-placeholder}`,
};
const jstArgument = ref<Argument>(emptyArgument);
const jstKind = ref<ArgumentKind>('against');

const onEditArgument = (
  perspective: Perspective,
  kind: ArgumentKind,
  argument: Argument,
) => {
  console.log('onEditArgument', perspective, kind, argument);
  jstArgument.value = argument;
  jstKind.value = kind;
  mdlArgEditor.value?.show();
};
</script>
