<!-- SPDX-License-Identifier: BSD-2-Clause
     Copyright (c) 2022, Jari Hämäläinen, Carita Kiili and Julie Coiro -->
<template lang="pug">
ModalBase.modal-argument-editor(
  v-bind='bind'
  ref='modal'
  @shown='onShown'
  @ok='modalInterface.hide'
)
  template(#body)
    ArgumentEditor(
      :argument='argument'
      :kind='kind'
      :hide-remove-button='true'
      :hide-drag-handle='true'
      @modified='$emit("modified")'
    )
    textarea.form-control(
      ref='txtJustify'
      v-model='argument.justification'
      :placeholder='tc("placeholder.justification")'
      rows='6'
      @input='$emit("modified")'
    )
</template>

<script setup lang="ts">
import {computed, ref} from 'vue';
import {useI18n} from 'vue-i18n';
import type {Argument, ArgumentKind} from '@/model';
import ArgumentEditor from '@/components/ArgumentEditor.vue';
import ModalBase from '@/components/ModalBase.vue';
import useModalBase from '@/composition/ModalBase';

interface Props {
  argument: Argument;
  kind: ArgumentKind;
}
const props = defineProps<Props>();
defineEmits<{
  (event: 'modified'): void;
}>();

const txtJustify = ref<HTMLTextAreaElement>();

const {t} = useI18n();
const tc = (s: string) => t(`component.modal-argument-editor.${s}`);

const modal = ref<InstanceType<typeof ModalBase>>();
const {modalInterface, bind} = useModalBase(modal, {
  haveBtnCancel: false,
  clsDialog: ['modal-lg'],
  clsBody: ['overflow-auto'],
  txtTitle: computed(
    () => `component.modal-argument-editor.text.title-argument-${props.kind}`,
  ),
  txtBtnOk: 'component.modal-argument-editor.btn.done.text',
  ariaBtnClose: 'component.modal-argument-editor.btn.close.aria-label',
});

const onShown = () => txtJustify.value?.focus();

defineExpose({...modalInterface});
</script>

<style lang="scss">
.modal-argument-editor .modal-content {
  max-height: 94vh;
}
</style>
