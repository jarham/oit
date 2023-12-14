<!-- SPDX-License-Identifier: BSD-2-Clause
     Copyright (c) 2023, Jari Hämäläinen, Carita Kiili and Julie Coiro -->
<template lang="pug">
ModalBase.modal-perspective-palette(
  v-bind='bind'
  ref='modal'
)
  template(#body)
    PerspectivePalette.mx-3(
      v-bind='ppProps'
      ref='perspectivePalette'
    )
</template>

<script setup lang="ts">
import {onBeforeUnmount, onMounted, ref, watch} from 'vue';
import {useI18n} from 'vue-i18n';
import PerspectivePalette from '@/components/PerspectivePalette.vue';
import ModalBase from '@/components/ModalBase.vue';
import useModalBase from '@/composition/ModalBase';
import usePerspectivePalette from '@/composition/PerspectivePalette';
import {useSupportedLocales} from '@/vue-plugins/plugin-supported-locales';
import {isHtmlDivElement} from '@/utils';

const {locale, t} = useI18n();

const locales = useSupportedLocales();
const words: Record<string, string[]> = Object.fromEntries(
  locales.map<[string, string[]]>((l) => {
    // Composition api of vue-i18n has only 1 and 3 argument
    // versions. Use "plural" version with plural set to 1
    // to get words in locale l.
    const localeWords = t(
      `component.modal-perspective-palette.text.perspectives`,
      1,
      {locale: l},
    )
      .split('\n')
      .map((w) => w.trim())
      .filter((w) => !!w);
    return [l, localeWords];
  }),
);

const ppProps = usePerspectivePalette(words, locale.value, 'none');

// Forward locale change to perspective palette
watch(locale, (l) => (ppProps.value.locale = l));

const modal = ref<InstanceType<typeof ModalBase>>();
const {modalInterface, bind} = useModalBase(modal, {
  haveBtnOk: false,
  txtTitle: 'component.modal-perspective-palette.text.title',
  txtBtnCancel: 'component.modal-perspective-palette.btn.close.text',
  ariaBtnClose: 'component.modal-perspective-palette.btn.close.aria-label',
});
const perspectivePalette = ref<InstanceType<typeof PerspectivePalette>>();

defineExpose({
  ...modalInterface,
  show: () => {
    modalInterface.show();
    perspectivePalette.value?.showPalette(true);
  },
});

// Track preferred perspective palette size by checking `--oit-perspective-palette-size`
// custom property value which is set in style below.
const checkSize = () => {
  if (!modal.value) return;
  const el = modal.value.$el;
  if (!isHtmlDivElement(el)) return;
  const currentSize = getComputedStyle(el)
    .getPropertyValue('--oit-perspective-palette-size')
    .replaceAll('"', '') as 'l' | 'm' | 's' | 'scaling';
  if (ppProps.value.size === 'none') {
    ppProps.value.size = currentSize;
    return;
  }
  if (ppProps.value.size == currentSize) return;
  ppProps.value.size = currentSize;
};

onMounted(() => {
  window.addEventListener('resize', checkSize);
  checkSize();
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', checkSize);
});
</script>
<style lang="scss">
// Change modal sizing a bit with perspective palette: We want modal
// to "wrap its content" by using `max-width: none` and `width: min-content`
// (except in "scaling" mode where we just unset the max-width).
// Actual size get defined by perspective palette svg / plaholder and
// their size must match sizes in PerspectivePalette.vue.
.modal-perspective-palette {
  --oit-perspective-palette-size: 'scaling';
  .modal-dialog {
    max-width: none;
  }
}
@media (min-width: 576px) {
  .modal-perspective-palette {
    --oit-perspective-palette-size: 's';
    .modal-dialog {
      width: min-content;
      .perspective-palette-svg,
      .perspective-palette-placeholder {
        width: 490px;
        height: 600px;
      }
    }
  }
}
@media (min-width: 680px) {
  .modal-perspective-palette {
    --oit-perspective-palette-size: 'm';
    .modal-dialog {
      width: min-content;
      .perspective-palette-svg,
      .perspective-palette-placeholder {
        width: 600px;
        height: 500px;
      }
    }
  }
}
@media (min-width: 820px) {
  .modal-perspective-palette {
    --oit-perspective-palette-size: 'l';
    .modal-dialog {
      width: min-content;
      .perspective-palette-svg,
      .perspective-palette-placeholder {
        width: 740px;
        height: 500px;
      }
    }
  }
}
</style>
