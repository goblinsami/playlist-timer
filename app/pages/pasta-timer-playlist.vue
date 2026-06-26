<script setup lang="ts">
usePageSeo({
  title: 'Pasta Timer Playlist - MashupTimer',
  description: 'Cook with a Spotify pasta timer. Create a 10-minute live mini-mix or timed playlist while your pasta cooks.',
  path: '/pasta-timer-playlist',
})
</script>

<template>
  <main class="page-shell content-page">
    <div class="content-layout content-layout--with-sidebar">
      <article class="content-main prose-page">
        <p class="eyebrow">Cooking timer</p>
        <h1>Pasta timer playlist</h1>
        <p>
          Pasta timing is easier when the soundtrack has a job. MashupTimer can turn Spotify
          into a 10-minute pasta timer with either a live mini-mix or a saveable timed playlist.
        </p>
        <p>
          Start with the Elvis preset, then change the artist, duration, song count or fade
          length before preparing the mix. Nothing starts automatically, so you stay in control
          of the kitchen and the music.
        </p>
        <div class="link-actions">
          <NuxtLink class="text-button" to="/timer-mix?source=spotify-search&artist=Elvis%20Presley&duration=10&songs=4&fade=5">
            Start a 10-minute pasta mix
          </NuxtLink>
          <NuxtLink class="text-button text-button--secondary" to="/playlist-timer">
            Create a pasta playlist
          </NuxtLink>
        </div>
        <AdSlot position="after-preview" />
        <section class="related-links" aria-labelledby="pasta-related-title">
          <h2 id="pasta-related-title">Related timers</h2>
          <NuxtLink to="/quick-starts">Quick Starts</NuxtLink>
          <NuxtLink to="/5-minute-music-timer">5-minute music timer</NuxtLink>
          <NuxtLink to="/focus-music-timer">Focus music timer</NuxtLink>
        </section>
        <AdSlot position="bottom" />
      </article>
      <aside class="content-sidebar">
        <AdSlot position="sidebar" />
      </aside>
    </div>
  </main>
</template>
