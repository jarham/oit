// SPDX-License-Identifier: BSD-2-Clause
// Copyright (c) 2023, Jari Hämäläinen, Carita Kiili and Julie Coiro
import {
  type MsgWordNodePosition,
  WordNodePositioning,
  isMsgWordNodePositionCompute,
} from '@/lib/word-node-positioning';

const wnp = new WordNodePositioning();

onmessage = function (ev: MessageEvent<MsgWordNodePosition>) {
  if (isMsgWordNodePositionCompute(ev)) {
    wnp.positionNodes(ev.data.nodes, ev.data.vpWidth, ev.data.vpHeight);
    postMessage({
      msgName: 'MsgWordNodePositionResult',
      nodes: ev.data.nodes,
    });
  }
};
