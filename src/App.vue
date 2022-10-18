<!-- SPDX-License-Identifier: BSD-2-Clause
     Copyright (c) 2022, Jari Hämäläinen, Carita Kiili and Julie Coiro -->
<template lang="pug">
section.app
  .container.mt-1
    //- TODO: For some reason .mb-3 in TopBar is not showing in generated code, bug in Vite?
    TopBar.mb-3(
      @show-languages='showLanguages'
      @show-about='showAbout'
      @show-perspective-palette='showPerspectivePalette'
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
    ModalPerspectivePalette(ref='mdlPerspectivePalette')
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
import ModalPerspectivePalette from '@/components/ModalPerspectivePalette.vue';
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
const mdlPerspectivePalette =
  ref<InstanceType<typeof ModalPerspectivePalette>>();
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
const showPerspectivePalette = () => {
  mdlPerspectivePalette.value?.show();
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
@use '../node_modules/bootstrap-icons' as bsi;
@use 'sass:color';

// font-size-base and (h1-h6)-font-size are the same as in
// bootstrap. added h7*
$font-size-base: 1rem;
$h1-font-size: $font-size-base * 2.5;
$h2-font-size: $font-size-base * 2;
$h3-font-size: $font-size-base * 1.75;
$h4-font-size: $font-size-base * 1.5;
$h5-font-size: $font-size-base * 1.25;
$h6-font-size: $font-size-base;
$h7-font-size: $font-size-base * 0.875;
$font-sizes: (
  1: $h1-font-size,
  2: $h2-font-size,
  3: $h3-font-size,
  4: $h4-font-size,
  5: $h5-font-size,
  6: $h6-font-size,
  7: $h7-font-size,
);
@import '../node_modules/bootstrap/scss/bootstrap';

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
.bg-teal {
  background-color: $teal;
}
.bg-teal-light {
  background-color: color.adjust($teal, $lightness: +30%);
}
.input-group-titled > :first-child {
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
  margin-left: -1px;
}
.input-group-titled:not(:first-child) {
  margin-top: -1px;
}
.input-group-titled:first-child:not(:last-child) > :last-child {
  // border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}
.input-group-titled:not(:first-child):not(:last-child) > :last-child {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}
.input-group-titled:not(:first-child):last-child > :last-child {
  border-top-right-radius: 0;
  // border-bottom-right-radius: 0;
}
.input-group-title {
  @extend .input-group-text;
  @extend .py-1;
  @extend .px-2;
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
  display: inline-block;
  text-align: left;
}
.input-group-title-sm {
  @extend .fs-7;
}
.input-group-text-for-cb {
  border-right: none;
}
.input-group-text-for-cb + .input-group-text {
  border-left: none;
}
</style>
