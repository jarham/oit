<!-- SPDX-License-Identifier: BSD-2-Clause
     Copyright (c) 2022, Jari Hämäläinen, Carita Kiili and Julie Coiro -->
<template lang="pug">
// This component should be (and is) used only to display html
// content included in distibution (no user content) so v-html is fine.
// eslint-disable-next-line vue/no-v-html
.markdown-element(v-html='mdSource')
</template>

<script setup lang="ts">
import {computed} from 'vue';
import MarkdownIt from 'markdown-it';

interface Props {
  markdown: string;
}
const props = defineProps<Props>();

const md = new MarkdownIt();
const mdSource = computed(() => md.render(props.markdown));
</script>
