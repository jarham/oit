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
      :sep-constant-aspect-ratio='1.35'
      @breakpoint='wcProps.simulation.run = false'
      @simulation-end='onSimulationEnd'
      @simulation-update='onSimulationUpdate'
    )
    //- Simulation controls - only visible when debugControls is set
    section(v-if='debugControls')
      hr
      .d-flex
        .input-group.input-group-sm.mb-2
            button.btn.btn-outline-primary(
              @click='onStep'
            ) Step
            input#sim-step-count.form-control(v-model='simStepSize' type='number' min='0')
            label.input-group-text(for='wc-sim-step-count') steps
            label.input-group-text(for='wc-sim-break-point') Break at
            input#wc-sim-break-point.form-control(
              v-model='simBreakPoint'
              :disabled='!simEnableBreakPoint' type='number' min='0'
            )
            .input-group-text
              input#wc-sim-auto-run.form-check-input.mt-0(v-model='simEnableBreakPoint' type='checkbox')
            button.btn.btn-outline-primary(
              @click='onReset'
            ) Reset simulation
            button.btn.btn-outline-primary(
              style='min-width: 7ch;'
              @click='onPlayPause'
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
        v-bind='fGravity2Props'
        @params-change="onForceParamChange(wcProps.fGravity2, $event)"
        @alpha-settings-change="onForceAlphaSettingsChange(wcProps.fGravity2, $event)"
      )
      ForceControl(
        v-bind='fSepVProps'
        @params-change="onForceParamChange(wcProps.fSepV, $event)"
        @alpha-settings-change="onForceAlphaSettingsChange(wcProps.fSepV, $event)"
      )
      ForceControl(
        v-bind='fSepV2Props'
        @params-change="onForceParamChange(wcProps.fSepV2, $event)"
        @alpha-settings-change="onForceAlphaSettingsChange(wcProps.fSepV2, $event)"
      )
      ForceControl(
        v-bind='fSepPProps'
        @params-change="onForceParamChange(wcProps.fSepP, $event)"
        @alpha-settings-change="onForceAlphaSettingsChange(wcProps.fSepP, $event)"
      )
      ForceControl(
        v-bind='fSepP2Props'
        @params-change="onForceParamChange(wcProps.fSepP2, $event)"
        @alpha-settings-change="onForceAlphaSettingsChange(wcProps.fSepP2, $event)"
      )
      ForceControl(
        v-bind='fKeepInVpProps'
        @params-change="onForceParamChange(wcProps.fKeepInVp, $event)"
        @alpha-settings-change="onForceAlphaSettingsChange(wcProps.fKeepInVp, $event)"
      )
      //- Collision shape settings
      .input-group.input-group-sm.mb-2
        label.input-group-text(for='wc-shape-px') Pad X
        input#wc-shape-px.form-control(v-model='wcProps.shapePadding.x' type='number' min='0')
        label.input-group-text(for='wc-shape-px') Pad Y
        input#wc-shape-px.form-control(v-model='wcProps.shapePadding.y' type='number' min='0')
        label.input-group-text(for='wc-sim-ellipse-vertex-count') Ellipse approx. vertex count
        input#wc-sim-ellipse-vertex-count.form-control(v-model='wcProps.shapePolyVertexCount' type='number' min='3' style='max-width: 11ch;')
      //- Debug settings
      .d-flex.mb-2
        .input-group-title.input-group-title-sm Debug
        .d-flex.flex-column
          .input-group.input-group-sm.input-group-titled
            label.input-group-text.input-group-text-for-cb(for='wc-dbg-hide-all') Hide all
            .input-group-text
              input#wc-dbg-hide-all.form-check-input.mt-0(v-model='wcProps.debugInfo.hideAll' type='checkbox')
            .input-group-text Draw shape:
            label.input-group-text.input-group-text-for-cb(for='wc-dbg-show-rectangle') Rectangle
            .input-group-text
              input#wc-dbg-show-rectangle.form-check-input.mt-0(v-model='wcProps.debugInfo.showCollRectangle' type='checkbox')
            label.input-group-text.input-group-text-for-cb(for='wc-dbg-show-ellipse') Ellipse
            .input-group-text
              input#wc-dbg-show-ellipse.form-check-input.mt-0(v-model='wcProps.debugInfo.showCollEllipse' type='checkbox')
            label.input-group-text.input-group-text-for-cb(for='wc-dbg-show-polygon') Polygon
            .input-group-text
              input#wc-dbg-show-polygon.form-check-input.mt-0(v-model='wcProps.debugInfo.showCollPolygon' type='checkbox')
            input.form-control(type='text' disabled)
</template>

