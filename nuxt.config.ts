export default defineNuxtConfig({
  compatibilityDate: '2025-05-15',
  devtools: { enabled: true },
  srcDir: 'app/',
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      title: 'Playlist Timer',
      meta: [
        {
          name: 'description',
          content: 'Create Spotify playlists that end exactly when you need them to.',
        },
      ],
    },
  },
  typescript: {
    strict: true,
  },
})
