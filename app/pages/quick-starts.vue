<script setup lang="ts">
const presets = [
  {
    title: 'Fast Shower with Chayanne',
    description: 'A short 5-minute mix for getting in, getting clean and moving on.',
    duration: '5 min',
    songs: '3 songs',
    href: '/timer-mix?source=spotify-search&artist=Chayanne&duration=5&songs=3&fade=4',
    analyticsName: 'fast_shower',
  },
  {
    title: '10-Minute Pasta with Elvis',
    description: 'A quick Elvis mini-mix while pasta cooks.',
    duration: '10 min',
    songs: '4 songs',
    href: '/timer-mix?source=spotify-search&artist=Elvis%20Presley&duration=10&songs=4&fade=5',
    analyticsName: 'ten_minute_pasta',
  },
  {
    title: 'Coffee Break with Dua Lipa',
    description: 'A compact pop reset before getting back to work.',
    duration: '7 min',
    songs: '3 songs',
    href: '/timer-mix?source=spotify-search&artist=Dua%20Lipa&duration=7&songs=3&fade=4',
    analyticsName: 'coffee_break',
  },
  {
    title: 'Focus Sprint with Hans Zimmer',
    description: 'A cinematic 15-minute focus session.',
    duration: '15 min',
    songs: '5 songs',
    href: '/timer-mix?source=spotify-search&artist=Hans%20Zimmer&duration=15&songs=5&fade=6',
    analyticsName: 'focus_sprint',
  },
]

function trackQuickStartClick(presetName: string): void {
  trackEvent('quick_start_click', { preset_name: presetName })
}

usePageSeo({
  title: 'Quick Starts - MashupTimer',
  description: 'Start with a MashupTimer preset for showers, pasta, coffee breaks or focus sessions, then adjust anything.',
  path: '/quick-starts',
})
</script>

<template>
  <main class="page-shell content-page">
    <div class="content-layout content-layout--with-sidebar">
      <div class="content-main">
        <section class="content-hero" aria-labelledby="quick-starts-page-title">
          <p class="eyebrow">Presets</p>
          <h1 id="quick-starts-page-title">Quick Starts</h1>
          <p class="subtitle">Start with a preset, then adjust anything.</p>
        </section>

        <div class="content-grid content-grid--two">
          <article v-for="preset in presets" :key="preset.href" class="content-card">
            <h2>{{ preset.title }}</h2>
            <p>{{ preset.description }}</p>
            <dl class="inline-stats">
              <div>
                <dt>Duration</dt>
                <dd>{{ preset.duration }}</dd>
              </div>
              <div>
                <dt>Songs</dt>
                <dd>{{ preset.songs }}</dd>
              </div>
            </dl>
            <NuxtLink :to="preset.href" @click="trackQuickStartClick(preset.analyticsName)">Use preset</NuxtLink>
          </article>
        </div>

        <AdSlot position="bottom" />
      </div>

      <aside class="content-sidebar">
        <AdSlot position="sidebar" />
      </aside>
    </div>
  </main>
</template>