<script setup lang="ts">
import {computed, onBeforeUnmount, onMounted, ref} from 'vue';
import {useI18n} from 'vue-i18n';
import WordCloud from '@/components/WordCloud.vue';
import ModalBase from '@/components/ModalBase.vue';
import ForceControl from '@/components/ForceControl.vue';
import useModalBase from '@/composition/ModalBase';
import useWordCloud from '@/composition/WordCloud';
import type {
  WordCloudBaseForceOpts,
  WordCloudBaseForceParams,
  WordCloudForceAlphaSettings,
} from '@/composition/WordCloud';
import type {SimData} from '@/composition/WordCloud';

const debugControls = false;

const {t} = useI18n();
const tc = (s: string) => t(`component.modal-perspective-palette.${s}`);

const words = tc('text.perspectives')
  .split('\n')
  .map((w) => w.trim())
  .filter((w) => !!w);

const wcProps = useWordCloud(words, {
  debugInfo: {showCollPolygon: debugControls},
  fGravity: {
    params: {
      strength: 1,
      aspectRatio: 1,
    },
    alpha: {
      alphaInit: 0,
    },
  },
  fGravity2: {
    params: {
      strength: -6,
      aspectRatio: 1,
    },
    alpha: {
      decay: 0.2,
      alphaInit: 0.5,
    },
  },
  fSepP: {
    params: {
      strength: 10,
      aspectRatio: 1,
    },
  },
  fSepP2: {
    params: {
      strength: 10,
      aspectRatio: 1,
    },
  },
  fSepV: {
    params: {
      strength: 20,
      aspectRatio: 1,
    },
  },
  fSepV2: {
    params: {
      strength: 30,
      aspectRatio: 1,
      outwardsOnly: true,
    },
    alpha: {
      decay: 0.8,
    },
  },
});

const alphas = ref({
  gravity: 1,
  gravity2: 1,
  sepV: 1,
  sepV2: 1,
  sepP: 1,
  sepP2: 1,
  keepInVp: 1,
});
const fRunning = ref({
  gravity: true,
  gravity2: true,
  sepV: true,
  sepV2: true,
  sepP: true,
  sepP2: true,
  keepInVp: true,
});

const simStopped = ref(false);
const simStepSize = ref(1);
const simBreakPoint = ref(0);
const simEnableBreakPoint = ref(false);

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
  alphas.value.gravity2 = td.alphas['gravity2'] || 0;
  alphas.value.sepV = td.alphas['sepV'] || 0;
  alphas.value.sepV2 = td.alphas['sepV2'] || 0;
  alphas.value.sepP = td.alphas['sepP'] || 0;
  alphas.value.sepP2 = td.alphas['sepP2'] || 0;
  alphas.value.keepInVp = td.alphas['keepInVp'] || 0;

  fRunning.value.gravity =
    alphas.value.gravity >= wcProps.value.fGravity.alpha.min;
  fRunning.value.gravity2 =
    alphas.value.gravity2 >= wcProps.value.fGravity2.alpha.min;
  fRunning.value.sepV = alphas.value.sepV >= wcProps.value.fSepV.alpha.min;
  fRunning.value.sepV2 = alphas.value.sepV2 >= wcProps.value.fSepV2.alpha.min;
  fRunning.value.sepP = alphas.value.sepP >= wcProps.value.fSepP.alpha.min;
  fRunning.value.sepP2 = alphas.value.sepP2 >= wcProps.value.fSepP2.alpha.min;
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
    aspectRatio: wcProps.value.fGravity.params.aspectRatio,
  },
  alphaSettings: {
    decay: wcProps.value.fGravity.alpha.decay,
    min: wcProps.value.fGravity.alpha.min,
    target: wcProps.value.fGravity.alpha.target,
  },
  alpha: alphas.value.gravity,
}));

const fGravity2Props = computed<ForceBaseProps>(() => ({
  name: 'fGrv2',
  params: {
    enabled: wcProps.value.fGravity2.params.enabled,
    strength: wcProps.value.fGravity2.params.strength,
    aspectRatio: wcProps.value.fGravity2.params.aspectRatio,
  },
  alphaSettings: {
    decay: wcProps.value.fGravity2.alpha.decay,
    min: wcProps.value.fGravity2.alpha.min,
    target: wcProps.value.fGravity2.alpha.target,
  },
  alpha: alphas.value.gravity2,
}));

const fSepVProps = computed<ForceBaseProps>(() => ({
  name: 'fSpV',
  params: {
    enabled: wcProps.value.fSepV.params.enabled,
    strength: wcProps.value.fSepV.params.strength,
    aspectRatio: wcProps.value.fSepV.params.aspectRatio,
  },
  alphaSettings: {
    decay: wcProps.value.fSepV.alpha.decay,
    min: wcProps.value.fSepV.alpha.min,
    target: wcProps.value.fSepV.alpha.target,
  },
  alpha: alphas.value.sepV,
}));

