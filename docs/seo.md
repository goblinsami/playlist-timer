# SEO

MashupTimer is positioned as a way to turn Spotify into a music timer. The primary
message is live Spotify mini-mixes by duration; exportable timed playlists are
the secondary value proposition.

## Current setup

- Public pages define title, description, Open Graph, Twitter metadata, and
  canonical URLs with the shared `usePageSeo` helper.
- Metadata comes from the English, Spanish, and Catalan locale files.
- The public app name comes from `NUXT_PUBLIC_APP_NAME` and defaults to
  `MashupTimer`.
- The canonical URL uses `NUXT_PUBLIC_SITE_URL`.
- The document `html` language follows the active locale.
- `robots.txt` allows crawling and points to `sitemap.xml`.
- `sitemap.xml` includes the landing page, product pages, quick starts, SEO
  content pages, and legal/contact pages.

Live Timer Mix requires Spotify Premium because it uses browser playback through
the Spotify Web Playback SDK. It plays music live in the browser and does not
produce an exported mashup or audio file. Playlist Timer remains available for
exportable Spotify playlists.

## Environment

```env
NUXT_PUBLIC_APP_NAME=MashupTimer
NUXT_PUBLIC_SITE_URL=https://example.com
```

For local development, the default site URL is `http://127.0.0.1:3000`.

## OG image

Metadata points to `/og-image.png` as a placeholder. Replace it with a real
social preview image before production launch.
