export default defineEventHandler((event) => {
  const siteUrl = getSiteUrl()
  const homeUrl = `${siteUrl}/`

  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8')

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    '  <url>',
    `    <loc>${escapeXml(homeUrl)}</loc>`,
    '  </url>',
    '</urlset>',
  ].join('\n')
})

function getSiteUrl(): string {
  const config = useRuntimeConfig()
  const rawSiteUrl = typeof config.public.siteUrl === 'string' && config.public.siteUrl.trim()
    ? config.public.siteUrl.trim()
    : 'http://127.0.0.1:3000'

  return rawSiteUrl.replace(/\/+$/, '')
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll('\'', '&apos;')
}
