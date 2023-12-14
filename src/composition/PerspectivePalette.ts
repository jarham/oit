// SPDX-License-Identifier: BSD-2-Clause
// Copyright (c) 2023, Jari Hämäläinen, Carita Kiili and Julie Coiro
import {ref} from 'vue';
import type {Ref} from 'vue';
import type {PartialDeep} from 'type-fest';
import merge from 'lodash.merge';
import {type Vec2} from '@symcode-fi/minkowski-collision';

export interface PerspectivePaletteProps {
  words: Record<string, string[]>;
  locale: string;
  size: 'l' | 'm' | 's' | 'scaling' | 'none';
  shapePadding?: Vec2;
  viewportPadding?: Vec2;
  shapePolyVertexCount: number;
  sepConstantAspectRatio?: number;
  sepAutoViewportAspectRatio?: boolean;
}

export type PerspectivePaletteOpts = PartialDeep<
  Omit<PerspectivePaletteProps, 'words' | 'locale' | 'size'>
>;

export const perspectivePaletteDefaultOpts: Required<
  Omit<PerspectivePaletteProps, 'words' | 'locale' | 'size'>
> = {
  shapePadding: {
    x: 25,
    y: 25,
  },
  viewportPadding: {
    x: 3,
    y: 3,
  },
  shapePolyVertexCount: 12,
  sepConstantAspectRatio: 1.35,
  sepAutoViewportAspectRatio: true,
} as const;

export default function usePerspectivePalette(
  words: Record<string, string[]>,
  locale: string,
  size: 'l' | 'm' | 's' | 'scaling' | 'none',
  opts?: PerspectivePaletteOpts,
): Ref<Required<PerspectivePaletteProps>> {
  const o = merge<
    {},
    Required<Omit<PerspectivePaletteProps, 'words' | 'locale' | 'size'>>,
    PerspectivePaletteOpts | undefined
  >(Object.create(null), perspectivePaletteDefaultOpts, opts);

  return ref({
    words,
    locale,
    size,
    ...o,
  });
}
