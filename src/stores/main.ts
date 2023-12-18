// SPDX-License-Identifier: BSD-2-Clause
// Copyright (c) 2022, Jari Hämäläinen, Carita Kiili and Julie Coiro
import {filenameToChartname, parseHtmlAsModel} from '@/utils';
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

export interface MoveArgumentOpts {
  fromPrsId: string;
  fromArgKind: ArgumentKind;
  fromIndex: number;
  toPrsId: string;
  toArgKind: ArgumentKind;
  toIndex: number;
}

interface StoreState {
  data: Model;
  dirty: boolean;
  // null = use default filename from translations
  filename: string | null;
  saveTemplateKeys: string[];
}

export const useStore = defineStore('main', {
  state: (): StoreState => {
    return {
      data: getDefaultModel(),
      dirty: false,
      filename: null,
      saveTemplateKeys: [],
    };
  },
  actions: {
    newModel(filename: string | null = null) {
      resetIds();
      this.$patch((state) => {
        state.data = getDefaultModel();
        state.dirty = false;
        state.filename = filename;
      });
    },
    loadHtmlAsModel(htmlSource: string, filename: string) {
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
          // Ensure that all perspectives' arguments lists have at least
          // one default (empty) argument. Perspectives w/o any arguments
          // are saved with empty argument table so parsed data may have
          // empty arrays.
          data.perspectives.forEach((p) => {
            [p.argumentsFor, p.argumentsAgainst].forEach((args) => {
              if (args.length === 0) args.push(getDefaultArgument());
            });
          });
          state.data = {...data};
          state.dirty = false;
          state.filename = filenameToChartname(filename);
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
    movePerspective(fromIndex: number, toIndex: number) {
      this.$patch((state) => {
        const prs = state.data.perspectives.splice(fromIndex, 1)[0];
        state.data.perspectives.splice(toIndex, 0, prs);

        // Set new id for moved perspective so that html gets reactively updated.
        const tmp = getDefaultPerspective();
        prs.id = tmp.id;

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
    moveArgument(opts: MoveArgumentOpts) {
      this.$patch((state) => {
        const from = getArgumentList(
          state.data,
          opts.fromPrsId,
          opts.fromArgKind,
        );
        const to = getArgumentList(state.data, opts.toPrsId, opts.toArgKind);
        if (!from || !to) return;

        const arg = from.splice(opts.fromIndex, 1)[0];
        to.splice(opts.toIndex, 0, arg);

        // Set new id for moved argument so that html gets reactively updated
        // (we remove dragged element after drag finishes because otherwise
        // dragging from one list to another would cause duplicates).
        const tmp = getDefaultArgument();
        arg.id = tmp.id;

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

function getArgumentList(
  model: Model,
  prsId: string,
  argKind: ArgumentKind,
): Argument[] | undefined {
  const prs = model.perspectives.find((p) => p.id === prsId);
  if (!prs) return undefined;
  return argKind === 'for' ? prs.argumentsFor : prs.argumentsAgainst;
}
