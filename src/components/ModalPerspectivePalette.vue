<!-- SPDX-License-Identifier: BSD-2-Clause
     Copyright (c) 2022, Jari Hämäläinen, Carita Kiili and Julie Coiro -->
<template lang="pug">
ModalBase.modal-perspective-palette(
  v-bind='bind'
  ref='modal'
)
  template(v-slot:body)
    WordCloud.mx-3(
      v-bind='wcProps'
      ref='wordCloud'
      @breakpoint='simAutoRun = false'
      @simulation-end='simStopped = true'
    )
    hr
    .input-group.input-group-sm.mb-2
      label.input-group-text(for='wc-coll-shape') Collision shape
      select#wc-coll-shape.form-select(v-model='wcProps.collisionShape')
        option(
          v-for='cs in wordCloudCollisionShapes'
          :value='cs'
        ) {{ cs }}
      .input-group-text Show coll. shape:
      label.input-group-text(for='wc-dbg-show-rectangle') Rectangle
      .input-group-text
        input#wc-dbg-show-rectangle.form-check-input.mt-0(type='checkbox' v-model='wcProps.debugInfo.showCollRectangle')
      label.input-group-text(for='wc-dbg-show-ellipse') Ellipse
      .input-group-text
        input#wc-dbg-show-ellipse.form-check-input.mt-0(type='checkbox' v-model='wcProps.debugInfo.showCollEllipse')
      label.input-group-text(for='wc-dbg-show-polygon') Polygon
      .input-group-text
        input#wc-dbg-show-polygon.form-check-input.mt-0(type='checkbox' v-model='wcProps.debugInfo.showCollPolygon')
    .input-group.input-group-sm.mb-2
      label.input-group-text(for='wc-sim-ellipse-vertex-count') Ellipse approx. vertex count
      input#wc-sim-ellipse-vertex-count.form-control(type='number' min='3' v-model='wcProps.simulation.ellipseVertexCount' style='max-width: 11ch;')

    //- .d-flex
    //-   .input-group.input-group-sm.mb-2.me-2
    //-       label.input-group-text(for='wc-shape-px') Padding X
    //-       input#wc-shape-px.form-control(type='number' min='0' v-model='shapePx')
    //-       label.input-group-text(for='wc-shape-px') Padding Y
    //-       input#wc-shape-px.form-control(type='number' min='0' v-model='shapePy')
    //-   .d-flex.w-100
    //-     .input-group.input-group-sm.mb-2.flex-nowrap.me-2
    //-       label.input-group-text.w-100(for='wc-show-debug') Show debug
    //-       .input-group-text
    //-         input#wc-show-debug.form-check-input.mt-0(type='checkbox' v-model='showDebugInfo')
    //-     .input-group.input-group-sm.mb-2.flex-nowrap
    //-       label.input-group-text.w-100(for='wc-show-coll-shape') Show collision shape
    //-       .input-group-text
    //-         input#wc-show-coll-shape.form-check-input.mt-0(type='checkbox' v-model='showCollisionShape')
    //- .d-flex
    //-   .input-group.input-group-sm.mb-2.me-2
    //-       label.input-group-text(for='wc-f-charge') Force: charge
    //-       .input-group-text
    //-         input#wc-f-charge.form-check-input.mt-0(type='checkbox' v-model='fChargeEnable')
    //-       label.input-group-text(for='wc-f-charge-str') Strength
    //-       input#wc-f-charge-str.form-control(type='number' v-model='fChargeStrength')
    //-   .d-flex.w-100
    //-     .input-group.input-group-sm.mb-2.flex-nowrap.me-2
    //-       label.input-group-text.w-100(for='wc-show-sep-v') Show SepV
    //-       .input-group-text
    //-         input#wc-show-sep-v.form-check-input.mt-0(type='checkbox' v-model='showSepV')
    //-     .input-group.input-group-sm.mb-2.flex-nowrap
    //-       label.input-group-text.w-100(for='wc-show-sep-p') Show SepP
    //-       .input-group-text
    //-         input#wc-show-sep-p.form-check-input.mt-0(type='checkbox' v-model='showSepP')
    //- .d-flex
    //-   .input-group.input-group-sm.mb-2.flex-nowrap
    //-       label.input-group-text(for='wc-f-x') Force: X
    //-       .input-group-text
    //-         input#wc-f-x.form-check-input.mt-0(type='checkbox' v-model='fXEnable')
    //-       label.input-group-text(for='wc-f-x-str') Strength
    //-       input#wc-f-x-str.form-control(type='number' min='0' v-model='fXStrength')
    //-       label.input-group-text(for='wc-f-y') Force: Y
    //-       .input-group-text
    //-         input#wc-f-y.form-check-input.mt-0(type='checkbox' v-model='fYEnable')
    //-       label.input-group-text(for='wc-f-y-str') Strength
    //-       input#wc-f-y-str.form-control(type='number' min='0' v-model='fYStrength')
    //- .d-flex
    //-   .input-group.input-group-sm.mb-2
    //-       label.input-group-text(for='wc-f-sep-v') Force: Separate V
    //-       .input-group-text
    //-         input#wc-f-sep-v.form-check-input.mt-0(type='checkbox' v-model='fSepVEnable')
    //-       label.input-group-text(for='wc-f-sep-v-str') Strength
    //-       input#wc-f-sep-v-str.form-control(type='number' min='0' v-model='fSepVStrength' style='max-width: 11ch;')
    //-       label.input-group-text(for='wc-f-sep-v-out-only') Outwards only
    //-       .input-group-text
    //-         input#wc-f-sep-v-out-only.form-check-input.mt-0(type='checkbox' v-model='fSepVOutOnly')
    //-       label.input-group-text(for='wc-f-sep-v-alpha') Alpha fn
    //-       select#wc-f-sep-v-alpha.form-select(v-model='fSepVAlpha')
    //-         option(
    //-           v-for='sa in sepAlphas'
    //-           :value='sa'
    //-         ) {{ sepAlphaNames[sa] }}
    //- .d-flex
    //-   .input-group.input-group-sm.mb-2
    //-       label.input-group-text(for='wc-f-sep-p') Force: Separate P
    //-       .input-group-text
    //-         input#wc-f-sep-p.form-check-input.mt-0(type='checkbox' v-model='fSepPEnable')
    //-       label.input-group-text(for='wc-f-sep-p-str') Strength
    //-       input#wc-f-sep-p-str.form-control(type='number' min='0' v-model='fSepPStrength' style='max-width: 11ch;')
    //-       label.input-group-text(for='wc-f-sep-p-out-only') Outwards only
    //-       .input-group-text
    //-         input#wc-f-sep-p-out-only.form-check-input.mt-0(type='checkbox' v-model='fSepPOutOnly')
    //-       label.input-group-text(for='wc-f-sep-p-alpha') Alpha fn
    //-       select#wc-f-sep-p-alpha.form-select(v-model='fSepPAlpha')
    //-         option(
    //-           v-for='sa in sepAlphas'
    //-           :value='sa'
    //-         ) {{ sepAlphaNames[sa] }}
    //- .d-flex
    //-   .input-group.input-group-sm.mb-2
    //-       label.input-group-text(for='wc-f-keep-in-vp') Force: Keep in Viewport
    //-       .input-group-text
    //-         input#wc-keep-in-vp.form-check-input.mt-0(type='checkbox' v-model='fKeepInVpEnable')
    //-       label.input-group-text(for='wc-f-keep-in-vp') Strength
    //-       input#wc-f-keep-in-vp.form-control(type='number' min='0' v-model='fKeepInVpStrength' style='max-width: 11ch;')
    //- .d-flex
    //-   .input-group.input-group-sm.mb-2.flex-nowrap.me-2
    //-       label.input-group-text(for='wc-shape-px') Alpha settings
    //-       label.input-group-text(for='wc-shape-px') Target
    //-       input#wc-shape-px.form-control(type='number' min='0' max='1' step='0.01' v-model='simAlphaTarget')
    //-       label.input-group-text(for='wc-shape-px') Decay
    //-       input#wc-shape-px.form-control(type='number' min='0' max='1' step='0.01' v-model='simAlphaDecay')
    //-       label.input-group-text(for='wc-shape-px') Min
    //-       input#wc-shape-px.form-control(type='number' min='0' max='1' step='0.01' v-model='simAlphaMin ')
    .d-flex
      .input-group.input-group-sm.mb-2
          button.btn.btn-outline-primary(
            @click='onStep'
          ) Step
          input#sim-step-count.form-control(type='number' min='0' v-model='simStepSize')
          label.input-group-text(for='wc-sim-step-count') steps
          label.input-group-text(for='wc-sim-break-point') Break at
          input#wc-sim-break-point.form-control(
            :disabled='!simEnableBreakPoint'
            type='number' min='0' v-model='simBreakPoint'
          )
          .input-group-text
            input#wc-sim-auto-run.form-check-input.mt-0(type='checkbox' v-model='simEnableBreakPoint')
          button.btn.btn-outline-primary(
            @click='wordCloud?.create()'
          ) Reset simulation
          button.btn.btn-outline-primary(
            @click='onPlayPause'
            style='min-width: 7ch;'
          )
            .bi.bi-play(v-show='!simAutoRun || simStopped')
            .bi.bi-pause(v-show='simAutoRun && !simStopped')
          .input-group-text.justify-content-center(style='min-width: 15ch;')
            span {{ simStopped ? 'Stopped' : simAutoRun ? 'Running' : 'Paused' }}
