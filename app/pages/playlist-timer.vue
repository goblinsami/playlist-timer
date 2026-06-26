<script setup lang="ts">
usePageSeo({
  title: 'Playlist Timer - MashupTimer',
  description: 'Create a Spotify playlist made of full songs that adds up as closely as possible to your target duration.',
  path: '/playlist-timer',
})
</script>

<template>
  <MashupTimerApp initial-mode="playlist-timer" />
</template>