const fSepV2Props = computed<ForceBaseProps>(() => ({
  name: 'fSpV2',
  params: {
    enabled: wcProps.value.fSepV2.params.enabled,
    strength: wcProps.value.fSepV2.params.strength,
    aspectRatio: wcProps.value.fSepV2.params.aspectRatio,
  },
  alphaSettings: {
    decay: wcProps.value.fSepV2.alpha.decay,
    min: wcProps.value.fSepV2.alpha.min,
    target: wcProps.value.fSepV2.alpha.target,
  },
  alpha: alphas.value.sepV2,
}));

const fSepPProps = computed<ForceBaseProps>(() => ({
  name: 'fSpP',
  params: {
    enabled: wcProps.value.fSepP.params.enabled,
    strength: wcProps.value.fSepP.params.strength,
    aspectRatio: wcProps.value.fSepP.params.aspectRatio,
  },
  alphaSettings: {
    decay: wcProps.value.fSepP.alpha.decay,
    min: wcProps.value.fSepP.alpha.min,
    target: wcProps.value.fSepP.alpha.target,
  },
  alpha: alphas.value.sepP,
}));

const fSepP2Props = computed<ForceBaseProps>(() => ({
  name: 'fSpP2',
  params: {
    enabled: wcProps.value.fSepP2.params.enabled,
    strength: wcProps.value.fSepP2.params.strength,
    aspectRatio: wcProps.value.fSepP2.params.aspectRatio,
  },
  alphaSettings: {
    decay: wcProps.value.fSepP2.alpha.decay,
    min: wcProps.value.fSepP2.alpha.min,
    target: wcProps.value.fSepP2.alpha.target,
  },
  alpha: alphas.value.sepP2,
}));

const fKeepInVpProps = computed<ForceBaseProps>(() => ({
  name: 'fVp',
  params: {
    enabled: wcProps.value.fKeepInVp.params.enabled,
    strength: wcProps.value.fKeepInVp.params.strength,
    aspectRatio: wcProps.value.fKeepInVp.params.aspectRatio,
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

// Skip 2 frame before animating words. This way
// initial placement can actually be seen.
let wantToStart = false;
let startDelayCounter = 0;
const startDelayOnShow = 2;
const startFn = () => {
  if (!wantToStart) return;
  if (startDelayCounter++ < startDelayOnShow) {
    requestAnimationFrame(startFn);
  } else {
    wantToStart = false;
    wordCloud.value?.start();
  }
};
defineExpose({
  ...modalInterface,
  show: () => {
    const wasRunning = wordCloud.value?.isRunning();
    modalInterface.show();
    wordCloud.value?.stop();
    wordCloud.value?.reset();
    wantToStart = true;
    startDelayCounter = 0;
    if (wasRunning || !debugControls) {
      requestAnimationFrame(startFn);
    }
  },
  updateWords: () => {
    wordCloud.value?.stop();
    wcProps.value.words = tc('text.perspectives')
      .split('\n')
      .map((w) => w.trim())
      .filter((w) => !!w);
    wordCloud.value?.reset();
  },
});

const onHidden = () => {
  if (!debugControls) {
    wantToStart = false;
    startDelayCounter = 0;
    wordCloud.value?.stop();
  }
};

const isDiv = (o: any): o is HTMLDivElement => {
  return !!o && 'tagName' in o && o.tagName === 'DIV';
};
let lastSize: string | undefined;
const checkSize = () => {
  if (!modal.value) return;
  const el = modal.value.$el;
  if (!isDiv(el)) return;
  const currentSize = getComputedStyle(el).getPropertyValue(
    '--oit-perspective-palette-size',
  );
  if (!lastSize) {
    lastSize = currentSize;
    return;
  }
  if (lastSize == currentSize) return;
  wordCloud.value?.reset();
  lastSize = currentSize;
};
onMounted(() => {
  window.addEventListener('resize', checkSize);
  checkSize();
});
onBeforeUnmount(() => {
  window.removeEventListener('resize', checkSize);
  wantToStart = false;
});
</script>
<style lang="scss">
// Change modal sizing a bit with perspective palette:
// - keep 800px width until really close hitting borders
// - extra step until 680px
// - at default 576px breakpoint modal-lg starts scaling with width
.modal-perspective-palette {
  --oit-perspective-palette-size: 'scaling';
}
@media (min-width: 576px) {
  .modal-perspective-palette {
    --oit-perspective-palette-size: 's';
  }
}
@media (min-width: 680px) {
  .modal-perspective-palette {
    --oit-perspective-palette-size: 'm';
    .modal-dialog.modal-lg {
      --bs-modal-width: 660px;
    }
  }
}
@media (min-width: 820px) {
  .modal-perspective-palette {
    --oit-perspective-palette-size: 'l';
    .modal-dialog.modal-lg {
      --bs-modal-width: 800px;
    }
  }
}
.word-nodes {
  font-size: 110%;
}
</style>
