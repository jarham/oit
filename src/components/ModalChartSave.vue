<!-- SPDX-License-Identifier: BSD-2-Clause
     Copyright (c) 2022, Jari Hämäläinen, Carita Kiili and Julie Coiro -->
<template lang="pug">
ModalBase.modal-chart-save(
  v-bind='bind'
  ref='modal'
  @ok="onSaveAs"
)
  template(v-slot:body)
    .input-group
      .input-group-text {{ tc('input.filename.prompt') }}
      input.form-control(
        type='text'
        :placeholder='tc("input.filename.placeholder")'
        v-model='filename'
      )
      //- '.html' extension is hard coded on purpose
      .input-group-text .html
</template>

<script setup lang="ts">
import {ref} from 'vue';
import {useI18n} from 'vue-i18n';
import {useStore} from '@/stores/main';
import {storeToRefs} from 'pinia';
import ModalBase from '@/components/ModalBase.vue';
import useModalBase from '@/composition/ModalBase';

const emit = defineEmits<{
  (event: 'chart-save-as', filename: string): void;
}>();

const store = useStore();
const {filename} = storeToRefs(store);
const {t} = useI18n();
const tc = (s: string) => t(`component.modal-chart-save.${s}`);

const modal = ref<InstanceType<typeof ModalBase>>();
const {modalInterface, bind} = useModalBase(modal, {
  txtTitle: 'component.modal-chart-save.text.title',
  txtBtnCancel: 'component.modal-chart-save.btn.cancel.text',
  txtBtnOk: 'component.modal-chart-save.btn.save.text',
  ariaBtnClose: 'component.modal-chart-save.btn.close.aria-label',
});

defineExpose({...modalInterface});

const onSaveAs = () => {
  emit('chart-save-as', filename.value);
  modalInterface.hide();
};
</script>
