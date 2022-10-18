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
      @breakpoint='wcProps.simulation.run = false'
      @simulation-end='onSimulationEnd'
      @simulation-update='onSimulationUpdate'
    )
    hr
    //- Simulation controls
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
            @click='onReset'
          ) Reset simulation
          button.btn.btn-outline-primary(
            @click='onPlayPause'
            style='min-width: 7ch;'
          )
            .bi.bi-play(v-show='!wcProps.simulation.run || simStopped')
            .bi.bi-pause(v-show='wcProps.simulation.run && !simStopped')
          .input-group-text.justify-content-center(style='min-width: 15ch;')
            span {{ simStopped ? 'Stopped' : wcProps.simulation.run ? 'Running' : 'Paused' }}
    //- Forces
    .d-flex.mb-2.force
      label.input-group-title.input-group-title-sm(for='wc-f-charge') fChr
      .d-flex.flex-column
        .input-group.input-group-sm.input-group-titled
          .input-group-text
            input#wc-f-charge.form-check-input.mt-0(type='checkbox' v-model='wcProps.fCharge.params.enabled')
          label.input-group-text(for='wc-f-charge-str') Str
          input#wc-f-charge-str.form-control(type='number' v-model='wcProps.fCharge.params.strength')
          label.input-group-text(for='wc-f-charge-a-decay') α-decay
          input#wc-f-charge-a-decay.form-control(type='number' v-model='wcProps.fCharge.alpha.decay' min='0' max='1' step='0.001')
          label.input-group-text(for='wc-f-charge-a-min') α-min
          input#wc-f-charge-a-min.form-control(type='number' v-model='wcProps.fCharge.alpha.min' min='0' max='1' step='0.001')
          label.input-group-text(for='wc-f-charge-a-target') α-target
          input#wc-f-charge-a-target.form-control(type='number' v-model='wcProps.fCharge.alpha.target' min='0' max='1' step='0.001')
          .input-group-text α
          .input-group-text(:class='{"bg-teal-light": fRunning.charge}' style='min-width: 10ch;') {{ toFixed(alphas.charge) }}
    .d-flex.mb-2.force
      label.input-group-title.input-group-title-sm(for='wc-f-x') fX
      .d-flex.flex-column
        .input-group.input-group-sm.input-group-titled
          .input-group-text
            input#wc-f-x.form-check-input.mt-0(type='checkbox' v-model='wcProps.fX.params.enabled')
          label.input-group-text(for='wc-f-x-str') Str
          input#wc-f-x-str.form-control(type='number' v-model='wcProps.fX.params.strength')
          label.input-group-text(for='wc-f-x-a-decay') α-decay
          input#wc-f-x-a-decay.form-control(type='number' v-model='wcProps.fX.alpha.decay' min='0' max='1' step='0.001')
          label.input-group-text(for='wc-f-x-a-min') α-min
          input#wc-f-x-a-min.form-control(type='number' v-model='wcProps.fX.alpha.min' min='0' max='1' step='0.001')
          label.input-group-text(for='wc-f-x-a-target') α-target
          input#wc-f-x-a-target.form-control(type='number' v-model='wcProps.fX.alpha.target' min='0' max='1' step='0.001')
          .input-group-text α
          .input-group-text(:class='{"bg-teal-light": fRunning.x}' style='min-width: 10ch;') {{ toFixed(alphas.x) }}
    .d-flex.mb-2.force
      label.input-group-title.input-group-title-sm(for='wc-f-y') fY
      .d-flex.flex-column
        .input-group.input-group-sm.input-group-titled
          .input-group-text
            input#wc-f-y.form-check-input.mt-0(type='checkbox' v-model='wcProps.fY.params.enabled')
          label.input-group-text(for='wc-f-y-str') Str
          input#wc-f-y-str.form-control(type='number' v-model='wcProps.fY.params.strength')
          label.input-group-text(for='wc-f-y-a-decay') α-decay
          input#wc-f-y-a-decay.form-control(type='number' v-model='wcProps.fY.alpha.decay' min='0' max='1' step='0.001')
          label.input-group-text(for='wc-f-y-a-min') α-min
          input#wc-f-y-a-min.form-control(type='number' v-model='wcProps.fY.alpha.min' min='0' max='1' step='0.001')
          label.input-group-text(for='wc-f-y-a-target') α-target
          input#wc-f-y-a-target.form-control(type='number' v-model='wcProps.fY.alpha.target' min='0' max='1' step='0.001')
          .input-group-text α
          .input-group-text(:class='{"bg-teal-light": fRunning.y}' style='min-width: 10ch;') {{ toFixed(alphas.x) }}
    //- Collision shape settings
    .input-group.input-group-sm.mb-2
      label.input-group-text(for='wc-coll-shape') Collision shape
      select#wc-coll-shape.form-select(v-model='wcProps.collisionShape')
        option(
          v-for='cs in wordCloudCollisionShapes'
          :value='cs'
        ) {{ cs }}
      label.input-group-text(for='wc-shape-px') Pad X
      input#wc-shape-px.form-control(type='number' min='0' v-model='wcProps.px')
      label.input-group-text(for='wc-shape-px') Pad Y
      input#wc-shape-px.form-control(type='number' min='0' v-model='wcProps.py')
      label.input-group-text(for='wc-sim-ellipse-vertex-count') Ellipse approx. vertex count
      input#wc-sim-ellipse-vertex-count.form-control(type='number' min='3' v-model='wcProps.simulation.ellipseVertexCount' style='max-width: 11ch;')
    //- Debug settings
    .d-flex.mb-2
      .input-group-title.input-group-title-sm Debug
      .d-flex.flex-column
        .input-group.input-group-sm.input-group-titled
          label.input-group-text.input-group-text-for-cb(for='wc-dbg-hide-all') Hide all
          .input-group-text
            input#wc-dbg-hide-all.form-check-input.mt-0(type='checkbox' v-model='wcProps.debugInfo.hideAll')
          .input-group-text Show collision shape:
          label.input-group-text.input-group-text-for-cb(for='wc-dbg-show-rectangle') Rectangle
          .input-group-text
            input#wc-dbg-show-rectangle.form-check-input.mt-0(type='checkbox' v-model='wcProps.debugInfo.showCollRectangle')
          label.input-group-text.input-group-text-for-cb(for='wc-dbg-show-ellipse') Ellipse
          .input-group-text
            input#wc-dbg-show-ellipse.form-check-input.mt-0(type='checkbox' v-model='wcProps.debugInfo.showCollEllipse')
          label.input-group-text.input-group-text-for-cb(for='wc-dbg-show-polygon') Polygon
          .input-group-text
            input#wc-dbg-show-polygon.form-check-input.mt-0(type='checkbox' v-model='wcProps.debugInfo.showCollPolygon')
          input.form-control(type='text' disabled)
        .input-group.input-group-sm.input-group-titled
          .input-group-text Show lines:
          label.input-group-text.input-group-text-for-cb(for='wc-dbg-show-line-dist') Distance
          .input-group-text
            input#wc-dbg-show-line-dist.form-check-input.mt-0(type='checkbox' v-model='wcProps.debugInfo.showLineDist')
          input.form-control(type='text' disabled)