</template>

<script setup lang="ts">
import {nextTick, ref, watch} from 'vue';
import {useI18n} from 'vue-i18n';
import WordCloud from '@/components/WordCloud.vue';
import ModalBase from '@/components/ModalBase.vue';
import useModalBase from '@/composition/ModalBase';
import useWordCloud, {wordCloudCollisionShapes} from '@/composition/WordCloud';

const {t} = useI18n();
const tc = (s: string) => t(`component.modal-perspective-palette.${s}`);

const wcProps = useWordCloud(['aaaa'], {
  debugInfo: {showCollEllipse: true},
  simulation: {alpha: {target: 0.0}},
});

// const collisionShapes = ['rectangle', 'ellipse'] as const;
// const collisionShape: Ref<typeof collisionShapes[number]> = ref(
//   collisionShapes[1],
// );
// const showDebugInfo = ref(true);
// const showSepV = ref(true);
// const showSepP = ref(true);
// const showCollisionShape = ref(true);
// const shapePx = ref(40);
// const shapePy = ref(40);

const fChargeEnable = ref(true);
const fChargeStrength = ref(-100);
const fXEnable = ref(true);
const fXStrength = ref(0.005);
const fYEnable = ref(true);
const fYStrength = ref(0.02);

const sepAlphas = ['bell', 'bump', 'ccc^3', 'direct', 'sigmoid'] as const;
const sepAlphaNames: Record<typeof sepAlphas[number], string> = {
  bell: 'Bell shape',
  bump: 'Shifted bump shape',
  'ccc^3': 'Cumul. coll. counter',
  direct: 'Direct',
  sigmoid: 'Sigmoid',
} as const;
const fSepVEnable = ref(true);
const fSepVOutOnly = ref(true);
const fSepVStrength = ref(6);
const fSepVAlpha = ref(sepAlphas[4]);
const fSepPEnable = ref(true);
const fSepPOutOnly = ref(true);
const fSepPStrength = ref(3);
const fSepPAlpha = ref(sepAlphas[4]);
const fKeepInVpEnable = ref(true);
const fKeepInVpStrength = ref(1);

