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

interface PrintArgument extends Omit<Argument, 'reliability'> {
  empty: boolean;
  reliability: Reliability | null | '[not-set]';
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
}

function argumentToPrintArgument(a?: Argument): PrintArgument {
  if (!a || argumentIsEmpty(a)) {
    return {
      empty: true,
      argument: '\xa0',
      id: '\xa0',
      justification: '\xa0',
      reliability: null,
      source: '\xa0',
      argumentOrig: '',
      justificationOrig: '',
      sourceOrig: '',
    };
  }
  return {
    empty: false,
    argument: a.argument.trim() || '[EMPTY]',
    argumentOrig: a.argument,
    id: a.id.trim() || '\xa0',
    justification: a.justification.trim() || '[EMPTY]',
    justificationOrig: a.justification,
    reliability: a.reliability || '[not-set]',
    source: a.source.trim() || '[EMPTY]',
    sourceOrig: a.source,
  };
}

function perpectiveToPrintPerspective(p: Perspective): PrintPerspective {
  const args: PrintArguments[] = [];
  let paf: PrintArgument;
  let paa: PrintArgument;
  let i = 0;
  do {
    paf = argumentToPrintArgument(p.argumentsFor[i]);
    paa = argumentToPrintArgument(p.argumentsAgainst[i]);
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
    name: p.name.trim() || '[EMPTY]',
    nameOrig: p.name,
    questions: p.questions.trim() || '[EMPTY]',
    questionsOrig: p.questions,
    arguments: args,
    synthesis: p.synthesis.trim() || '[EMPTY]',
    synthesisOrig: p.synthesis,
  };
}

function modelToPrintModel(data: Model): PrintModel {
  return {
    claim: data.claim.trim() || '[EMPTY]',
    claimOrig: data.claim,
    perspectives: data.perspectives.map(perpectiveToPrintPerspective),
    conclusion: data.conclusion.trim() || '[EMPTY]',
    conclusionOrig: data.conclusion,
  };
}

export default function printToHtml(data: Model) {
  return mustache.render(printTemplate, {...modelToPrintModel(data), css});
}
