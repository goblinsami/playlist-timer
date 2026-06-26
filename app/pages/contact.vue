<script setup lang="ts">
const contactEmail = 'goblinwebsites@gmail.com'

usePageSeo({
  title: 'Contact - MashupTimer',
  description: 'Contact MashupTimer with questions, feedback or issues.',
  path: '/contact',
})
</script>

<template>
  <main class="page-shell content-page">
    <article class="content-main prose-page">
      <p class="eyebrow">Support</p>
      <h1>Contact</h1>
      <p>Questions, feedback or issues with MashupTimer?</p>
      <p>
        Email <a :href="`mailto:${contactEmail}`">{{ contactEmail }}</a>.
      </p>
      <section class="related-links" aria-labelledby="contact-links-title">
        <h2 id="contact-links-title">Helpful links</h2>
        <NuxtLink to="/timer-mix">Live Timer Mix</NuxtLink>
        <NuxtLink to="/playlist-timer">Playlist Timer</NuxtLink>
        <NuxtLink to="/privacy">Privacy Policy</NuxtLink>
      </section>
    </article>
  </main>
</template>
