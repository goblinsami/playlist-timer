<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()
const runtimeConfig = useRuntimeConfig()
const appName = computed(() => String(runtimeConfig.public.appName || 'MashupTimer'))
const isMobileNavVisible = ref(false)
const isMobileMenuOpen = ref(false)
const mobileNavThreshold = 64
let mobileNavFrameId: number | null = null

function closeMobileMenu(): void {
  isMobileMenuOpen.value = false
}

function toggleMobileMenu(): void {
  isMobileMenuOpen.value = !isMobileMenuOpen.value
}

function syncMobileNavVisibility(): void {
  const shouldShowNav = window.scrollY > mobileNavThreshold

  if (isMobileNavVisible.value !== shouldShowNav) {
    isMobileNavVisible.value = shouldShowNav
  }

  if (!shouldShowNav) {
    closeMobileMenu()
  }
}

function scheduleMobileNavUpdate(): void {
  if (mobileNavFrameId !== null) {
    return
  }

  mobileNavFrameId = window.requestAnimationFrame(() => {
    mobileNavFrameId = null
    syncMobileNavVisibility()
  })
}

watch(() => route.fullPath, () => {
  closeMobileMenu()
})

onMounted(() => {
  syncMobileNavVisibility()
  window.addEventListener('scroll', scheduleMobileNavUpdate, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', scheduleMobileNavUpdate)

  if (mobileNavFrameId !== null) {
    window.cancelAnimationFrame(mobileNavFrameId)
  }
})
</script>

<template>
  <header
    class="site-nav"
    :class="{
      'site-nav--visible': isMobileNavVisible,
      'site-nav--menu-open': isMobileMenuOpen,
    }"
  >
    <NuxtLink class="site-brand" to="/" @click="closeMobileMenu">
      {{ appName }}
    </NuxtLink>

    <button
      class="site-nav-menu-button"
      type="button"
      :aria-expanded="isMobileMenuOpen"
      :aria-label="isMobileMenuOpen ? t('nav.closeMenu') : t('nav.openMenu')"
      @click="toggleMobileMenu"
    >
      <span aria-hidden="true" />
      <span aria-hidden="true" />
      <span aria-hidden="true" />
    </button>

    <nav class="site-nav-links" aria-label="Main navigation">
      <NuxtLink to="/timer-mix" @click="closeMobileMenu">
        {{ t('nav.timerMix') }}
      </NuxtLink>
      <NuxtLink to="/playlist-timer" @click="closeMobileMenu">
        {{ t('nav.playlistTimer') }}
      </NuxtLink>
      <NuxtLink to="/quick-starts" @click="closeMobileMenu">
        {{ t('nav.quickStarts') }}
      </NuxtLink>
      <NuxtLink to="/privacy" @click="closeMobileMenu">
        {{ t('nav.privacy') }}
      </NuxtLink>
      <NuxtLink to="/terms" @click="closeMobileMenu">
        {{ t('nav.terms') }}
      </NuxtLink>
      <NuxtLink to="/contact" @click="closeMobileMenu">
        {{ t('nav.contact') }}
      </NuxtLink>
      <DevCookieButton />
    </nav>
  </header>
</template>
