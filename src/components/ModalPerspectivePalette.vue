<!-- SPDX-License-Identifier: BSD-2-Clause
     Copyright (c) 2022, Jari Hämäläinen, Carita Kiili and Julie Coiro -->
<template lang="pug">
ModalBase.modal-perspective-palette(
  v-bind='bind'
  ref='modal'
  @hidden='onHidden'
)
  template(#body)
    WordCloud.mx-3(
      v-bind='wcProps'
      ref='wordCloud'
    )
</template>

<script setup lang="ts">
import {onBeforeUnmount, onMounted, ref, watch} from 'vue';
import {useI18n} from 'vue-i18n';
import WordCloud from '@/components/WordCloud.vue';
import ModalBase from '@/components/ModalBase.vue';
import useModalBase from '@/composition/ModalBase';
import useWordCloud from '@/composition/WordCloud';
import {useSupportedLocales} from '@/vue-plugins/plugin-supported-locales';

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

const wcProps = useWordCloud(words, locale.value, 'none');
watch(locale, (l) => (wcProps.value.locale = l));

const modal = ref<InstanceType<typeof ModalBase>>();
const {modalInterface, bind} = useModalBase(modal, {
  haveBtnOk: false,
  // clsDialog: ['modal-lg'],
  // clsBody: ['overflow-auto'],
  txtTitle: 'component.modal-perspective-palette.text.title',
  txtBtnCancel: 'component.modal-perspective-palette.btn.close.text',
  ariaBtnClose: 'component.modal-perspective-palette.btn.close.aria-label',
});
const wordCloud = ref<InstanceType<typeof WordCloud>>();

// Skip 2 frame before animating words. This way
// initial placement can actually be seen.
// let wantToStart = false;
// let startDelayCounter = 0;
// const startDelayOnShow = 2;
// const startFn = () => {
//   if (!wantToStart) return;
//   if (startDelayCounter++ < startDelayOnShow) {
//     requestAnimationFrame(startFn);
//   } else {
//     wantToStart = false;
//     wordCloud.value?.start();
//   }
// };
defineExpose({
  ...modalInterface,
  show: () => {
    modalInterface.show();
    wordCloud.value?.showPalette(true);
    // wantToStart = true;
    // startDelayCounter = 0;
    // if (wasRunning) {
    //   requestAnimationFrame(startFn);
    // }
  },
  updateWords: () => {
    // wordCloud.value?.stop();
    // wcProps.value.words = tc('text.perspectives')
    //   .split('\n')
    //   .map((w) => w.trim())
    //   .filter((w) => !!w);
    // wordCloud.value?.reset();
  },
});

const onHidden = () => {
  // wantToStart = false;
  // startDelayCounter = 0;
  // wordCloud.value?.stop();
};

const isDiv = (o: any): o is HTMLDivElement => {
  return !!o && 'tagName' in o && o.tagName === 'DIV';
};
const checkSize = () => {
  if (!modal.value) return;
  const el = modal.value.$el;
  if (!isDiv(el)) return;
  const currentSize = getComputedStyle(el)
    .getPropertyValue('--oit-perspective-palette-size')
    .replaceAll('"', '') as 'l' | 'm' | 's' | 'scaling';
  if (wcProps.value.size === 'none') {
    wcProps.value.size = currentSize;
    // lastSize = currentSize;
    console.log('lastSize', wcProps.value.size);
    return;
  }
  if (wcProps.value.size == currentSize) return;
  // wordCloud.value?.reset();
  wcProps.value.size = currentSize;
  console.log('lastSize', wcProps.value.size);
};
onMounted(() => {
  window.addEventListener('resize', checkSize);
  checkSize();
});
onBeforeUnmount(() => {
  window.removeEventListener('resize', checkSize);
  // wantToStart = false;
});
</script>
<style lang="scss">
// Change modal sizing a bit with perspective palette:
// - keep 800px width until really close hitting borders
// - extra step until 680px
// - at default 576px breakpoint modal-lg starts scaling with width
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
      .word-cloud-svg,
      .word-cloud-placeholder {
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
      .word-cloud-svg,
      .word-cloud-placeholder {
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
      .word-cloud-svg,
      .word-cloud-placeholder {
        width: 740px;
        height: 500px;
      }
    }
  }
}
</style>
