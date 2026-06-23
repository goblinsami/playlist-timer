export default defineNuxtConfig({
  compatibilityDate: '2025-05-15',
  devtools: { enabled: true },
  srcDir: 'app/',
  serverDir: 'server',
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    spotifyClientId: process.env.SPOTIFY_CLIENT_ID,
    spotifyClientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  },
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