</template>

<script setup lang="ts">
import {nextTick, ref, watch} from 'vue';
import {useI18n} from 'vue-i18n';
import WordCloud from '@/components/WordCloud.vue';
import ModalBase from '@/components/ModalBase.vue';
import useModalBase from '@/composition/ModalBase';
import useWordCloud, {wordCloudCollisionShapes} from '@/composition/WordCloud';
import type {SimData} from '@/composition/WordCloud';

const {t} = useI18n();
const tc = (s: string) => t(`component.modal-perspective-palette.${s}`);

const words = tc('text.perspectives')
  .split('\n')
  .map((w) => w.trim())
  .filter((w) => !!w);
// const words = ['aaaa1', 'aaaa2', 'aaaa3'];

const wcProps = useWordCloud(words, {
  collisionShape: 'ellipse',
  debugInfo: {showCollPolygon: true, showLineDist: true},
  simulation: {
    ellipseVertexCount: 16,
    alpha: {
      target: 0.1,
    },
  },
  fCharge: {
    params: {
      strength: -8,
    },
  },
  fX: {
    params: {
      strength: 3,
      x: 0,
    },
  },
  fY: {
    params: {
      strength: 3,
      y: 0,
    },
  },
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

const toFixed = (n: number | string, f = 6) => parseFloat(n as any).toFixed(f);

const alphas = ref({
  charge: 1,
  x: 1,
  y: 1,
  sepV: 1,
  sepP: 1,
  keepInVp: 1,
});
const fRunning = ref({
  charge: true,
  x: true,
  y: true,
  sepV: true,
  sepP: true,
  keepInVp: true,
});

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

const onSimulationEnd = () => {
  wcProps.value.simulation.run = false;
  simStopped.value = true;
};

const onReset = () => {
  wordCloud.value?.create();
};

const onPlayPause = () => {
  if (!wcProps.value.simulation.run || simStopped.value) {
    // Play click
    wcProps.value.simulation.run = true;
    simStopped.value = false;
    wordCloud.value?.start();
  } else {
    // Pause click
    wcProps.value.simulation.run = false;
    wordCloud.value?.stop();
  }
};
const onStep = () => {
  wcProps.value.simulation.run = false;
  wordCloud.value?.tick(simStepSize.value);
};
const onSimulationUpdate = (td: SimData) => {
  alphas.value.charge = td.alphas['charge'] || 0;
  alphas.value.x = td.alphas['x'] || 0;
  alphas.value.y = td.alphas['y'] || 0;
  alphas.value.sepV = td.alphas['sepV'] || 0;
  alphas.value.sepP = td.alphas['sepP'] || 0;
  alphas.value.keepInVp = td.alphas['keepInVp'] || 0;

  fRunning.value.charge =
    alphas.value.charge >= wcProps.value.fCharge.alpha.min;
  fRunning.value.x = alphas.value.x >= wcProps.value.fX.alpha.min;
  fRunning.value.y = alphas.value.y >= wcProps.value.fY.alpha.min;
  fRunning.value.sepV = alphas.value.sepV >= wcProps.value.fSepV.alpha.min;
  fRunning.value.sepP = alphas.value.sepP >= wcProps.value.fSepP.alpha.min;
  fRunning.value.keepInVp =
    alphas.value.keepInVp >= wcProps.value.fKeepInVp.alpha.min;
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
.force .input-group-title {
  min-width: 6ch;
  max-width: 6ch;
}
.force .form-control {
  min-width: 11ch !important;
}
</style>
