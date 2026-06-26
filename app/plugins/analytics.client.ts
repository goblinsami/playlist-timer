export default defineNuxtPlugin((nuxtApp) => {
  const runtimeConfig = useRuntimeConfig()
  const measurementId = String(runtimeConfig.public.gaMeasurementId || '')
  const analyticsEnabled = runtimeConfig.public.analyticsEnabled === 'true'

  if (!analyticsEnabled || !measurementId) {
    return
  }

  window.dataLayer = window.dataLayer || []
  window.gtag = window.gtag || ((...args: Parameters<Gtag>) => {
    window.dataLayer?.push(args)
  })

  window.gtag('js', new Date())
  window.gtag('config', measurementId, { send_page_view: false })

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`
  document.head.appendChild(script)

  const trackPageView = (): void => {
    window.gtag?.('event', 'page_view', {
      page_title: document.title,
      page_location: window.location.href,
      page_path: window.location.pathname + window.location.search,
    })
  }

  nuxtApp.hook('app:mounted', () => {
    trackPageView()
  })

  const router = useRouter()

  router.afterEach(() => {
    window.setTimeout(trackPageView, 0)
  })
})