const simAutoRun = ref(true);
const simStopped = ref(false);
const simStepSize = ref(1);
const simBreakPoint = ref(0);
const simEnableBreakPoint = ref(false);
const simAlphaTarget = ref(0); // d3 default = 0
const simAlphaDecay = ref(0.1); // d3 default = 0.0228
const simAlphaMin = ref(0.001); // d3 default = 0.001

// watch(
//   [
//     showDebugInfo,
//     showCollisionShape,
//     showSepV,
//     showSepP,
//     collisionShape,
//     shapePx,
//     shapePy,
//   ],
//   () => nextTick(() => wordCloud.value?.updateNodes()),
// );
// watch(simAutoRun, (auto) =>
//   auto ? wordCloud.value?.start() : wordCloud.value?.stop(),
// );

const modal = ref<InstanceType<typeof ModalBase>>();
const {modalInterface, bind} = useModalBase(modal, {
  haveBtnOk: false,
  clsDialog: ['modal-lg'],
  clsBody: ['overflow-auto'],
  txtTitle: 'component.modal-perspective-palette.text.title',
  txtBtnCancel: 'component.modal-perspective-palette.btn.close.text',
  ariaBtnClose: 'component.modal-perspective-palette.btn.close.aria-label',
});
const wordCloud = ref<InstanceType<typeof WordCloud>>();

const onPlayPause = () => {
  if (!simAutoRun.value || simStopped.value) {
    // Play click
    simAutoRun.value = true;
    simStopped.value = false;
    wordCloud.value?.start();
  } else {
    // Pause click
    simAutoRun.value = false;
    wordCloud.value?.stop();
  }
};
const onStep = () => {
  simAutoRun.value = false;
  wordCloud.value?.tick(simStepSize.value);
};

defineExpose({
  ...modalInterface,
  show: () => {
    modalInterface.show();
    // if (wordCloud.value) wordCloud.value.resizeLayout();
    if (wordCloud.value) {
      // simAutoRun.value = true;
      // simStopped.value = false;
      wordCloud.value.create();
      // wordCloud.value.start( );
    }
  },
});
</script>
<style lang="scss">
// Change modal sizing a bit with perspective palette:
// - keep 800px width until really close hitting borders
// - extra step until 680px
// - at default 576px breakpoint modal-lg starts scaling with width
@media (min-width: 680px) {
  .modal-perspective-palette .modal-dialog.modal-lg {
    --bs-modal-width: 660px;
  }
}
@media (min-width: 820px) {
  .modal-perspective-palette .modal-dialog.modal-lg {
    --bs-modal-width: 800px;
  }
}
</style>
