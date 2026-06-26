<script setup lang="ts">
usePageSeo({
  title: 'Live Timer Mix - MashupTimer',
  description: 'Choose a duration, pick how many songs you want, and MashupTimer plays a live Spotify mini-mix that stops when your timer ends.',
  path: '/timer-mix',
})
</script>

<template>
  <MashupTimerApp initial-mode="timer-mix" :allow-ads="false" />
</template>
