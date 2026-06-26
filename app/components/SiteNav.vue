<script setup lang="ts">
const { t } = useI18n()
const runtimeConfig = useRuntimeConfig()
const appName = computed(() => String(runtimeConfig.public.appName || 'MashupTimer'))
</script>

<template>
  <header class="site-nav">
    <NuxtLink class="site-brand" to="/">
      {{ appName }}
    </NuxtLink>

    <nav class="site-nav-links" aria-label="Main navigation">
      <NuxtLink to="/timer-mix">
        {{ t('nav.timerMix') }}
      </NuxtLink>
      <NuxtLink to="/playlist-timer">
        {{ t('nav.playlistTimer') }}
      </NuxtLink>
      <NuxtLink to="/quick-starts">
        {{ t('nav.quickStarts') }}
      </NuxtLink>
      <NuxtLink to="/privacy">
        {{ t('nav.privacy') }}
      </NuxtLink>
      <NuxtLink to="/terms">
        {{ t('nav.terms') }}
      </NuxtLink>
      <NuxtLink to="/contact">
        {{ t('nav.contact') }}
      </NuxtLink>
    </nav>
  </header>
</template>
