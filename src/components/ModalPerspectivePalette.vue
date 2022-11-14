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
    ForceControl(
      v-bind='fGravProps'
      @params-change="onForceParamChange(wcProps.fGravity, $event)"
      @alpha-settings-change="onForceAlphaSettingsChange(wcProps.fGravity, $event)"
    )
    ForceControl(
      v-bind='fXProps'
      @params-change="onForceParamChange(wcProps.fX, $event)"
      @alpha-settings-change="onForceAlphaSettingsChange(wcProps.fX, $event)"
    )
    ForceControl(
      v-bind='fYProps'
      @params-change="onForceParamChange(wcProps.fY, $event)"
      @alpha-settings-change="onForceAlphaSettingsChange(wcProps.fY, $event)"
    )
    ForceControl(
      v-bind='fSepVProps'
      @params-change="onForceParamChange(wcProps.fSepV, $event)"
      @alpha-settings-change="onForceAlphaSettingsChange(wcProps.fSepV, $event)"
    )
    ForceControl(
      v-bind='fSepPProps'
      @params-change="onForceParamChange(wcProps.fSepP, $event)"
      @alpha-settings-change="onForceAlphaSettingsChange(wcProps.fSepP, $event)"
    )
    ForceControl(
      v-bind='fKeepInVpProps'
      @params-change="onForceParamChange(wcProps.fKeepInVp, $event)"
      @alpha-settings-change="onForceAlphaSettingsChange(wcProps.fKeepInVp, $event)"
    )
    //- Collision shape settings
    .input-group.input-group-sm.mb-2
      label.input-group-text(for='wc-coll-shape') Collision shape
      select#wc-coll-shape.form-select(v-model='wcProps.collisionShape')
        option(
          v-for='cs in wordCloudCollisionShapes'
          :value='cs'
        ) {{ cs }}
      label.input-group-text(for='wc-shape-px') Pad X
      input#wc-shape-px.form-control(type='number' min='0' v-model='wcProps.shapePadding.x')
      label.input-group-text(for='wc-shape-px') Pad Y
      input#wc-shape-px.form-control(type='number' min='0' v-model='wcProps.shapePadding.y')
      label.input-group-text(for='wc-sim-ellipse-vertex-count') Ellipse approx. vertex count
      input#wc-sim-ellipse-vertex-count.form-control(type='number' min='3' v-model='wcProps.shapePolyVertexCount' style='max-width: 11ch;')
    //- Debug settings
    .d-flex.mb-2
      .input-group-title.input-group-title-sm Debug
      .d-flex.flex-column
        .input-group.input-group-sm.input-group-titled
          label.input-group-text.input-group-text-for-cb(for='wc-dbg-hide-all') Hide all
          .input-group-text
            input#wc-dbg-hide-all.form-check-input.mt-0(type='checkbox' v-model='wcProps.debugInfo.hideAll')
          .input-group-text Draw shape:
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
import {computed, nextTick, ref, watch} from 'vue';
import {useI18n} from 'vue-i18n';
import WordCloud from '@/components/WordCloud.vue';
import ModalBase from '@/components/ModalBase.vue';
import ForceControl from '@/components/ForceControl.vue';
import useModalBase from '@/composition/ModalBase';
import useWordCloud, {wordCloudCollisionShapes} from '@/composition/WordCloud';
import type {
  WordCloudBaseForceOpts,
  WordCloudBaseForceParams,
  WordCloudForceAlphaSettings,
} from '@/composition/WordCloud';
import type {SimData} from '@/composition/WordCloud';
import {toFixed} from '@/lib/math-utils';

const {t} = useI18n();
const tc = (s: string) => t(`component.modal-perspective-palette.${s}`);

const words = tc('text.perspectives')
  .split('\n')
  .map((w) => w.trim())
  .filter((w) => !!w);
// const words = ['aaaa1', 'aaaa2', 'aaaa3', 'aaaa4'];

