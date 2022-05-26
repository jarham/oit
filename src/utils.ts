// SPDX-License-Identifier: BSD-2-Clause
// Copyright (c) 2022, Jari Hämäläinen, Carita Kiili and Julie Coiro
export function isHtmlTextareaElement(o: any): o is HTMLTextAreaElement {
  return !!o && typeof o === 'object' && o.tagName === 'TEXTAREA';
}
