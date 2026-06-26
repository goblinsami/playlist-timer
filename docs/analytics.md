# Analytics

MashupTimer uses Google Analytics 4 through `gtag.js` to measure launch interest
and key product actions.

Analytics is disabled by default. Enable it only when a GA4 measurement ID is
configured:

```env
NUXT_PUBLIC_ANALYTICS_ENABLED=true
NUXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

## Page views

The client analytics plugin loads `gtag.js` only in the browser, only when
analytics is enabled and `NUXT_PUBLIC_GA_MEASUREMENT_ID` is present.

Automatic GA page views are disabled with `send_page_view: false`. The plugin
sends the initial `page_view` manually, then sends another `page_view` on Nuxt
route changes with `page_path`.

## Events

Tracked events:

- `landing_cta_timer_mix_click`
- `landing_cta_playlist_timer_click`
- `quick_start_click` with a safe preset name such as `fast_shower`
- `timer_mix_prepare_click` with `source_type`
- `timer_mix_prepare_success` with `source_type`, `song_count`, and `duration_minutes`
- `spotify_connect_click`
- `spotify_sdk_ready`
- `timer_mix_start` with `source_type`, `song_count`, and `duration_minutes`
- `timer_mix_completed`
- `timer_mix_stop`
- `timer_mix_error` with `error_code`
- `playlist_preview_generate`
- `playlist_export_click`
- `playlist_export_success`

## Privacy guardrails

Do not send personal Spotify data to GA4. The implementation does not send track
names, artist names, playlist names, Spotify user IDs, access tokens, preview IDs,
playlist IDs, or selected playlist IDs.

Quick Start analytics uses safe preset identifiers rather than the visible preset
titles, because visible titles may include artist names.
