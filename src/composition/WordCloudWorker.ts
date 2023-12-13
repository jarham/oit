// SPDX-License-Identifier: BSD-2-Clause
// Copyright (c) 2023, Jari Hämäläinen, Carita Kiili and Julie Coiro
import {
  type MsgNodePosition,
  NodePositioning,
  isMsgNodePositionCompute,
} from './WordCloud';

const np = new NodePositioning();

onmessage = function (ev: MessageEvent<MsgNodePosition>) {
  if (isMsgNodePositionCompute(ev)) {
    np.positionNodes(ev.data.nodes, ev.data.vpWidth, ev.data.vpHeight);
    postMessage({
      msgName: 'MsgNodePositionResult',
      nodes: ev.data.nodes,
    })
  }
};
