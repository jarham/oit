// SPDX-License-Identifier: BSD-2-Clause
// Copyright (c) 2022, Jari Hämäläinen, Carita Kiili and Julie Coiro
import mustache from 'mustache';
import css from './print.css?raw';
import printTemplate from './print.mustache?raw';
import {
  Argument,
  argumentIsEmpty,
  Model,
  Perspective,
  Reliability,
} from '@/model';

// doc versions:
// 1.0.0: Initial
// 1.1.0: added reliabilityOrig to PrintArgument to store Reliability value in
//        data-text attribute of oit-argument-for-reliability and
//        oit-argument-against-reliability elements.
const docVersion = '1.1.0';

export interface PrintTranslations {
  [key: string]: PrintTranslations | string | (() => string);
}

interface PrintArgument extends Omit<Argument, 'reliability'> {
  empty: boolean;
  reliability: Reliability | null | string;
  reliabilityOrig: Reliability | '[not-set]';
  argumentOrig: string;
  sourceOrig: string;
  justificationOrig: string;
}

interface PrintArguments {
  for: PrintArgument;
  against: PrintArgument;
}

interface PrintPerspective
  extends Omit<Perspective, 'argumentsFor' | 'argumentsAgainst'> {
  arguments: PrintArguments[];
  nameOrig: string;
  questionsOrig: string;
  synthesisOrig: string;
}
interface PrintModel extends Omit<Model, 'perspectives'> {
  perspectives: PrintPerspective[];
  claimOrig: string;
  conclusionOrig: string;
  appVersion: string;
  docVersion: string;
}

function argumentToPrintArgument(
  a: Argument | undefined,
  tEmpty: string,
  tRel: (r: string | null) => string,
): PrintArgument {
  if (!a || argumentIsEmpty(a)) {
    return {
      empty: true,
      argument: '\xa0',
      id: '\xa0',
      justification: '\xa0',
      reliability: null,
      reliabilityOrig: '[not-set]',
      source: '\xa0',
      argumentOrig: '',
      justificationOrig: '',
      sourceOrig: '',
    };
  }
  return {
    empty: false,
    argument: a.argument.trim() || tEmpty,
    argumentOrig: a.argument,
    id: a.id.trim() || '\xa0',
    justification: a.justification.trim() || tEmpty,
    justificationOrig: a.justification,
    reliability: tRel(a.reliability),
    reliabilityOrig: a.reliability || '[not-set]',
    source: a.source.trim() || tEmpty,
    sourceOrig: a.source,
  };
}

function perpectiveToPrintPerspective(
  tEmpty: string,
  tRel: (r: string | null) => string,
  p: Perspective,
): PrintPerspective {
  const args: PrintArguments[] = [];
  let paf: PrintArgument;
  let paa: PrintArgument;
  let i = 0;
  do {
    paf = argumentToPrintArgument(p.argumentsFor[i], tEmpty, tRel);
    paa = argumentToPrintArgument(p.argumentsAgainst[i], tEmpty, tRel);
    i++;
    if (!paf.empty || !paa.empty) {
      args.push({
        for: paf,
        against: paa,
      });
    }
  } while (!paf.empty || !paa.empty);

  return {
    id: p.id.trim() || '\xa0',
    name: p.name.trim() || tEmpty,
    nameOrig: p.name,
    questions: p.questions.trim() || tEmpty,
    questionsOrig: p.questions,
    arguments: args,
    synthesis: p.synthesis.trim() || tEmpty,
    synthesisOrig: p.synthesis,
  };
}

function modelToPrintModel(
  data: Model,
  tEmpty: string,
  tRel: (r: string | null) => string,
): PrintModel {
  return {
    claim: data.claim.trim() || tEmpty,
    claimOrig: data.claim,
    perspectives: data.perspectives.map(
      perpectiveToPrintPerspective.bind(null, tEmpty, tRel),
    ),
    conclusion: data.conclusion.trim() || tEmpty,
    conclusionOrig: data.conclusion,
    appVersion: __APP_VERSION__,
    docVersion,
  };
}

interface ConversionTranslation {
  tEmpty: string;
  tRel: (r: string | null) => string;
}

function getConversionTranslations(
  t: PrintTranslations,
): ConversionTranslation {
  let tEmpty = '[EMPTY]';
  let tRel = (r: string | null): string => {
    switch (r) {
      case 'questionable':
      case 'somewhat-reliable':
      case 'reliable':
        return r;
    }
    return '[not-set]';
  };

  const empty = t['empty-text'];
  if (typeof empty === 'string') {
    tEmpty = empty;
  } else if (typeof empty === 'function') {
    tEmpty = empty();
  }

  if (typeof t['reliability'] === 'object' && t['reliability']) {
    const rel = t['reliability'];
    tRel = (r: string | null) => {
      const tr = rel[r || ''];
      switch (r) {
        case 'questionable':
        case 'somewhat-reliable':
        case 'reliable':
          if (typeof tr === 'string') {
            return tr;
          } else if (typeof tr === 'function') {
            return tr();
          } else {
            return r;
          }
      }
      const tn = rel['not-set'];
      if (typeof tn === 'string') {
        return tn;
      } else if (typeof tn === 'function') {
        return tn();
      } else {
        return '[not-set]';
      }
    };
  }

  return {tEmpty, tRel};
}

export default function printToHtml(data: Model, t: PrintTranslations) {
  const {tEmpty, tRel} = getConversionTranslations(t);
  return mustache.render(printTemplate, {
    ...modelToPrintModel(data, tEmpty, tRel),
    css,
    t,
  });
}
