<script setup lang="ts">
type AdPosition = 'top' | 'after-preview' | 'bottom' | 'sidebar'

defineProps<{
  position: AdPosition
  label?: string
}>()
</script>

<template>
  <aside
    class="ad-slot"
    :class="`ad-slot--${position}`"
    aria-label="Advertisement"
  >
    <span>Advertisement</span>
    <small v-if="label">{{ label }}</small>
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