const wcProps = useWordCloud(words, {
  collisionShape: 'polygon',
  debugInfo: {showCollPolygon: true},
  fGravity: {
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
  fSepP: {
    params: {
      strength: 10,
    },
  },
  fSepV: {
    params: {
      strength: 10,
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

const alphas = ref({
  gravity: 1,
  x: 1,
  y: 1,
  sepV: 1,
  sepP: 1,
  keepInVp: 1,
});
const fRunning = ref({
  gravity: true,
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
  wordCloud.value?.reset();
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
  alphas.value.gravity = td.alphas['gravity'] || 0;
  alphas.value.x = td.alphas['x'] || 0;
  alphas.value.y = td.alphas['y'] || 0;
  alphas.value.sepV = td.alphas['sepV'] || 0;
  alphas.value.sepP = td.alphas['sepP'] || 0;
  alphas.value.keepInVp = td.alphas['keepInVp'] || 0;

  fRunning.value.gravity =
    alphas.value.gravity >= wcProps.value.fGravity.alpha.min;
  fRunning.value.x = alphas.value.x >= wcProps.value.fX.alpha.min;
  fRunning.value.y = alphas.value.y >= wcProps.value.fY.alpha.min;
  fRunning.value.sepV = alphas.value.sepV >= wcProps.value.fSepV.alpha.min;
  fRunning.value.sepP = alphas.value.sepP >= wcProps.value.fSepP.alpha.min;
  fRunning.value.keepInVp =
    alphas.value.keepInVp >= wcProps.value.fKeepInVp.alpha.min;
};

interface ForceBaseProps {
  name: string;
  params: WordCloudBaseForceParams;
  alphaSettings: WordCloudForceAlphaSettings;
  alpha: number;
}

const fGravProps = computed<ForceBaseProps>(() => ({
  name: 'fGrv',
  params: {
    enabled: wcProps.value.fGravity.params.enabled,
    strength: wcProps.value.fGravity.params.strength,
  },
  alphaSettings: {
    decay: wcProps.value.fGravity.alpha.decay,
    min: wcProps.value.fGravity.alpha.min,
    target: wcProps.value.fGravity.alpha.target,
  },
  alpha: alphas.value.gravity,
}));

const fXProps = computed<ForceBaseProps>(() => ({
  name: 'fX',
  params: {
    enabled: wcProps.value.fX.params.enabled,
    strength: wcProps.value.fX.params.strength,
  },
  alphaSettings: {
    decay: wcProps.value.fX.alpha.decay,
    min: wcProps.value.fX.alpha.min,
    target: wcProps.value.fX.alpha.target,
  },
  alpha: alphas.value.x,
}));

const fYProps = computed<ForceBaseProps>(() => ({
  name: 'fY',
  params: {
    enabled: wcProps.value.fY.params.enabled,
    strength: wcProps.value.fY.params.strength,
  },
  alphaSettings: {
    decay: wcProps.value.fY.alpha.decay,
    min: wcProps.value.fY.alpha.min,
    target: wcProps.value.fY.alpha.target,
  },
  alpha: alphas.value.y,
}));

const fSepVProps = computed<ForceBaseProps>(() => ({
  name: 'fSepV',
  params: {
    enabled: wcProps.value.fSepV.params.enabled,
    strength: wcProps.value.fSepV.params.strength,
  },
  alphaSettings: {
    decay: wcProps.value.fSepV.alpha.decay,
    min: wcProps.value.fSepV.alpha.min,
    target: wcProps.value.fSepV.alpha.target,
  },
  alpha: alphas.value.sepV,
}));

const fSepPProps = computed<ForceBaseProps>(() => ({
  name: 'fSepP',
  params: {
    enabled: wcProps.value.fSepP.params.enabled,
    strength: wcProps.value.fSepP.params.strength,
  },
  alphaSettings: {
    decay: wcProps.value.fSepP.alpha.decay,
    min: wcProps.value.fSepP.alpha.min,
    target: wcProps.value.fSepP.alpha.target,
  },
  alpha: alphas.value.sepP,
}));

const fKeepInVpProps = computed<ForceBaseProps>(() => ({
  name: 'fVp',
  params: {
    enabled: wcProps.value.fKeepInVp.params.enabled,
    strength: wcProps.value.fKeepInVp.params.strength,
  },
  alphaSettings: {
    decay: wcProps.value.fKeepInVp.alpha.decay,
    min: wcProps.value.fKeepInVp.alpha.min,
    target: wcProps.value.fKeepInVp.alpha.target,
  },
  alpha: alphas.value.keepInVp,
}));

const onForceParamChange = (
  f: WordCloudBaseForceOpts<WordCloudBaseForceParams>,
  p: Partial<WordCloudBaseForceParams>,
) => {
  Object.assign(f.params, p);
};

const onForceAlphaSettingsChange = (
  f: WordCloudBaseForceOpts<WordCloudBaseForceParams>,
  s: Partial<WordCloudForceAlphaSettings>,
) => {
  Object.assign(f.alpha, s);
};

defineExpose({
  ...modalInterface,
  show: () => {
    modalInterface.show();
    // if (wordCloud.value) wordCloud.value.resizeLayout();
    if (wordCloud.value) {
      // simAutoRun.value = true;
      // simStopped.value = false;
      wordCloud.value.reset();
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
