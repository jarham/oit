// SPDX-License-Identifier: BSD-2-Clause
// Copyright (c) 2022, Jari Hämäläinen, Carita Kiili and Julie Coiro
import type {Ref} from 'vue';
import {ref} from 'vue';
import type ModalBase from '@/components/ModalBase.vue';

export interface ModalBaseOpts {
  txtTitle?: string | Ref<string>;
  txtBtnOk?: string | Ref<string>;
  txtBtnCancel?: string | Ref<string>;
  ariaBtnClose?: string | Ref<string>;
  haveBtnClose?: boolean | Ref<boolean>;
  haveBtnOk?: boolean | Ref<boolean>;
  haveBtnCancel?: boolean | Ref<boolean>;
  clsBtnOk?: string[] | Ref<string[]>;
  clsBtnCancel?: string[] | Ref<string[]>;
  clsDialog?: string[] | Ref<string[]>;
  clsBody?: string[] | Ref<string[]>;
  clsFooter?: string[] | Ref<string[]>;
  focusOrder?: ('ok' | 'cancel' | 'close')[];
}

export default function useModalBase(
  modal: Ref<InstanceType<typeof ModalBase> | undefined>,
  opts?: ModalBaseOpts,
) {
  const show = () => modal.value?.show();
  const hide = () => modal.value?.hide();

  return {
    modalInterface: {
      show,
      hide,
    },
    bind: ref(opts) || ref({}),
  };
}
