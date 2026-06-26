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
          key: 'google-tag-manager',
          innerHTML: "(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':\nnew Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],\nj=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=\n'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);\n})(window,document,'script','dataLayer','GTM-NNPTGT28');",
        },
        {
          async: true,
          src: 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8445882609109686',
          crossorigin: 'anonymous',
        },
      ],
      noscript: [
        {
          key: 'google-tag-manager-noscript',
          innerHTML: '<iframe src="https://www.googletagmanager.com/ns.html?id=GTM-NNPTGT28" height="0" width="0" style="display:none;visibility:hidden"></iframe>',
          tagPosition: 'bodyOpen',
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
      analyticsEnabled: process.env.NUXT_PUBLIC_ANALYTICS_ENABLED || 'false',
      gaMeasurementId: process.env.NUXT_PUBLIC_GA_MEASUREMENT_ID || '',
    },
  },
  typescript: {
    strict: true,
  },
})
