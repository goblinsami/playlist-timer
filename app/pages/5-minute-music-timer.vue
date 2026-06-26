<script setup lang="ts">
usePageSeo({
  title: '5-Minute Music Timer - MashupTimer',
  description: 'Create a 5-minute music timer with Spotify. Pick an artist, your Liked Songs or a playlist and start a live mini-mix.',
  path: '/5-minute-music-timer',
})
</script>

<template>
  <main class="page-shell content-page">
    <div class="content-layout content-layout--with-sidebar">
      <article class="content-main prose-page">
        <p class="eyebrow">Short routines</p>
        <h1>5-minute music timer</h1>
        <p>
          Five minutes is enough for a quick shower, a reset between meetings, a short workout,
          a coffee break or a tiny cleanup sprint. MashupTimer turns that window into a small
          Spotify music timer.
        </p>
        <p>
          A 5-minute Timer Mix works well with 3 songs and short fades. You can start from an
          artist, your Liked Songs or one of your own playlists, then adjust the mix before
          preparing it.
        </p>
        <div class="link-actions">
          <NuxtLink class="text-button" to="/timer-mix?source=spotify-search&artist=Chayanne&duration=5&songs=3&fade=4">
            Create a 5-minute mix
          </NuxtLink>
          <NuxtLink class="text-button text-button--secondary" to="/playlist-timer">
            Create a timed playlist
          </NuxtLink>
        </div>
        <AdSlot position="after-preview" />
        <section class="related-links" aria-labelledby="five-minute-related-title">
          <h2 id="five-minute-related-title">Related timers</h2>
          <NuxtLink to="/spotify-shower-timer">Spotify shower timer</NuxtLink>
          <NuxtLink to="/focus-music-timer">Focus music timer</NuxtLink>
          <NuxtLink to="/quick-starts">Quick Starts</NuxtLink>
        </section>
        <AdSlot position="bottom" />
      </article>
      <aside class="content-sidebar">
        <AdSlot position="sidebar" />
      </aside>
    </div>
  </main>
</template>
