export default defineNuxtConfig({
  compatibilityDate: '2025-05-15',
  devtools: { enabled: true },
  modules: ['@nuxtjs/i18n'],
  srcDir: 'app/',
  serverDir: 'server',
  css: ['~/assets/css/main.css'],
  i18n: {
    defaultLocale: 'en',
    strategy: 'no_prefix',
    detectBrowserLanguage: false,
    langDir: '../locales',
    locales: [
      {
        code: 'en',
        name: 'English',
        file: 'en.json',
      },
      {
        code: 'es',
        name: 'Español',
        file: 'es.json',
      },
      {
        code: 'ca',
        name: 'Català',
        file: 'ca.json',
      },
    ],
  },
  runtimeConfig: {
    spotifyClientId: process.env.SPOTIFY_CLIENT_ID,
    spotifyClientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    spotifyRedirectUri: process.env.SPOTIFY_REDIRECT_URI,
    spotifyExportPlaylistPublic: process.env.SPOTIFY_EXPORT_PLAYLIST_PUBLIC,
  },
  typescript: {
    strict: true,
  },
})
