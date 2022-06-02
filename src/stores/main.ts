// SPDX-License-Identifier: BSD-2-Clause
// Copyright (c) 2022, Jari Hämäläinen, Carita Kiili and Julie Coiro
import {defineStore} from 'pinia';

interface StoreState {}

export const useStore = defineStore('main', {
  state: (): StoreState => {
    return {};
  },
});
