<script setup lang="ts">
const quickStarts = [
  {
    title: 'Fast Shower with Chayanne',
    description: '5 minutes, 3 songs',
    href: '/timer-mix?source=spotify-search&artist=Chayanne&duration=5&songs=3&fade=4',
  },
  {
    title: '10-Minute Pasta with Elvis',
    description: '10 minutes, 4 songs',
    href: '/timer-mix?source=spotify-search&artist=Elvis%20Presley&duration=10&songs=4&fade=5',
  },
  {
    title: 'Coffee Break with Dua Lipa',
    description: '7 minutes, 3 songs',
    href: '/timer-mix?source=spotify-search&artist=Dua%20Lipa&duration=7&songs=3&fade=4',
  },
  {
    title: 'Focus Sprint with Hans Zimmer',
    description: '15 minutes, 5 songs',
    href: '/timer-mix?source=spotify-search&artist=Hans%20Zimmer&duration=15&songs=5&fade=6',
  },
]

usePageSeo({
  title: 'MashupTimer - Turn Spotify into a music timer',
  description: 'Create live Spotify mini-mixes or timed playlists for showers, workouts, breaks, cooking and focus sessions.',
  path: '/',
})
</script>

<template>
  <main class="page-shell content-page">
    <div class="content-layout content-layout--with-sidebar">
      <div class="content-main">
        <section class="landing-hero" aria-labelledby="landing-title">
          <p class="eyebrow">MashupTimer</p>
          <h1 id="landing-title">Turn Spotify into a music timer</h1>
          <p class="subtitle">
            Create live mini-mixes or timed playlists for showers, workouts, breaks, cooking,
            focus sessions and more.
          </p>
          <p class="hero-note">
            Live Timer Mix requires Spotify Premium. Playlist Timer works as a saveable playlist mode.
          </p>
          <div class="link-actions">
            <NuxtLink class="text-button" to="/timer-mix">
              Start a Timer Mix
            </NuxtLink>
            <NuxtLink class="text-button text-button--secondary" to="/playlist-timer">
              Create a timed playlist
            </NuxtLink>
          </div>
        </section>

        <AdSlot position="after-preview" />

        <section class="content-section" aria-labelledby="how-it-works-title">
          <h2 id="how-it-works-title">How MashupTimer works</h2>
          <div class="content-grid">
            <article class="content-card">
              <h3>Choose a duration</h3>
              <p>Pick 5, 10, 15 minutes or any custom timer.</p>
            </article>
            <article class="content-card">
              <h3>Pick your music</h3>
              <p>Use an artist, your Liked Songs or one of your playlists.</p>
            </article>
            <article class="content-card">
              <h3>Start the mix</h3>
              <p>MashupTimer plays a live mini-mix in your browser and stops when the timer ends.</p>
            </article>
          </div>
        </section>

        <section class="content-section" aria-labelledby="modes-title">
          <h2 id="modes-title">Two ways to use MashupTimer</h2>
          <div class="content-grid content-grid--two">
            <article class="content-card">
              <span class="feature-badge">Spotify Premium required</span>
              <h3>Live Timer Mix</h3>
              <p>A live Spotify mini-mix that plays inside your browser. Great for showers, breaks and quick routines.</p>
              <NuxtLink to="/timer-mix">Start a Timer Mix</NuxtLink>
            </article>
            <article class="content-card">
              <h3>Playlist Timer</h3>
              <p>Create an exportable Spotify playlist made of full songs that fits your target duration.</p>
              <NuxtLink to="/playlist-timer">Create a timed playlist</NuxtLink>
            </article>
          </div>
        </section>

        <section class="content-section" aria-labelledby="quick-starts-title">
          <p class="eyebrow">Start with a preset, then adjust anything.</p>
          <h2 id="quick-starts-title">Quick Starts</h2>
          <div class="content-grid content-grid--two">
            <article v-for="quickStart in quickStarts" :key="quickStart.href" class="content-card">
              <h3>{{ quickStart.title }}</h3>
              <p>{{ quickStart.description }}</p>
              <NuxtLink :to="quickStart.href">Use preset</NuxtLink>
            </article>
          </div>
        </section>

        <section class="content-section" aria-labelledby="use-cases-title">
          <h2 id="use-cases-title">Music timers for real moments</h2>
          <ul class="tag-list">
            <li>Showers</li>
            <li>Pasta and cooking</li>
            <li>Coffee breaks</li>
            <li>Focus sprints</li>
            <li>Short workouts</li>
            <li>Walking breaks</li>
          </ul>
        </section>

        <section class="content-section faq-list" aria-labelledby="faq-title">
          <h2 id="faq-title">FAQ</h2>
          <article>
            <h3>Does Timer Mix create a real mashup file?</h3>
            <p>No. Timer Mix plays live in your browser using Spotify. It does not create or export an audio file.</p>
          </article>
          <article>
            <h3>Do I need Spotify Premium?</h3>
            <p>Live Timer Mix requires Spotify Premium because Spotify only allows browser playback for Premium accounts. Playlist Timer can still create timed playlists.</p>
          </article>
          <article>
            <h3>Can I use my Liked Songs?</h3>
            <p>Yes. MashupTimer can use Spotify Search, Liked Songs or your playlists as music sources.</p>
          </article>
        </section>

        <AdSlot position="bottom" />
      </div>

      <aside class="content-sidebar">
        <AdSlot position="sidebar" />
      </aside>
    </div>
  </main>
</template>
