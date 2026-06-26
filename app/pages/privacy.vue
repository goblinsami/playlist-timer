<script setup lang="ts">
usePageSeo({
  title: 'Privacy Policy - MashupTimer',
  description: 'Privacy Policy for MashupTimer, including Spotify login, Spotify permissions and Google AdSense on non-playback pages.',
  path: '/privacy',
})
</script>

<template>
  <main class="page-shell content-page">
    <article class="content-main prose-page">
      <p class="eyebrow">Legal</p>
      <h1>Privacy Policy</h1>
      <p>
        MashupTimer uses Spotify login to access selected Spotify functionality only when you
        choose features that need it. Depending on the mode, we may request permissions to
        create playlists, read playlists, read liked songs and control playback.
      </p>
      <p>
        We do not store Spotify passwords. Spotify handles authentication directly. You can
        disconnect MashupTimer from your Spotify account in your Spotify account settings.
      </p>
      <p>
        We do not sell personal data. MashupTimer may use Google AdSense on non-playback pages,
        and Google may use cookies or similar technologies to serve and measure ads.
      </p>
      <p>
        Timer Mix plays live in your browser and does not create or export audio files.
      </p>
      <p>
        Questions about privacy can be sent to <a href="mailto:goblinwebsites@gmail.com">goblinwebsites@gmail.com</a>.
      </p>
      <section class="related-links" aria-labelledby="privacy-links-title">
        <h2 id="privacy-links-title">More information</h2>
        <NuxtLink to="/terms">Terms</NuxtLink>
        <NuxtLink to="/contact">Contact</NuxtLink>
        <NuxtLink to="/timer-mix">Live Timer Mix</NuxtLink>
      </section>
    </article>
  </main>
</template>
