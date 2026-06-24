# SEO

Playlist Timer uses a minimal MVP SEO setup. This is not the programmatic SEO
phase yet.

## Current setup

- The homepage defines title, description, Open Graph, and Twitter metadata with
  Nuxt `useSeoMeta`.
- SEO metadata comes from the i18n locale files so English, Spanish, and Catalan
  copy can change with the active locale.
- The canonical URL uses the public runtime config value `siteUrl`.
- The document `html` lang attribute follows the active locale.
- `robots.txt` allows crawling and points to `sitemap.xml`.
- `sitemap.xml` currently lists only the homepage because the i18n routing
  strategy does not generate localized URL prefixes.

## Environment

Set `SITE_URL` to the public deployed origin:

```env
SITE_URL=https://example.com
```

For local development, the default is:

```env
SITE_URL=http://127.0.0.1:3000
```

## OG image

Metadata points to `/og-image.png` as a placeholder. Replace it with a real
social preview image before production launch.

## Future ideas

- Add real localized route strategy if the product needs language-specific URLs.
- Add hreflang and richer sitemap entries when localized URLs exist.
- Add programmatic artist or duration pages only in a future SEO-specific phase.
