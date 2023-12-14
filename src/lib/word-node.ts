// SPDX-License-Identifier: BSD-2-Clause
// Copyright (c) 2023, Jari Hämäläinen, Carita Kiili and Julie Coiro
import {type Vec2} from '@symcode-fi/minkowski-collision';

// Word node data. Velocities and absolute position changes originated
// from D3 which was first tried in node positions and dropped later.
// D3's "force idea" remained for simulation that tries to separate
// nodes from each other and still keep all nodes inside given viewport.
export interface WordNode {
  id: string;
  index: number;
  word: string;
  // Center coordinates
  pos: Vec2;
  // Half width and height; and ellipse radii (note: ellipse is approximated)
  h: Vec2;
  // Velocities created by forces
  vl: Record<string, Vec2>;
  // Total velocity
  vlt: Vec2;
  // Absolute position changes created by "forces"
  p: Record<string, Vec2>;
  // Total absolute position change
  pt: Vec2;
  // Ellipse approximation vertices
  v: Vec2[];
}
