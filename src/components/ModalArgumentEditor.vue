<!-- SPDX-License-Identifier: BSD-2-Clause
     Copyright (c) 2022, Jari Hämäläinen, Carita Kiili and Julie Coiro -->
<template lang="pug">
.modal.modal-argument-editor(ref='elModal')
  .modal-dialog.modal-lg
    .modal-content
      .modal-header
        h5.modal-title {{ tc(`text.title-argument-${kind}`) }}
        button.btn-close(data-bs-dismiss='modal' :aria-label='tc("btn.close.aria-label")')
      .modal-body.overflow-auto
        ArgumentEditor(
          :argument='argument'
          :kind='kind'
          :hide-remove-button='true'
          :hide-drag-handle='true'
          @modified='$emit("modified")'
        )
        textarea.form-control(
          v-model='argument.justification'
          :placeholder='tc("placeholder.justification")'
          rows='6'
          @input='$emit("modified")'
        )
      .modal-footer
        button.btn.btn-outline-primary(data-bs-dismiss='modal') {{ tc('btn.done.text') }}
</template>

<script setup lang="ts">
import {onBeforeUnmount, onMounted, ref} from 'vue';
import {useI18n} from 'vue-i18n';
import {Modal} from 'bootstrap';
import type {Argument, ArgumentKind} from '@/model';
import ArgumentEditor from '@/components/ArgumentEditor.vue';

interface Props {
  argument: Argument;
  kind: ArgumentKind;
}
defineProps<Props>();
defineEmits<{
  (event: 'modified'): void;
}>();

const {t} = useI18n();
const tc = (s: string) => t(`component.modal-argument-editor.${s}`);

const elModal = ref<HTMLDivElement>();
let modal: Modal | null = null;

onMounted(() => {
  if (!elModal.value) return;
  modal = new Modal(elModal.value);
});
onBeforeUnmount(() => {
  if (modal) {
    modal.dispose();
  }
  modal = null;
});

const show = () => modal?.show();
const hide = () => modal?.hide();

defineExpose({show, hide});
</script>

<style lang="scss">
.modal-argument-editor .modal-content {
  max-height: 94vh;
}
</style>
