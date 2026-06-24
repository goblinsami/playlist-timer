# Architecture

Playlist Timer is planned as a Nuxt 3 full-stack application written in
TypeScript. Vue pages and components render the interface, while Nuxt server
routes expose the application API.

## Folder responsibilities

- `app/pages`: route-level user interfaces.
- `app/components`: reusable Vue components.
- `server/api`: Nuxt API route handlers.
- `server/services`: Spotify catalog access, mock cues, and playlist-solving
  orchestration.
- `server/types`: shared server-side TypeScript types.
- `locales`: JSON translation files for English, Spanish, and Catalan UI copy.
- `docs`: product and engineering decisions.

## Planned services

- A Spotify catalog service that uses Client Credentials for preview track
  discovery and metadata.
- A playlist solver that selects tracks for a target duration.
- An export service that creates a playlist for an authorized Spotify user.

Spotify access and solver logic will remain separate so each can be tested and
changed independently.

## Runtime configuration

Spotify credentials are server-only Nuxt runtime config values. Do not put
Spotify secrets in `runtimeConfig.public`.

Use these environment variable names in Netlify and local `.env` files:

- `NUXT_SPOTIFY_CLIENT_ID`
- `NUXT_SPOTIFY_CLIENT_SECRET`
- `NUXT_SPOTIFY_REDIRECT_URI`
- `NUXT_SPOTIFY_EXPORT_PLAYLIST_PUBLIC`
- `NUXT_PUBLIC_SITE_URL`

`NUXT_PUBLIC_SITE_URL` is the only public runtime value from this list.
