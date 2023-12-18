// SPDX-License-Identifier: BSD-2-Clause
// Copyright (c) 2022, Jari Hämäläinen, Carita Kiili and Julie Coiro
export const reliabilityValues = [
  'questionable',
  'somewhat-reliable',
  'reliable',
] as const;
export type Reliability = (typeof reliabilityValues)[number];

export interface Argument {
  argument: string;
  source: string;
  reliability: Reliability | null;
  justification: string;
  id: string;
}

export type ArgumentKind = 'for' | 'against';

export function isArgumentKind(o: any): o is ArgumentKind {
  return o === 'for' || o === 'against';
}

export interface Perspective {
  name: string;
  questions: string;
  argumentsFor: Argument[];
  argumentsAgainst: Argument[];
  synthesis: string;
  id: string;
}

export interface Model {
  claim: string;
  perspectives: Perspective[];
  conclusion: string;
}

export interface IdStore {
  perspectiveId: number;
  argumentId: number;
}

const idStore: IdStore = {
  perspectiveId: 0,
  argumentId: 0,
};

export function getDefaultArgument(store?: IdStore): Argument {
  const is = store || idStore;
  return {
    argument: '',
    source: '',
    reliability: null,
    justification: '',
    id: `arg-${is.argumentId++}`,
  };
}

export function getDefaultPerspective(
  store?: IdStore,
  empty?: boolean,
): Perspective {
  const is = store || idStore;
  return {
    name: '',
    questions: '',
    argumentsFor: empty ? [] : [getDefaultArgument(store)],
    argumentsAgainst: empty ? [] : [getDefaultArgument(store)],
    synthesis: '',
    id: `prs-${is.perspectiveId++}`,
  };
}

export function getDefaultModel(): Model {
  return {
    claim: '',
    perspectives: [getDefaultPerspective()],
    conclusion: '',
  };
}

function getIdNumber(id: string): number {
  if (typeof id !== 'string') throw new Error(`Invalid id type: ${typeof id}`);
  const n = parseInt(id.split('-')[1]);
  if (!Number.isInteger(n) || n < 0) throw new Error(`Invalid id number: ${n}`);
  return n;
}

export function resetIds(data?: Model) {
  idStore.perspectiveId = 0;
  idStore.argumentId = 0;
  if (!data) return;

  // idStore has the next available id so take that into account
  // when checking existing ids (use `>=` and `+ 1`)
  data.perspectives.forEach((p) => {
    try {
      const n = getIdNumber(p.id);
      if (n >= idStore.perspectiveId) idStore.perspectiveId = n + 1;
    } catch (_) {
      // Ignore
    }
    p.argumentsFor.forEach((r) => {
      try {
        const n = getIdNumber(r.id);
        if (n >= idStore.argumentId) idStore.argumentId = n + 1;
      } catch (_) {
        // Ignore
      }
    });
    p.argumentsAgainst.forEach((r) => {
      try {
        const n = getIdNumber(r.id);
        if (n >= idStore.argumentId) idStore.argumentId = n + 1;
      } catch (_) {
        // Ignore
      }
    });
  });
}

export function argumentIsEmpty(a: Argument) {
  return (
    !a.argument.trim() &&
    !a.justification.trim() &&
    !a.reliability &&
    !a.source.trim()
  );
}

export function stringToReliability(t: string): Reliability | null {
  if (t === 'questionable') return t;
  else if (t === 'somewhat-reliable') return t;
  else if (t === 'reliable') return t;
  return null;
}
