<script setup lang="ts">
const { locale } = useI18n()

useHead(() => ({
  htmlAttrs: {
    lang: locale.value,
  },
}))
</script>

<template>
  <SiteNav />
  <NuxtPage />
  <SiteFooter />
</template>
