# AdSense

Google AdSense ownership is verified and the AdSense loader script is configured
once in `nuxt.config.ts`.

Ads are allowed on the landing page, SEO/content pages, Quick Starts, and
Playlist Timer. Ads are not shown on `/timer-mix`, and the shared app component
also hides ad slots whenever Timer Mix is the active mode or playback is active.

## Environment

```env
NUXT_PUBLIC_ADS_ENABLED=false
NUXT_PUBLIC_ADSENSE_CLIENT=ca-pub-8445882609109686
NUXT_PUBLIC_ADSENSE_SLOT_AFTER_PREVIEW=
NUXT_PUBLIC_ADSENSE_SLOT_BOTTOM=
NUXT_PUBLIC_ADSENSE_SLOT_SIDEBAR=
```

Enable ads only after real AdSense slot IDs are configured.

## ads.txt

The public `ads.txt` file lives at:

```text
app/public/ads.txt
```

Nuxt serves this file from `/ads.txt`.
