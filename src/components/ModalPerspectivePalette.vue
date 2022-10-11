<!-- SPDX-License-Identifier: BSD-2-Clause
     Copyright (c) 2022, Jari Hämäläinen, Carita Kiili and Julie Coiro -->
<template lang="pug">
ModalBase.modal-perspective-palette(
  v-bind='bind'
  ref='modal'
)
  template(v-slot:body)
    WordCloud.mx-3(
      :words='tc("text.perspectives")'
      :collision-shape='collisionShape'
      :show-collision-shape='showDebugInfo && showCollisionShape'
      :show-sep-v='showDebugInfo && showSepV'
      :show-sep-p='showDebugInfo && showSepP'
      :show-sim-info='showDebugInfo'
      :sim-break-point='simEnableBreakPoint ? simBreakPoint : undefined'
      :px='shapePx'
      :py='shapePy'
      :f-charge='fChargeEnable'
      :f-charge-strength='fChargeStrength'
      :f-x='fXEnable'
      :f-x-strength='fXStrength'
      :f-y='fYEnable'
      :f-y-strength='fYStrength'
      :f-sep-v='fSepVEnable'
      :f-sep-v-out-only='fSepVOutOnly'
      :f-sep-v-strength='fSepVStrength'
      :f-sep-v-alpha='fSepVAlpha'
      :f-sep-p='fSepPEnable'
      :f-sep-p-out-only='fSepPOutOnly'
      :f-sep-p-strength='fSepPStrength'
      :f-sep-p-alpha='fSepPAlpha'
      :sim-auto-run='simAutoRun'
      ref='wordCloud'
      @click='wordCloud?.createCloud()'
      @breakpoint='simAutoRun = false'
    )
    hr
    .input-group.input-group-sm.mb-2
      label.input-group-text(for='wc-coll-shape') Collision shape
      select#wc-coll-shape.form-select(v-model='collisionShape')
        option(
          v-for='cs in collisionShapes'
          :value='cs'
        ) {{ cs }}
    .d-flex
      .input-group.input-group-sm.mb-2.flex-nowrap.me-2
          label.input-group-text(for='wc-shape-px') Padding X
          input#wc-shape-px.form-control(type='number' min='0' v-model='shapePx')
          label.input-group-text(for='wc-shape-px') Padding Y
          input#wc-shape-px.form-control(type='number' min='0' v-model='shapePy')
      .d-flex.w-100
        .input-group.input-group-sm.mb-2.flex-nowrap.me-2
          label.input-group-text(for='wc-show-debug') Show debug
          .input-group-text
            input#wc-show-debug.form-check-input.mt-0(type='checkbox' v-model='showDebugInfo')
        .input-group.input-group-sm.mb-2.flex-nowrap
          label.input-group-text(for='wc-show-coll-shape') Show collision shape
          .input-group-text
            input#wc-show-coll-shape.form-check-input.mt-0(type='checkbox' v-model='showCollisionShape')
    .d-flex
      .input-group.input-group-sm.mb-2.flex-nowrap.me-2
          label.input-group-text(for='wc-f-charge') Force: charge
          .input-group-text
            input#wc-f-charge.form-check-input.mt-0(type='checkbox' v-model='fChargeEnable')
          label.input-group-text(for='wc-f-charge-str') Strength
          input#wc-f-charge-str.form-control(type='number' v-model='fChargeStrength')
      .d-flex.w-100
        .input-group.input-group-sm.mb-2.flex-nowrap.me-2
          label.input-group-text(for='wc-show-sep-v') Show SepV
          .input-group-text
            input#wc-show-sep-v.form-check-input.mt-0(type='checkbox' v-model='showSepV')
        .input-group.input-group-sm.mb-2.flex-nowrap
          label.input-group-text(for='wc-show-sep-p') Show SepP
          .input-group-text
            input#wc-show-sep-p.form-check-input.mt-0(type='checkbox' v-model='showSepP')
    .d-flex
      .input-group.input-group-sm.mb-2.flex-nowrap
          label.input-group-text(for='wc-f-x') Force: X
          .input-group-text
            input#wc-f-x.form-check-input.mt-0(type='checkbox' v-model='fXEnable')
          label.input-group-text(for='wc-f-x-str') Strength
          input#wc-f-x-str.form-control(type='number' min='0' v-model='fXStrength')
          label.input-group-text(for='wc-f-y') Force: Y
          .input-group-text
            input#wc-f-y.form-check-input.mt-0(type='checkbox' v-model='fYEnable')
          label.input-group-text(for='wc-f-y-str') Strength
          input#wc-f-y-str.form-control(type='number' min='0' v-model='fYStrength')
    .d-flex
      .input-group.input-group-sm.mb-2.flex-nowrap
          label.input-group-text(for='wc-f-sep-v') Force: Separate V
          .input-group-text
            input#wc-f-sep-v.form-check-input.mt-0(type='checkbox' v-model='fSepVEnable')
          label.input-group-text(for='wc-f-sep-v-str') Strength
          input#wc-f-sep-v-str.form-control(type='number' min='0' v-model='fSepVStrength' style='max-width: 11ch;')
          label.input-group-text(for='wc-f-sep-v-out-only') Outwards only
          .input-group-text
            input#wc-f-sep-v-out-only.form-check-input.mt-0(type='checkbox' v-model='fSepVOutOnly')
          label.input-group-text(for='wc-f-sep-v-alpha') Alpha fn
          select#wc-f-sep-v-alpha.form-select(v-model='fSepVAlpha')
            option(
              v-for='sa in sepAlphas'
              :value='sa'
            ) {{ sepAlphaNames[sa] }}
    .d-flex
      .input-group.input-group-sm.mb-2.flex-nowrap
          label.input-group-text(for='wc-f-sep-p') Force: Separate P
          .input-group-text
            input#wc-f-sep-p.form-check-input.mt-0(type='checkbox' v-model='fSepPEnable')
          label.input-group-text(for='wc-f-sep-p-str') Strength
          input#wc-f-sep-p-str.form-control(type='number' min='0' v-model='fSepPStrength' style='max-width: 11ch;')
          label.input-group-text(for='wc-f-sep-p-out-only') Outwards only
          .input-group-text
            input#wc-f-sep-p-out-only.form-check-input.mt-0(type='checkbox' v-model='fSepPOutOnly')
          label.input-group-text(for='wc-f-sep-p-alpha') Alpha fn
          select#wc-f-sep-p-alpha.form-select(v-model='fSepPAlpha')
            option(
              v-for='sa in sepAlphas'
              :value='sa'
            ) {{ sepAlphaNames[sa] }}
    .d-flex
      .input-group.input-group-sm.mb-2
          label.input-group-text(for='wc-sim-auto-run') Auto run
          .input-group-text
            input#wc-sim-auto-run.form-check-input.mt-0(type='checkbox' v-model='simAutoRun')
          button.btn.btn-outline-primary(
            :disabled='simAutoRun'
            @click='wordCloud?.tick(simStepSize)'
          ) Step
          input#sim-step-count.form-control(type='number' min='0' v-model='simStepSize' style='max-width: 11ch;')
          label.input-group-text(for='wc-sim-step-count') steps
          label.input-group-text(for='wc-sim-break-point') Break at
          input#wc-sim-break-point.form-control(
            :disabled='!simEnableBreakPoint'
            type='number' min='0' v-model='simBreakPoint' style='max-width: 11ch;'
          )
          .input-group-text
            input#wc-sim-auto-run.form-check-input.mt-0(type='checkbox' v-model='simEnableBreakPoint')
          button.btn.btn-outline-primary(
            @click='wordCloud?.createCloud()'
          ) Reset simulation

