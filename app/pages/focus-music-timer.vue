<script setup lang="ts">
usePageSeo({
  title: 'Focus Music Timer - MashupTimer',
  description: 'Use MashupTimer as a focus music timer. Create live Spotify mini-mixes or timed playlists for short focus sessions.',
  path: '/focus-music-timer',
})
</script>

<template>
  <main class="page-shell content-page">
    <div class="content-layout content-layout--with-sidebar">
      <article class="content-main prose-page">
        <p class="eyebrow">Focus sessions</p>
        <h1>Focus music timer</h1>
        <p>
          Short focus sprints work best when the timer is obvious but not distracting.
          MashupTimer lets you create a live Spotify mini-mix for a 15-minute session, then
          stops when the timer ends.
        </p>
        <p>
          The Hans Zimmer preset is a quick starting point, but you can use Spotify Search,
          Liked Songs or your own playlists. If you want a saveable result instead of live
          playback, Playlist Timer can create a timed Spotify playlist.
        </p>
        <div class="link-actions">
          <NuxtLink class="text-button" to="/timer-mix?source=spotify-search&artist=Hans%20Zimmer&duration=15&songs=5&fade=6">
            Start a focus Timer Mix
          </NuxtLink>
          <NuxtLink class="text-button text-button--secondary" to="/playlist-timer">
            Create a focus playlist
          </NuxtLink>
        </div>
        <AdSlot position="after-preview" />
        <section class="related-links" aria-labelledby="focus-related-title">
          <h2 id="focus-related-title">Related timers</h2>
          <NuxtLink to="/quick-starts">Quick Starts</NuxtLink>
          <NuxtLink to="/5-minute-music-timer">5-minute music timer</NuxtLink>
          <NuxtLink to="/spotify-shower-timer">Spotify shower timer</NuxtLink>
        </section>
        <AdSlot position="bottom" />
      </article>
      <aside class="content-sidebar">
        <AdSlot position="sidebar" />
      </aside>
    </div>
  </main>
</template>
