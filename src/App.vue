<!-- SPDX-License-Identifier: BSD-2-Clause
     Copyright (c) 2022, Jari Hämäläinen, Carita Kiili and Julie Coiro -->
<template lang="pug">
section.app
  .container.mt-1
    //- TODO: For some reason .mb-3 in TopBar is not showing in generated code, bug in Vite?
    TopBar.mb-3(
      @show-languages='showLanguages'
      @show-about='showAbout'
      @show-instructions='showInstructions'
      @chart-new='onChartNew'
      @chart-save='onChartSave'
      @chart-open='onChartOpen'
    )
    MainView
    ModalLanguages(
      :languages='languages'
      @set-language='onSetLanguage'
      ref='mdlLanguages'
    )
    ModalAbout(
      ref='mdlAbout'
    )
    ModalInstructions(ref='mdlInstructions')
    ModalConfirm
    ModalChartSave(
      ref='mdlSave'
      @chart-save-as='onChartSaveAs'
    )
</template>

<script setup lang="ts">
import {onMounted, ref, watch} from 'vue';
import {useI18n} from 'vue-i18n';
import {storeToRefs} from 'pinia';
import {saveAs} from 'file-saver';
import type {OitLanguage} from '@/composition/ModalLanguages';
import useModalLanguages from '@/composition/ModalLanguages';
import TopBar from '@/components/TopBar.vue';
import ModalAbout from '@/components/ModalAbout.vue';
import ModalLanguages from '@/components/ModalLanguages.vue';
import ModalInstructions from '@/components/ModalInstructions.vue';
import ModalConfirm from '@/components/ModalConfirm.vue';
import ModalChartSave from '@/components/ModalChartSave.vue';
import MainView from '@/views/MainView.vue';
import {useStore} from '@/stores/main';
import {useConfirmDialog} from '@/vue-plugins/plugin-confirm-dialog';
import printToHtml from '@/print/print';
import type {PrintTranslations} from '@/print/print';
import {unflatten} from 'flat';

const store = useStore();
const {data, dirty} = storeToRefs(store);

const dlgConfirm = useConfirmDialog();

const {availableLocales, locale, t} = useI18n();
const {languages} = useModalLanguages(
  availableLocales
    .slice(0) // slice makes a copy preventing "sort in place" side effect
    .sort()
    .map((locale) => ({
      locale,
      name: t(`language.${locale}`, {locale: 'en'}),
    })),
);

const mdlLanguages = ref<InstanceType<typeof ModalLanguages>>();
const mdlAbout = ref<InstanceType<typeof ModalAbout>>();
const mdlInstructions = ref<InstanceType<typeof ModalInstructions>>();
const mdlSave = ref<InstanceType<typeof ModalChartSave>>();

onMounted(() => {
  resetModel();
  setPageTitle();
});

const setPageTitle = () => {
  document.title = t('page.title');
};

const onSetLanguage = (l: OitLanguage) => {
  locale.value = l.locale;
  mdlLanguages.value?.hide();
  setPageTitle();
};
const showLanguages = () => {
  mdlLanguages.value?.show();
};
const showAbout = () => {
  mdlAbout.value?.show();
};
const showInstructions = () => {
  mdlInstructions.value?.show();
};

const onChartNew = async () => {
  if (dirty.value) {
    const confirmed = await dlgConfirm.confirm('chart-new-unsaved');
    if (!confirmed) return;
  }
  resetModel();
};

const resetModel = () => {
  store.newModel();
};

const onChartSave = () => {
  mdlSave.value?.show();
};
const onChartSaveAs = (filename: string) => {
  const translations = unflatten<{[key: string]: string}, PrintTranslations>(
    Object.fromEntries(
      store.saveTemplateKeys.map((k) => {
        const tkey = k.replace(/^t\./, '');
        return [tkey, t(`save-template.${tkey}`)];
      }),
    ),
  );
  const doc = printToHtml(data.value, translations);
  const blob = new Blob([doc], {type: 'text/html;charset=utf-8'});
  saveAs(blob, filename);
  dirty.value = false;
};

const onChartOpen = (hmtlSource: string, filename: string) => {
  store.loadHtmlAsModel(hmtlSource, filename);
};

const beforeUnloadHandler = (evt: Event) => {
  if (dirty.value) {
    evt.preventDefault();
    return (evt.returnValue = t('misc.leaving-unsaved') as any);
  }
};
watch(dirty, (dirty) => {
  if (dirty) addEventListener('beforeunload', beforeUnloadHandler);
  else removeEventListener('beforeunload', beforeUnloadHandler);
});
</script>

<style lang="scss">
@use '../node_modules/bootstrap' as bs;
@use '../node_modules/bootstrap-icons' as bsi;

.me-2-last-0 {
  @extend .me-2;
  &:last-child {
    @extend .me-0;
  }
}

.drag-handle {
  cursor: grab;
  border: none;
}

.tabbed-box {
  .tabbed-box-tab {
    @extend .border;
    @extend .border-dark;
    @extend .border-bottom-0;
    @extend .rounded-top;
    @extend .bg-white;
    position: relative;
    &::after {
      @extend .bg-white;
      @extend .rounded-top;
      position: absolute;
      content: '\00a0';
      height: 1px;
      bottom: -1px;
      left: 0;
      right: 0;
    }
  }
  .tabbed-box-body {
    @extend .border;
    @extend .border-dark;
    @extend .rounded;
  }
}
</style>
