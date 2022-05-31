// SPDX-License-Identifier: BSD-2-Clause
// Copyright (c) 2022, Jari Hämäläinen, Carita Kiili and Julie Coiro
export const reliabilityValues = [
  'questionable',
  'somewhat-reliable',
  'reliable',
] as const;
export type Reliability = typeof reliabilityValues[number];

export interface Argument {
  argument: string;
  source: string;
  reliability: Reliability | null;
  justification: string;
  id: string;
}

export type ArgumentKind = 'for' | 'against';

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

let perspectiveId = 0;
let argumentId = 0;

export function getDefaultArgument(): Argument {
  return {
    argument: '',
    source: '',
    reliability: null,
    justification: '',
    id: `arg-${argumentId++}`,
  };
}

export function getDefaultPerspective(): Perspective {
  return {
    name: '',
    questions: '',
    argumentsFor: [getDefaultArgument()],
    argumentsAgainst: [getDefaultArgument()],
    synthesis: '',
    id: `prs-${perspectiveId++}`,
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
  perspectiveId = 0;
  argumentId = 0;
  if (!data) return;
  data.perspectives.forEach((p) => {
    try {
      const n = getIdNumber(p.id);
      if (n > perspectiveId) perspectiveId = n;
    } catch (_) {
      // Ignore
    }
    p.argumentsFor.forEach((r) => {
      try {
        const n = getIdNumber(r.id);
        if (n > argumentId) argumentId = n;
      } catch (_) {
        // Ignore
      }
    });
    p.argumentsAgainst.forEach((r) => {
      try {
        const n = getIdNumber(r.id);
        if (n > argumentId) argumentId = n;
      } catch (_) {
        // Ignore
      }
    });
  });
}
