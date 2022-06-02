<!-- SPDX-License-Identifier: BSD-2-Clause
     Copyright (c) 2022, Jari Hämäläinen, Carita Kiili and Julie Coiro -->
<template lang="pug">
section.app {{ t('page.title') }}
</template>

<script setup lang="ts">
import {onMounted, ref} from 'vue';
import {useI18n} from 'vue-i18n';

const {t} = useI18n();

onMounted(() => {
  setPageTitle();
});

const setPageTitle = () => {
  document.title = t('page.title');
};
</script>

<style lang="scss">
@use '../node_modules/bootstrap' as bs;
@use '../node_modules/bootstrap-icons' as bsi;
</style>
