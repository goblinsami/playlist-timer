<script setup lang="ts">
const { t } = useI18n()
const runtimeConfig = useRuntimeConfig()
const appName = computed(() => String(runtimeConfig.public.appName || 'MashupTimer'))
</script>

<template>
  <footer class="site-footer">
    <div>
      <strong>{{ appName }}</strong>
      <p>{{ t('footer.tagline') }}</p>
    </div>

    <nav class="site-footer-links" aria-label="Footer navigation">
      <NuxtLink to="/privacy">
        {{ t('nav.privacy') }}
      </NuxtLink>
      <NuxtLink to="/terms">
        {{ t('nav.terms') }}
      </NuxtLink>
      <NuxtLink to="/contact">
        {{ t('nav.contact') }}
      </NuxtLink>
      <NuxtLink to="/quick-starts">
        {{ t('nav.quickStarts') }}
      </NuxtLink>
    </nav>
  </footer>
</template>
