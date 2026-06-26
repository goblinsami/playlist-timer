<script setup lang="ts">
usePageSeo({
  title: 'Spotify Shower Timer - MashupTimer',
  description: 'Use MashupTimer as a Spotify shower timer. Create a 5-minute live mini-mix or a timed playlist for your shower.',
  path: '/spotify-shower-timer',
})
</script>

<template>
  <main class="page-shell content-page">
    <div class="content-layout content-layout--with-sidebar">
      <article class="content-main prose-page">
        <p class="eyebrow">Use case</p>
        <h1>Spotify shower timer</h1>
        <p>
          A shower timer works better when the music tells you where you are in the routine.
          MashupTimer lets you create a 5-minute or 10-minute Spotify music timer without
          depending on one long song.
        </p>
        <p>
          With Live Timer Mix, you choose an artist, your Liked Songs or one of your Spotify
          playlists, then pick the duration and number of songs. The mix plays live in your
          browser and stops when the timer ends.
        </p>
        <p>
          Prefer something saveable? Use Playlist Timer to build a Spotify playlist made of full
          songs that lands close to your target shower length.
        </p>
        <div class="link-actions">
          <NuxtLink class="text-button" to="/timer-mix?source=spotify-search&artist=Chayanne&duration=5&songs=3&fade=4">
            Start a shower Timer Mix
          </NuxtLink>
          <NuxtLink class="text-button text-button--secondary" to="/playlist-timer">
            Create a shower playlist
          </NuxtLink>
        </div>
        <AdSlot position="after-preview" />
        <section class="related-links" aria-labelledby="shower-related-title">
          <h2 id="shower-related-title">Related timers</h2>
          <NuxtLink to="/5-minute-music-timer">5-minute music timer</NuxtLink>
          <NuxtLink to="/quick-starts">Quick Starts</NuxtLink>
          <NuxtLink to="/pasta-timer-playlist">Pasta timer playlist</NuxtLink>
        </section>
        <AdSlot position="bottom" />
      </article>
      <aside class="content-sidebar">
        <AdSlot position="sidebar" />
      </aside>
    </div>
  </main>
</template>
