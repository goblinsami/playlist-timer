export default defineNuxtConfig({
  compatibilityDate: '2025-05-15',
  devtools: { enabled: true },
  modules: ['@nuxtjs/i18n'],
  srcDir: 'app/',
  serverDir: 'server',
  app: {
    head: {
      link: [{ rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }],
      script: [
        {
          async: true,
          src: 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8445882609109686',
          crossorigin: 'anonymous',
        },
      ],
    },
  },
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
    spotifyClientId: '',
    spotifyClientSecret: '',
    spotifyRedirectUri: '',
    spotifyExportPlaylistPublic: 'false',
    public: {
      appName: process.env.NUXT_PUBLIC_APP_NAME || 'MashupTimer',
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://127.0.0.1:3000',
      adsEnabled: process.env.NUXT_PUBLIC_ADS_ENABLED || 'false',
      adsenseClient: process.env.NUXT_PUBLIC_ADSENSE_CLIENT || '',
      adsenseSlotAfterPreview: process.env.NUXT_PUBLIC_ADSENSE_SLOT_AFTER_PREVIEW || '',
      adsenseSlotBottom: process.env.NUXT_PUBLIC_ADSENSE_SLOT_BOTTOM || '',
      adsenseSlotSidebar: process.env.NUXT_PUBLIC_ADSENSE_SLOT_SIDEBAR || '',
    },
  },
  typescript: {
    strict: true,
  },
})
