// SPDX-License-Identifier: BSD-2-Clause
// Copyright (c) 2022, Jari Hämäläinen, Carita Kiili and Julie Coiro
import {parseHtmlAsModel} from '@/utils';
import {defineStore} from 'pinia';
import {
  getDefaultModel,
  getDefaultPerspective,
  getDefaultArgument,
  Model,
  Perspective,
  Argument,
  resetIds,
  ArgumentKind,
  IdStore,
} from '../model';

interface StoreState {
  data: Model;
  dirty: boolean;
}

export const useStore = defineStore('main', {
  state: (): StoreState => {
    return {
      data: getDefaultModel(),
      dirty: false,
    };
  },
  actions: {
    newModel() {
      resetIds();
      this.$patch((state) => {
        state.data = getDefaultModel();
        state.dirty = false;
      });
    },
    loadHtmlAsModel(htmlSource: string) {
      try {
        // Start ids from 0 for loaded doc
        const idStore: IdStore = {
          perspectiveId: 0,
          argumentId: 0,
        };
        const data = parseHtmlAsModel(htmlSource, idStore);
        // Reset ids taking parsed data into account
        resetIds(data);
        this.$patch((state) => {
          state.data = {...data};
          state.dirty = false;
        });
      } catch (e) {
        console.error(e);
      }
    },
    addPerspective() {
      this.$patch((state) => {
        state.data.perspectives.push(getDefaultPerspective());
        state.dirty = true;
      });
    },
    removePerspective(p: Perspective) {
      this.$patch((state) => {
        state.data.perspectives.splice(
          state.data.perspectives.findIndex((p2) => p2.id === p.id),
          1,
        );
        state.dirty = true;
      });
    },
    addArgument(target: Perspective, kind: ArgumentKind) {
      this.$patch((state) => {
        const t = state.data.perspectives.find((p) => p.id === target.id);
        if (!t) return;

        const args = kind === 'for' ? t.argumentsFor : t.argumentsAgainst;
        args.push(getDefaultArgument());
        state.dirty = true;
      });
    },
    removeArgument(target: Perspective, kind: ArgumentKind, arg: Argument) {
      this.$patch((state) => {
        const t = state.data.perspectives.find((p) => p.id === target.id);
        if (!t) return;

        const args = kind === 'for' ? t.argumentsFor : t.argumentsAgainst;
        args.splice(
          args.findIndex((r) => r.id === arg.id),
          1,
        );
        state.dirty = true;
      });
    },
    updateClaim(claim: string) {
      this.$patch((state) => {
        state.data.claim = claim;
        state.dirty = true;
      });
    },
    updateConclusion(conclusion: string) {
      this.$patch((state) => {
        state.data.conclusion = conclusion;
        state.dirty = true;
      });
    },
  },
});

export type MainStore = ReturnType<typeof useStore>;
