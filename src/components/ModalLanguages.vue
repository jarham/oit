<!-- SPDX-License-Identifier: BSD-2-Clause
     Copyright (c) 2022, Jari Hämäläinen, Carita Kiili and Julie Coiro -->
<template lang="pug">
.modal(ref='elModal')
  .modal-dialog
    .modal-content
      .modal-header
        h5.modal-title {{ tc('text.title') }}
        button.btn-close(data-bs-dismiss='modal' :aria-label='tc("btn.close.aria-label")')
      .modal-body
        ul.list-group.language-popup
          li.list-group-item.list-group-item-action(
            v-for='l in languages'
            @click='$emit("set-language", l)'
          ) {{ l.name }}
      .modal-footer
        button.btn.btn-outline-secondary(data-bs-dismiss='modal') {{ tc('btn.cancel.text') }}
</template>

<script setup lang="ts">
import {onBeforeUnmount, onMounted, ref} from 'vue';
import {useI18n} from 'vue-i18n';
import type {OitLanguage} from '@/composition/ModalLanguages';
import {Modal} from 'bootstrap';

interface Props {
  languages: OitLanguage[];
}
defineProps<Props>();
defineEmits<{
  (event: 'set-language', lang: OitLanguage): void;
}>();

const {t} = useI18n();
const tc = (s: string) => t(`component.modal-languages.${s}`);

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
