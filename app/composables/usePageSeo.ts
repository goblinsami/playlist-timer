interface PageSeoInput {
  title: string
  description: string
  path: string
}

export function usePageSeo(input: PageSeoInput): void {
  const { locale } = useI18n()
  const runtimeConfig = useRuntimeConfig()
  const siteUrl = computed(() => normalizeSiteUrl(runtimeConfig.public.siteUrl))
  const canonicalUrl = computed(() => `${siteUrl.value}${input.path}`)
  const ogImageUrl = computed(() => `${siteUrl.value}/og-image.png`)

  useSeoMeta({
    title: input.title,
    description: input.description,
    ogTitle: input.title,
    ogDescription: input.description,
    ogType: 'website',
    ogImage: () => ogImageUrl.value,
    twitterCard: 'summary_large_image',
    twitterTitle: input.title,
    twitterDescription: input.description,
    twitterImage: () => ogImageUrl.value,
  })

  useHead(() => ({
    htmlAttrs: {
      lang: locale.value,
    },
    link: [
      {
        rel: 'canonical',
        href: canonicalUrl.value,
      },
    ],
  }))
}

function normalizeSiteUrl(value: unknown): string {
  const rawSiteUrl = typeof value === 'string' && value.trim()
    ? value.trim()
    : 'http://127.0.0.1:3000'

  return rawSiteUrl.replace(/\/+$/, '')
}