</template>

<script setup lang="ts">
import {nextTick, ref, watch} from 'vue';
import type {Ref} from 'vue';
import {useI18n} from 'vue-i18n';
import WordCloud from '@/components/WordCloud2.vue';
import ModalBase from '@/components/ModalBase.vue';
import useModalBase from '@/composition/ModalBase';

const {t} = useI18n();
const tc = (s: string) => t(`component.modal-perspective-palette.${s}`);

const collisionShapes = ['rectangle', 'ellipse'] as const;
const collisionShape: Ref<typeof collisionShapes[number]> = ref(
  collisionShapes[1],
);
const showDebugInfo = ref(true);
const showSepV = ref(true);
const showSepP = ref(true);
const showCollisionShape = ref(true);
const shapePx = ref(40);
const shapePy = ref(40);

const fChargeEnable = ref(true);
const fChargeStrength = ref(-50);
const fXEnable = ref(true);
const fXStrength = ref(0.02);
const fYEnable = ref(true);
const fYStrength = ref(0.02);

const sepAlphas = ['bell', 'ccc^3', 'direct'] as const;
const sepAlphaNames: Record<typeof sepAlphas[number], string> = {
  bell: 'Bell shape',
  'ccc^3': 'Cum. coll. counter',
  direct: 'Direct',
} as const;
const fSepVEnable = ref(true);
const fSepVOutOnly = ref(true);
const fSepVStrength = ref(15);
const fSepVAlpha = ref(sepAlphas[1]);
const fSepPEnable = ref(true);
const fSepPOutOnly = ref(true);
const fSepPStrength = ref(10);
const fSepPAlpha = ref(sepAlphas[1]);

const simAutoRun = ref(true);
const simStepSize = ref(1);
const simBreakPoint = ref(0);
const simEnableBreakPoint = ref(false);

watch(
  [
    showDebugInfo,
    showCollisionShape,
    showSepV,
    showSepP,
    collisionShape,
    shapePx,
    shapePy,
  ],
  () => nextTick(() => wordCloud.value?.updateNodes()),
);
watch(simAutoRun, (auto) =>
  auto ? wordCloud.value?.start() : wordCloud.value?.stop(),
);

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
defineExpose({
  ...modalInterface,
  show: () => {
    modalInterface.show();
    // if (wordCloud.value) wordCloud.value.resizeLayout();
    if (wordCloud.value) {
      wordCloud.value.createCloud();
    }
  },
});
</script>
