// SPDX-License-Identifier: BSD-2-Clause
// Copyright (c) 2022, Jari Hämäläinen, Carita Kiili and Julie Coiro
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
    addPerspective() {
      this.$patch((state) => {
        state.data.perspectives.push(getDefaultPerspective());
        state.dirty = false;
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
    updateNotes(notes: string) {
      this.$patch((state) => {
        state.data.notes = notes;
        state.dirty = true;
      });
    },
  },
});

export type MainStore = ReturnType<typeof useStore>;
