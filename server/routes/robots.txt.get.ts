export default defineEventHandler((event) => {
  const siteUrl = getSiteUrl()

  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')

  return [
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${siteUrl}/sitemap.xml`,
  ].join('\n')
})

function getSiteUrl(): string {
  const config = useRuntimeConfig()
  const rawSiteUrl = typeof config.public.siteUrl === 'string' && config.public.siteUrl.trim()
    ? config.public.siteUrl.trim()
    : 'http://127.0.0.1:3000'

  return rawSiteUrl.replace(/\/+$/, '')
}
