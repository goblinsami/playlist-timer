<script setup lang="ts">
const isDev = import.meta.dev
const status = ref<'idle' | 'clearing' | 'cleared' | 'error'>('idle')

const label = computed(() => {
  if (status.value === 'clearing') {
    return 'Clearing...'
  }

  if (status.value === 'cleared') {
    return 'Cookies cleared'
  }

  if (status.value === 'error') {
    return 'Could not clear'
  }

  return 'Clear cookies'
})

async function clearCookies(): Promise<void> {
  if (!isDev || status.value === 'clearing') {
    return
  }

  status.value = 'clearing'

  try {
    await $fetch('/api/dev/cookies', {
      method: 'DELETE',
    })

    clearClientReadableCookies()
    status.value = 'cleared'
  }
  catch {
    status.value = 'error'
  }
}

function clearClientReadableCookies(): void {
  document.cookie
    .split(';')
    .map(cookie => cookie.trim().split('=')[0])
    .filter(Boolean)
    .forEach((cookieName) => {
      document.cookie = `${cookieName}=; Max-Age=0; path=/`
    })
}
</script>

<template>
  <button
    v-if="isDev"
    class="dev-cookie-button"
    type="button"
    :disabled="status === 'clearing'"
    @click="clearCookies"
  >
    {{ label }}
  </button>
</template>
