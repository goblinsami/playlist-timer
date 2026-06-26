<script setup lang="ts">
usePageSeo({
  title: 'Terms - MashupTimer',
  description: 'Terms for using MashupTimer, including Spotify Premium requirements and experimental Timer Mix behavior.',
  path: '/terms',
})
</script>

<template>
  <main class="page-shell content-page">
    <article class="content-main prose-page">
      <p class="eyebrow">Legal</p>
      <h1>Terms</h1>
      <p>
        MashupTimer is provided as-is. The service helps you create live Spotify mini-mixes and
        timed Spotify playlists, but availability may change or fail depending on Spotify,
        browser support and network conditions.
      </p>
      <p>
        MashupTimer is not affiliated with Spotify. Spotify is a trademark of Spotify AB.
      </p>
      <p>
        Timer Mix requires Spotify Premium because Spotify browser playback requires a Premium
        account. Timer Mix is experimental and depends on Spotify availability.
      </p>
      <p>
        MashupTimer does not create or export audio files. Users are responsible for complying
        with Spotify terms and any other terms that apply to their account or usage.
      </p>
      <section class="related-links" aria-labelledby="terms-links-title">
        <h2 id="terms-links-title">Related pages</h2>
        <NuxtLink to="/privacy">Privacy Policy</NuxtLink>
        <NuxtLink to="/contact">Contact</NuxtLink>
        <NuxtLink to="/playlist-timer">Playlist Timer</NuxtLink>
      </section>
    </article>
  </main>
</template>
