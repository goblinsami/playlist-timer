<script setup lang="ts">
type AdPosition = 'top' | 'after-preview' | 'bottom' | 'sidebar'

const { t } = useI18n()
const runtimeConfig = useRuntimeConfig()

const props = defineProps<{
  position: AdPosition
  label?: string
}>()

const adsenseSlot = computed(() => {
  const slots: Record<AdPosition, string> = {
    top: '',
    'after-preview': runtimeConfig.public.adsenseSlotAfterPreview,
    bottom: runtimeConfig.public.adsenseSlotBottom,
    sidebar: runtimeConfig.public.adsenseSlotSidebar,
  }

  return typeof slots[props.position] === 'string' ? slots[props.position] : ''
})
const adsenseClient = computed(() =>
  typeof runtimeConfig.public.adsenseClient === 'string'
    ? runtimeConfig.public.adsenseClient
    : '',
)
const canRenderAds = computed(() =>
  runtimeConfig.public.adsEnabled === 'true'
  && Boolean(adsenseClient.value)
  && Boolean(adsenseSlot.value),
)

onMounted(async () => {
  if (!canRenderAds.value) {
    return
  }

  await nextTick()
  ;(window as Window & { adsbygoogle?: unknown[] }).adsbygoogle?.push({})
})
</script>

<template>
  <aside
    class="ad-slot"
    :class="`ad-slot--${position}`"
    :aria-label="t('ads.label')"
  >
    <ins
      v-if="canRenderAds"
      class="adsbygoogle"
      style="display: block;"
      :data-ad-client="adsenseClient"
      :data-ad-slot="adsenseSlot"
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
    <template v-else>
      <span>{{ t('ads.label') }}</span>
      <small v-if="label">{{ label }}</small>
    </template>
  </aside>
</template>

<style scoped>
.ad-slot {
  display: grid;
  width: 100%;
  min-height: 76px;
  place-content: center;
  gap: 4px;
  padding: 16px;
  border: 1px dashed #d1dad3;
  border-radius: 12px;
  color: #8a958e;
  background: rgb(248 250 248 / 72%);
  text-align: center;
}

.ad-slot span {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}

.ad-slot small {
  font-size: 0.7rem;
}

.ad-slot--sidebar {
  min-height: 280px;
}

@media (max-width: 1099px) {
  .ad-slot--sidebar {
    display: none;
  }
}
</style>
